"use client";

import { useQuery } from "@tanstack/react-query";
import type { OrderView } from "@/lib/order-view";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DashboardData {
  orders: OrderView[];
  stats: {
    total: number;
    settled: number;
    breaches: number;
    breachRatePct: number;
    meanDeltaBps: number;
    p95DeltaBps: number;
    capturedSpreadUsd: string;
    solverSubsidyUsd: string;
  };
  solver: { address: string | null; inventoryUsdc: string | null };
}

const STATUS_LABEL: Record<string, string> = {
  quoted: "Quoted",
  confirmed: "Deposit in flight",
  merchant_paid: "Merchant paid",
  reconciled: "Reconciled",
  expired: "Expired",
  refund_pending: "Refunding",
  failed: "Failed",
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function DashboardPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("dashboard failed");
      return res.json() as Promise<DashboardData>;
    },
    refetchInterval: 5000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const { stats, orders, solver } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat
          label="Delta breach rate"
          value={`${stats.breachRatePct.toFixed(1)}%`}
          sub={`${stats.breaches} of ${stats.settled} settled · paper: 0.2%`}
        />
        <Stat
          label="Mean signed delta"
          value={`${stats.meanDeltaBps.toFixed(2)} bps`}
          sub="quote-vs-final · 0 = perfect fidelity"
        />
        <Stat
          label="Captured spread"
          value={`$${stats.capturedSpreadUsd}`}
          sub={`subsidy paid $${stats.solverSubsidyUsd} — self-funding`}
        />
        <Stat
          label="Solver inventory"
          value={solver.inventoryUsdc ? `$${solver.inventoryUsdc}` : "—"}
          sub={
            solver.address
              ? `${solver.address.slice(0, 6)}…${solver.address.slice(-4)} · native USDC · Arbitrum`
              : "solver not configured"
          }
        />
      </div>

      <Card>
        <CardContent>
          <h2 className="mb-3 text-sm font-semibold">Orders</h2>
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No orders yet — make the first purchase from the store.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quoted</TableHead>
                    <TableHead className="text-right">Bound</TableHead>
                    <TableHead className="text-right">Final</TableHead>
                    <TableHead className="text-right">Δ bps</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.id}</TableCell>
                      <TableCell className="text-xs">{o.productName}</TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        ${o.quotedUsd}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                        ${o.boundUsd}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {o.finalCostUsd ? `$${o.finalCostUsd}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {o.deltaBps ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            o.status === "reconciled" || o.status === "merchant_paid"
                              ? "secondary"
                              : o.status === "failed" || o.status === "refund_pending"
                                ? "destructive"
                                : "outline"
                          }
                          className="text-[10px]"
                        >
                          {STATUS_LABEL[o.status] ?? o.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-xs leading-5 text-muted-foreground">
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            From the research (N = 1,500 seeded A/B)
          </h2>
          Quote-locked checkout vs live re-quote: conversion{" "}
          <span className="font-mono text-foreground">70.9% vs 60.3%</span> (+17.7% relative,
          p ≈ 3.9×10⁻¹⁰) · mean signed delta{" "}
          <span className="font-mono text-foreground">−0.94 bps</span> (buyer-favorable) · p95
          delta <span className="font-mono text-foreground">0.0 bps</span> · breach rate{" "}
          <span className="font-mono text-foreground">0.2%</span> · p95 settlement{" "}
          <span className="font-mono text-foreground">15.9s</span> · all-in cost{" "}
          <span className="font-mono text-foreground">11.5 bps</span> with a self-funding 4.2 bps
          solver subsidy under an 8.0 bps captured spread.
        </CardContent>
      </Card>
    </div>
  );
}
