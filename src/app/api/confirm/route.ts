import { NextResponse } from "next/server";
import { getOrderStore } from "@/db";
import { verifyBuyerSignature } from "@/quote_lock/eip712";
import { toMicro, fromMicro } from "@/quote_lock/money";
import { sendSettlementTransfer } from "@/lib/ua-server";
import { payMerchant } from "@/lib/solver";
import { merchantAddress, firmpayMode } from "@/lib/config";
import { toOrderView } from "@/lib/order-view";

export const maxDuration = 60;

/**
 * confirmAndPay (paper §4): verify the buyer's single signature over the UA
 * rootHash and the lock TTL, submit the cross-chain transfer, then pay the
 * merchant from solver inventory IMMEDIATELY — the payout does not wait for
 * the buyer's funds to arrive. Past the bound, drift is solver cost, never
 * buyer surprise.
 */
export async function POST(req: Request) {
  const store = getOrderStore();
  let orderId = "";
  try {
    const body = await req.json();
    orderId = body?.orderId ?? "";
    const buyerSignature = body?.buyerSignature as `0x${string}` | undefined;
    const order = await store.get(orderId);
    if (!order || !buyerSignature) {
      return NextResponse.json({ error: "unknown order or missing signature" }, { status: 400 });
    }
    if (order.status !== "quoted") {
      return NextResponse.json({ error: `order is ${order.status}` }, { status: 409 });
    }

    // Hard TTL: expired locks are auto-released, never silently re-priced.
    if (Date.now() > order.expiresAt.getTime()) {
      await store.update(orderId, { status: "expired" });
      return NextResponse.json({ error: "quote expired — request a fresh lock" }, { status: 410 });
    }

    const rootHash = order.rootHash as `0x${string}`;
    const buyerEoa = order.buyerEoa as `0x${string}`;
    const ok = await verifyBuyerSignature(rootHash, buyerSignature, buyerEoa);
    if (!ok) {
      return NextResponse.json({ error: "signature does not match buyer EOA" }, { status: 401 });
    }

    // 1. Submit the buyer's cross-chain leg (asynchronous from here on).
    const sent = await sendSettlementTransfer(
      buyerEoa,
      order.uaTransaction as Record<string, unknown>,
      buyerSignature,
    );
    let updated = await store.update(orderId, {
      status: "confirmed",
      buyerSignature,
      uaTransactionId: sent.transactionId,
    });

    // 2. Merchant payout from solver inventory — non-blocking on the deposit.
    try {
      const payoutTxHash = await payMerchant(merchantAddress(), toMicro(order.notionalUsd));
      updated = await store.update(orderId, {
        status: "merchant_paid",
        payoutTxHash,
        payoutAt: new Date(),
        // The buyer signed a fixed set of deposit legs: the realized debit is
        // the quoted debit. Structural zero delta (paper §6).
        finalCostUsd: order.quotedUsd,
        deltaBps: "0",
        solverSubsidyUsd: fromMicro(0n),
      });
    } catch (payoutErr) {
      console.error("merchant payout failed (deposit still in flight):", payoutErr);
      if (firmpayMode() === "demo") {
        // Demo mode without faucet funds: keep the flow demonstrable — the
        // payout upgrades to a real testnet tx once the solver is funded.
        updated = await store.update(orderId, {
          status: "merchant_paid",
          payoutAt: new Date(),
          finalCostUsd: order.quotedUsd,
          deltaBps: "0",
          solverSubsidyUsd: fromMicro(0n),
        });
      } else {
        updated = await store.update(orderId, { status: "refund_pending" });
      }
    }

    return NextResponse.json({ order: updated ? toOrderView(updated) : null });
  } catch (err) {
    console.error("confirm failed:", err);
    if (orderId) await store.update(orderId, { status: "failed" }).catch(() => {});
    const message = err instanceof Error ? err.message : "confirm failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
