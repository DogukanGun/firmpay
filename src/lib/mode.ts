/** Client-safe mode flags (NEXT_PUBLIC — inlined at build time). */

export const IS_DEMO = process.env.NEXT_PUBLIC_FIRMPAY_MODE === "demo";

export const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_CHAIN_ENV === "testnet"
    ? "https://sepolia.arbiscan.io"
    : "https://arbiscan.io";
