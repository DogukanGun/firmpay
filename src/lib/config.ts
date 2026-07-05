import type { Hex } from "viem";

/** Server-side config. Throws only when a value is actually needed. */

export function particleConfig() {
  const projectId = process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID;
  const projectClientKey = process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY;
  const projectAppUuid = process.env.NEXT_PUBLIC_PARTICLE_APP_ID;
  if (!projectId || !projectClientKey || !projectAppUuid) {
    throw new Error(
      "Particle credentials missing: set NEXT_PUBLIC_PARTICLE_PROJECT_ID / _CLIENT_KEY / _APP_ID (dashboard.particle.network)",
    );
  }
  return { projectId, projectClientKey, projectAppUuid };
}

export function quoteSignerKey(): Hex {
  const k = process.env.QUOTE_SIGNER_PRIVATE_KEY;
  if (!k) throw new Error("QUOTE_SIGNER_PRIVATE_KEY missing");
  return normalizeKey(k);
}

export function solverKey(): Hex {
  const k = process.env.SOLVER_PRIVATE_KEY;
  if (!k) throw new Error("SOLVER_PRIVATE_KEY missing");
  return normalizeKey(k);
}

export function merchantAddress(): `0x${string}` {
  const a = process.env.MERCHANT_ADDRESS;
  if (!a) throw new Error("MERCHANT_ADDRESS missing");
  return a as `0x${string}`;
}

export function arbitrumRpcUrl(): string {
  return process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc";
}

export function inventoryMinUsdc(): number {
  const n = parseFloat(process.env.INVENTORY_MIN_USDC || "5");
  return Number.isFinite(n) ? n : 5;
}

function normalizeKey(k: string): Hex {
  return (k.startsWith("0x") ? k : `0x${k}`) as Hex;
}
