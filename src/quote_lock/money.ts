/** Micro-USD (6dp bigint) money math. Strings at boundaries, bigints inside. */

export const MICRO = 1_000_000n;

/** "5.02" → 5020000n. Truncates beyond 6dp. */
export function toMicro(usd: string | number): bigint {
  const s = typeof usd === "number" ? usd.toFixed(6) : usd;
  const neg = s.startsWith("-");
  const [intPart, fracPart = ""] = (neg ? s.slice(1) : s).split(".");
  const frac = (fracPart + "000000").slice(0, 6);
  const v = BigInt(intPart || "0") * MICRO + BigInt(frac);
  return neg ? -v : v;
}

/** 5020000n → "5.02" (trailing zeros trimmed, min 2dp). */
export function fromMicro(v: bigint): string {
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const intPart = abs / MICRO;
  const frac = (abs % MICRO).toString().padStart(6, "0");
  const trimmed = frac.replace(/0+$/, "");
  const dp = trimmed.length <= 2 ? frac.slice(0, 2) : trimmed;
  return `${neg ? "-" : ""}${intPart}.${dp}`;
}

/** Apply basis points: amount × bps / 10_000, rounded up (conservative for bounds). */
export function addBpsCeil(amount: bigint, bps: number): bigint {
  const num = amount * BigInt(10_000 + bps);
  return (num + 9_999n) / 10_000n;
}

/** Signed delta in bps of `final` vs `quoted`, relative to notional (paper Eq. 1). */
export function deltaBps(finalUsd: bigint, quotedUsd: bigint, notionalUsd: bigint): number {
  if (notionalUsd === 0n) return 0;
  // δ = 1e4 · (p − q) / V ; ×100 extra precision then back to float
  const scaled = ((finalUsd - quotedUsd) * 1_000_000n) / notionalUsd;
  return Number(scaled) / 100;
}
