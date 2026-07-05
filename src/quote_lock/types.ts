/**
 * Core types for the quote-locked checkout, mirroring the paper's
 * LockedQuote LQ = (q, q̄, τ, h) — quoted price, signed bound, lock TTL,
 * and the EIP-712 typed-data hash.
 *
 * All USD money values are integer micro-dollars (6dp) as bigint internally
 * and decimal strings at API boundaries.
 */

export interface QuoteRequest {
  orderId: string;
  productId: string;
  buyerEoa: `0x${string}`;
}

/** The EIP-712 message the quote signer commits to. */
export interface LockedQuoteMessage {
  orderId: string;
  merchant: `0x${string}`;
  /** merchant notional V, micro-USD */
  notionalUsd: bigint;
  /** quoted all-in buyer debit q, micro-USD */
  quotedUsd: bigint;
  /** signed upper bound q̄ = q·(1+b), micro-USD — the buyer can never be charged more */
  boundUsd: bigint;
  /** merkle root of the Universal Account cross-chain user-ops the buyer signs */
  rootHash: `0x${string}`;
  /** solver inventory address the UA transfer settles to (Arbitrum One) */
  solverDeposit: `0x${string}`;
  /** unix seconds — end of the lock window t0 + τ */
  expiry: bigint;
}

export interface LockedQuote {
  message: LockedQuoteMessage;
  /** EIP-712 typed-data hash h = H(LQ) */
  quoteHash: `0x${string}`;
  /** quote-engine signature over h — the guarantee */
  signature: `0x${string}`;
  ttlSeconds: number;
  spreadBps: number;
  bufferBps: number;
}

export type OrderStatus =
  | "quoted"
  | "confirmed"
  | "merchant_paid"
  | "reconciled"
  | "expired"
  | "refund_pending"
  | "failed";
