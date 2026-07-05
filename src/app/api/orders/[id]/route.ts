import { NextResponse } from "next/server";
import { UA_TRANSACTION_STATUS } from "@particle-network/universal-account-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { getOrderStore } from "@/db";
import { getUaTransaction } from "@/lib/ua-server";
import { toOrderView } from "@/lib/order-view";
import { merchantAddress, quoteSignerKey } from "@/lib/config";
import { solverDepositAddress } from "@/lib/solver";

export const maxDuration = 30;

/**
 * Order status for the receipt stepper. Polling this route also advances
 * settlement state: expired locks are released, and once the buyer's UA
 * transfer reaches source finality the order is marked reconciled.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = getOrderStore();
  let order = await store.get(id);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Auto-release on lock expiry (paper §4 refund-on-expiry).
  if (order.status === "quoted" && Date.now() > order.expiresAt.getTime()) {
    order = (await store.update(id, { status: "expired" })) ?? order;
  }

  // Reconciliation: poll the UA leg while the deposit is in flight.
  if (
    (order.status === "merchant_paid" || order.status === "confirmed") &&
    order.uaTransactionId
  ) {
    try {
      const { status, raw } = await getUaTransaction(
        order.buyerEoa as `0x${string}`,
        order.uaTransactionId,
      );
      if (status === UA_TRANSACTION_STATUS.FINISHED) {
        const tx = raw as { targetChainTxHash?: string; txHash?: string } | null;
        order =
          (await store.update(id, {
            status: order.status === "merchant_paid" ? "reconciled" : order.status,
            reconciledAt: new Date(),
            depositTxHash: tx?.targetChainTxHash ?? tx?.txHash ?? null,
          })) ?? order;
      } else if (
        status === UA_TRANSACTION_STATUS.EXECUTION_FAILED ||
        status === UA_TRANSACTION_STATUS.REFUND_FINISHED
      ) {
        order = (await store.update(id, { status: "refund_pending" })) ?? order;
      }
    } catch (err) {
      // Non-fatal: reconciliation just retries on the next poll.
      console.warn("ua status poll failed:", err);
    }
  }

  // Public verification context: lets the receipt page (or any judge)
  // recompute and verify the EIP-712 LockedQuote signature in the browser.
  let verify: {
    merchant: string;
    solverDeposit: string;
    quoteSigner: string;
  } | null = null;
  try {
    verify = {
      merchant: merchantAddress(),
      solverDeposit: solverDepositAddress(),
      quoteSigner: privateKeyToAccount(quoteSignerKey()).address,
    };
  } catch {
    // env not configured — receipt renders without the verify panel
  }

  return NextResponse.json({ order: toOrderView(order), verify });
}
