import { NextResponse } from "next/server";
import { getOrderStore } from "@/db";
import { toOrderView } from "@/lib/order-view";
import { inventoryMicro, solverAddress } from "@/lib/solver";
import { fromMicro, toMicro } from "@/quote_lock/money";

export const maxDuration = 30;

/** Solver ops + TCA aggregates for /dashboard. */
export async function GET() {
  const orders = (await getOrderStore().list(200)).map(toOrderView);

  const settled = orders.filter(
    (o) => o.status === "merchant_paid" || o.status === "reconciled",
  );
  const breaches = settled.filter(
    (o) =>
      o.finalCostUsd !== null && toMicro(o.finalCostUsd) > toMicro(o.boundUsd),
  ).length;
  const deltas = settled
    .map((o) => (o.deltaBps === null ? null : parseFloat(o.deltaBps)))
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);
  const meanDelta =
    deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const p95Delta =
    deltas.length > 0 ? deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * 0.95))] : 0;
  const spreadMicro = settled.reduce(
    (acc, o) => acc + (toMicro(o.quotedUsd) - toMicro(o.notionalUsd) - toMicro(o.feeEstimateUsd ?? "0")),
    0n,
  );
  const subsidyMicro = settled.reduce(
    (acc, o) => acc + toMicro(o.solverSubsidyUsd ?? "0"),
    0n,
  );

  let inventory: string | null = null;
  let solver: string | null = null;
  try {
    inventory = fromMicro(await inventoryMicro());
    solver = solverAddress();
  } catch {
    // solver key not configured — dashboard still renders order history
  }

  return NextResponse.json({
    orders,
    stats: {
      total: orders.length,
      settled: settled.length,
      breaches,
      breachRatePct: settled.length ? (100 * breaches) / settled.length : 0,
      meanDeltaBps: meanDelta,
      p95DeltaBps: p95Delta,
      capturedSpreadUsd: fromMicro(spreadMicro > 0n ? spreadMicro : 0n),
      solverSubsidyUsd: fromMicro(subsidyMicro),
    },
    solver: { address: solver, inventoryUsdc: inventory },
  });
}
