"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { OrderView } from "@/lib/order-view";
import { EXPLORER_BASE } from "@/lib/mode";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const TERMINAL = new Set(["reconciled", "expired", "failed", "refund_pending"]);

interface Step {
  key: string;
  title: string;
  detail: string;
  done: (o: OrderView) => boolean;
  link?: (o: OrderView) => string | null;
}

const STEPS: Step[] = [
  {
    key: "locked",
    title: "Quote locked",
    detail: "EIP-712 price guarantee signed with a hard 30s TTL",
    done: () => true,
  },
  {
    key: "deposit",
    title: "Deposit confirmed",
    detail: "Your one signature routed funds from wherever you hold them",
    done: (o) =>
      ["confirmed", "merchant_paid", "reconciled"].includes(o.status),
  },
  {
    key: "paid",
    title: "Merchant paid",
    detail: "Solver fronted native USDC on Arbitrum — no waiting on bridges",
    done: (o) => ["merchant_paid", "reconciled"].includes(o.status),
    link: (o) =>
      o.payoutTxHash ? `${EXPLORER_BASE}/tx/${o.payoutTxHash}` : null,
  },
  {
    key: "final",
    title: "Source finality",
    detail: "Cross-chain leg settled — solver inventory made whole",
    done: (o) => o.status === "reconciled",
    link: (o) =>
      o.depositTxHash ? `${EXPLORER_BASE}/tx/${o.depositTxHash}` : null,
  },
];

export function ReceiptPanel({ orderId }: { orderId: string }) {
  const [verified, setVerified] = useState<boolean | null>(null);

  const { data, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error("order not found");
      return res.json() as Promise<{
        order: OrderView;
        verify: { merchant: string; solverDeposit: string; quoteSigner: string } | null;
      }>;
    },
    refetchInterval: (q) =>
      q.state.data && TERMINAL.has(q.state.data.order.status) ? false : 2500,
  });
  const order = data?.order ?? null;
  const verifyCtx = data?.verify ?? null;

  // Independently verify the price-lock signature IN THE BROWSER: recompute
  // the EIP-712 message from displayed fields and check the quote engine's
  // signature against its public address. The guarantee is checkable, not
  // just claimed.
  useEffect(() => {
    if (!order || !verifyCtx || verified !== null) return;
    (async () => {
      try {
        const { verifyLockedQuote } = await import("@/quote_lock/eip712");
        const { toMicro } = await import("@/quote_lock/money");
        const ok = await verifyLockedQuote(
          {
            orderId: order.id,
            merchant: verifyCtx.merchant as `0x${string}`,
            notionalUsd: toMicro(order.notionalUsd),
            quotedUsd: toMicro(order.quotedUsd),
            boundUsd: toMicro(order.boundUsd),
            rootHash: (order.rootHash ?? "0x") as `0x${string}`,
            solverDeposit: verifyCtx.solverDeposit as `0x${string}`,
            expiry: BigInt(Math.floor(new Date(order.expiresAt).getTime() / 1000)),
          },
          order.quoteSignature as `0x${string}`,
          verifyCtx.quoteSigner as `0x${string}`,
        );
        setVerified(ok);
      } catch {
        setVerified(false);
      }
    })();
  }, [order, verifyCtx, verified]);

  const settledSeconds = useMemo(() => {
    if (!order?.reconciledAt) return null;
    const ms = new Date(order.reconciledAt).getTime() - new Date(order.createdAt).getTime();
    return (ms / 1000).toFixed(1);
  }, [order]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Order not found.{" "}
          <Link href="/" className="text-primary underline-offset-4 hover:underline">
            Back to store
          </Link>
        </CardContent>
      </Card>
    );
  }
  if (!order) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading receipt…
        </CardContent>
      </Card>
    );
  }

  const failed = order.status === "failed" || order.status === "refund_pending";
  const expired = order.status === "expired";

  return (
    <div className="flex flex-col gap-5">
      {/* Headline */}
      <Card className={failed ? "border-destructive/40" : "border-primary/40"}>
        <CardContent className="flex flex-col items-center gap-1 py-8 text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {order.productName}
          </p>
          <p className="font-mono text-4xl font-semibold tabular-nums">
            ${order.finalCostUsd ?? order.quotedUsd}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
              Δ {order.deltaBps ?? "0"} bps
            </Badge>
            <Badge variant="secondary" className="font-mono text-[11px]">
              charged exactly as quoted
            </Badge>
            {settledSeconds && (
              <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
                settled in {settledSeconds}s
              </Badge>
            )}
          </div>
          {failed && (
            <p className="mt-3 text-sm text-destructive">
              Something went wrong — your funds are protected and will be
              refunded. You were never charged beyond the bound.
            </p>
          )}
          {expired && (
            <p className="mt-3 text-sm text-muted-foreground">
              This lock expired before payment. Nothing was charged.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stepper */}
      {!expired && (
        <Card>
          <CardContent>
            <ol className="flex flex-col">
              {STEPS.map((step, i) => {
                const done = step.done(order);
                const active = !done && (i === 0 || STEPS[i - 1].done(order));
                const href = step.link?.(order) ?? null;
                return (
                  <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span
                        className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px ${
                          done ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                    <motion.span
                      initial={false}
                      animate={{ scale: done ? 1 : 0.9 }}
                      className={`z-10 mt-0.5 flex size-[23px] shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : active
                            ? "animate-pulse border-primary text-primary"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </motion.span>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${done ? "" : "text-muted-foreground"}`}>
                        {step.title}
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">{step.detail}</p>
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-primary underline-offset-4 hover:underline"
                        >
                          view on Arbiscan ↗
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Proof */}
      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">The guarantee</h2>
            {verified !== null && (
              <Badge variant={verified ? "secondary" : "destructive"} className="text-[11px]">
                {verified ? "verified in your browser ✓" : "signature mismatch"}
              </Badge>
            )}
          </div>
          <Separator />
          <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-[110px_1fr]">
            <dt className="text-muted-foreground">Quote hash</dt>
            <dd className="break-all font-mono">{order.quoteHash}</dd>
            <dt className="text-muted-foreground">Lock signature</dt>
            <dd className="break-all font-mono">{order.quoteSignature}</dd>
            <dt className="text-muted-foreground">Signed bound</dt>
            <dd className="font-mono tabular-nums">${order.boundUsd} — could never be exceeded</dd>
            <dt className="text-muted-foreground">Root hash</dt>
            <dd className="break-all font-mono">{order.rootHash}</dd>
          </dl>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" render={<Link href="/" />}>
          Continue shopping
        </Button>
      </div>
    </div>
  );
}
