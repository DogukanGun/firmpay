import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getOrderStore } from "@/db";
import { getProduct } from "@/lib/products";
import { merchantAddress, quoteSignerKey } from "@/lib/config";
import { createSettlementTransfer } from "@/lib/ua-server";
import { hasInventoryFor, solverDepositAddress } from "@/lib/solver";
import { toMicro, fromMicro } from "@/quote_lock/money";
import { pricingFromEnv, transferAmountMicro, boundMicro, expiryFromNow } from "@/quote_lock/pricing";
import { signLockedQuote } from "@/quote_lock/eip712";
import { toOrderView } from "@/lib/order-view";

export const maxDuration = 60;

/**
 * getLockedQuote (paper §4): builds the real Universal Account transfer,
 * reads its all-in cost, and returns an EIP-712-signed LockedQuote with a
 * hard TTL. The signature is the guarantee.
 */
export async function POST(req: Request) {
  let stage = "init";
  try {
    const body = await req.json();
    const product = getProduct(body?.productId);
    const buyerEoa = body?.buyerEoa as `0x${string}` | undefined;
    if (!product || !buyerEoa || !/^0x[0-9a-fA-F]{40}$/.test(buyerEoa)) {
      return NextResponse.json({ error: "invalid productId or buyerEoa" }, { status: 400 });
    }

    const cfg = pricingFromEnv();
    const notional = toMicro(product.priceUsd);

    stage = "inventory";
    if (!(await hasInventoryFor(notional))) {
      return NextResponse.json(
        { error: "temporarily unavailable", reason: "inventory_backpressure" },
        { status: 503 },
      );
    }

    stage = "ua_transfer";
    const transferMicro = transferAmountMicro(notional, cfg);
    const deposit = solverDepositAddress();
    const ua = await createSettlementTransfer(buyerEoa, deposit, fromMicro(transferMicro));

    stage = "sign";
    const quoted = ua.totalDebitMicro;
    const bound = boundMicro(quoted, cfg);
    const orderId = `ord_${randomUUID().slice(0, 13)}`;
    const message = {
      orderId,
      merchant: merchantAddress(),
      notionalUsd: notional,
      quotedUsd: quoted,
      boundUsd: bound,
      rootHash: ua.rootHash,
      solverDeposit: deposit,
      expiry: expiryFromNow(cfg),
    };
    const { quoteHash, signature } = await signLockedQuote(message, quoteSignerKey());

    stage = "persist";
    const row = await getOrderStore().insert({
      id: orderId,
      status: "quoted",
      productId: product.id,
      productName: product.name,
      notionalUsd: fromMicro(notional),
      quotedUsd: fromMicro(quoted),
      boundUsd: fromMicro(bound),
      feeEstimateUsd: fromMicro(ua.feeMicro),
      spreadBps: cfg.spreadBps,
      bufferBps: cfg.bufferBps,
      ttlSeconds: cfg.ttlSeconds,
      expiresAt: new Date(Number(message.expiry) * 1000),
      quoteHash,
      quoteSignature: signature,
      buyerEoa,
      rootHash: ua.rootHash,
      uaTransaction: ua.transaction,
    });

    return NextResponse.json({ order: toOrderView(row) });
  } catch (err) {
    console.error(`quote failed at ${stage}:`, err);
    const message = err instanceof Error ? err.message : "quote failed";
    if (/insufficient balance/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Your balance doesn't cover this purchase yet. Top up any asset on any supported chain — it all counts as one balance.",
          reason: "insufficient_balance",
        },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: message, stage }, { status: 500 });
  }
}
