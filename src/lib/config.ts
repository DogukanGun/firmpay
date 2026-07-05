import type { Hex } from "viem";

/** Server-side config. Throws only when a value is actually needed. */

/**
 * demo: the Universal Account leg is SIMULATED (UA V2 is mainnet-only), the
 * buyer signature + EIP-712 lock stay real, and the solver payout runs on the
 * configured chain (use CHAIN_ENV=testnet for Arbitrum Sepolia).
 * live: everything real on mainnet — required for the hackathon submission.
 */
export type FirmpayMode = "live" | "demo";

export function firmpayMode(): FirmpayMode {
  return process.env.NEXT_PUBLIC_FIRMPAY_MODE === "demo" ? "demo" : "live";
}

export function chainEnv(): "mainnet" | "testnet" {
  return process.env.NEXT_PUBLIC_CHAIN_ENV === "testnet" ? "testnet" : "mainnet";
}

/** Native USDC on the settlement chain (Arbitrum One / Arbitrum Sepolia). */
export function usdcAddress(): `0x${string}` {
  return chainEnv() === "testnet"
    ? "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
    : "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
}

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
  if (process.env.ARBITRUM_RPC_URL) return process.env.ARBITRUM_RPC_URL;
  return chainEnv() === "testnet"
    ? "https://sepolia-rollup.arbitrum.io/rpc"
    : "https://arb1.arbitrum.io/rpc";
}

export function inventoryMinUsdc(): number {
  const n = parseFloat(process.env.INVENTORY_MIN_USDC || "5");
  return Number.isFinite(n) ? n : 5;
}

function normalizeKey(k: string): Hex {
  return (k.startsWith("0x") ? k : `0x${k}`) as Hex;
}
