import type { Magic } from "magic-sdk";

let magic: Magic | null = null;

/**
 * Lazy browser-only Magic instance. The embedded wallet's EOA is what the
 * Universal Account upgrades in place via EIP-7702 — no new address.
 */
export async function getMagic(): Promise<Magic> {
  if (typeof window === "undefined") {
    throw new Error("Magic is browser-only");
  }
  if (!magic) {
    const key = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
    if (!key) {
      throw new Error(
        "NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY missing (dashboard.magic.link)",
      );
    }
    const { Magic: MagicCtor } = await import("magic-sdk");
    magic = new MagicCtor(key, {
      network: { rpcUrl: "https://arb1.arbitrum.io/rpc", chainId: 42161 },
    });
  }
  return magic;
}
