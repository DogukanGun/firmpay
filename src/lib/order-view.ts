import type { OrderRow } from "@/db/schema";

/** Client-safe projection of an order row (no raw UA transaction payload). */
export interface OrderView {
  id: string;
  status: string;
  productId: string;
  productName: string;
  notionalUsd: string;
  quotedUsd: string;
  boundUsd: string;
  feeEstimateUsd: string | null;
  spreadBps: number;
  bufferBps: number;
  ttlSeconds: number;
  expiresAt: string;
  quoteHash: string;
  quoteSignature: string;
  buyerEoa: string;
  rootHash: string | null;
  uaTransactionId: string | null;
  payoutTxHash: string | null;
  depositTxHash: string | null;
  finalCostUsd: string | null;
  deltaBps: string | null;
  solverSubsidyUsd: string | null;
  createdAt: string;
  reconciledAt: string | null;
}

export function toOrderView(o: OrderRow): OrderView {
  return {
    id: o.id,
    status: o.status,
    productId: o.productId,
    productName: o.productName,
    notionalUsd: o.notionalUsd,
    quotedUsd: o.quotedUsd,
    boundUsd: o.boundUsd,
    feeEstimateUsd: o.feeEstimateUsd,
    spreadBps: o.spreadBps,
    bufferBps: o.bufferBps,
    ttlSeconds: o.ttlSeconds,
    expiresAt: o.expiresAt.toISOString(),
    quoteHash: o.quoteHash,
    quoteSignature: o.quoteSignature,
    buyerEoa: o.buyerEoa,
    rootHash: o.rootHash,
    uaTransactionId: o.uaTransactionId,
    payoutTxHash: o.payoutTxHash,
    depositTxHash: o.depositTxHash,
    finalCostUsd: o.finalCostUsd,
    deltaBps: o.deltaBps,
    solverSubsidyUsd: o.solverSubsidyUsd,
    createdAt: o.createdAt.toISOString(),
    reconciledAt: o.reconciledAt?.toISOString() ?? null,
  };
}
