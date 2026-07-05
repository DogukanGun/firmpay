import { NextResponse } from "next/server";
import { createBuyerUA } from "@/lib/ua-server";
import { firmpayMode } from "@/lib/config";

export const maxDuration = 30;

/**
 * Unified cross-chain balance for the buyer's Universal Account.
 * Keeps the UA SDK entirely server-side — the client only sees one number.
 */
export async function GET(req: Request) {
  try {
    const eoa = new URL(req.url).searchParams.get("eoa");
    if (!eoa || !/^0x[0-9a-fA-F]{40}$/.test(eoa)) {
      return NextResponse.json({ error: "invalid eoa" }, { status: 400 });
    }
    if (firmpayMode() === "demo") {
      return NextResponse.json({
        totalUsd: 25.0,
        chains: 3,
        perChain: { "8453": 12.5, "1": 7.5, "42161": 5.0 },
        demo: true,
      });
    }
    const ua = createBuyerUA(eoa as `0x${string}`);
    const assets = await ua.getPrimaryAssets();
    const perChain: Record<string, number> = {};
    for (const a of assets.assets ?? []) {
      for (const c of a.chainAggregation ?? []) {
        if (c.amountInUSD > 0) {
          const key = String(c.token?.chainId ?? "unknown");
          perChain[key] = (perChain[key] ?? 0) + c.amountInUSD;
        }
      }
    }
    return NextResponse.json({
      totalUsd: assets.totalAmountInUSD ?? 0,
      chains: Object.keys(perChain).length,
      perChain,
    });
  } catch (err) {
    console.error("balance failed:", err);
    const message = err instanceof Error ? err.message : "balance failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
