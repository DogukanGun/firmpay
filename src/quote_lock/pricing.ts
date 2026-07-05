import { addBpsCeil } from "./money";

export interface PricingConfig {
  /** solver spread Σ captured on top of the merchant notional (bps) */
  spreadBps: number;
  /** hedge buffer b forming the signed bound q̄ = q·(1+b) (bps) */
  bufferBps: number;
  /** lock TTL τ in seconds */
  ttlSeconds: number;
}

export const DEFAULT_PRICING: PricingConfig = {
  spreadBps: 25,
  bufferBps: 25,
  ttlSeconds: 30,
};

/**
 * The transfer amount the buyer's Universal Account delivers to the solver:
 * merchant notional V plus the solver spread. The UA's own routing fees are
 * charged on top by the UA at creation time and are part of the all-in
 * quoted debit, not of this amount.
 */
export function transferAmountMicro(notionalUsd: bigint, cfg: PricingConfig): bigint {
  return addBpsCeil(notionalUsd, cfg.spreadBps);
}

/** Signed upper bound q̄ over the all-in quoted debit q. */
export function boundMicro(quotedUsd: bigint, cfg: PricingConfig): bigint {
  return addBpsCeil(quotedUsd, cfg.bufferBps);
}

export function expiryFromNow(cfg: PricingConfig, nowSeconds?: number): bigint {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  return BigInt(now + cfg.ttlSeconds);
}

export function pricingFromEnv(env: NodeJS.ProcessEnv = process.env): PricingConfig {
  return {
    spreadBps: intOr(env.QUOTE_SPREAD_BPS, DEFAULT_PRICING.spreadBps),
    bufferBps: intOr(env.HEDGE_BUFFER_BPS, DEFAULT_PRICING.bufferBps),
    ttlSeconds: intOr(env.QUOTE_TTL_SECONDS, DEFAULT_PRICING.ttlSeconds),
  };
}

function intOr(v: string | undefined, fallback: number): number {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
