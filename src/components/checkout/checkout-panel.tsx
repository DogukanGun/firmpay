"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useBuyer } from "@/hooks/use-buyer";
import type { Product } from "@/lib/products";
import type { OrderView } from "@/lib/order-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TtlRing } from "./ttl-ring";

type Phase = "idle" | "quoting" | "locked" | "expired" | "paying";

export function CheckoutPanel({ product }: { product: Product }) {
  const router = useRouter();
  const { eoa, method, email, busy, loginWithEmail, connectWallet, signRootHash } = useBuyer();

  const [emailInput, setEmailInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [order, setOrder] = useState<OrderView | null>(null);

  const balance = useQuery({
    queryKey: ["balance", eoa],
    queryFn: async () => {
      const res = await fetch(`/api/balance?eoa=${eoa}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "balance failed");
      return res.json() as Promise<{ totalUsd: number; chains: number }>;
    },
    enabled: !!eoa,
    staleTime: 30_000,
    retry: 1,
  });

  const requestQuote = useCallback(async () => {
    if (!eoa) return;
    setPhase("quoting");
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, buyerEoa: eoa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "quote failed");
      setOrder(data.order);
      setPhase("locked");
    } catch (err) {
      setPhase("idle");
      toast.error(err instanceof Error ? err.message : "Could not get a quote");
    }
  }, [eoa, product.id]);

  const pay = useCallback(async () => {
    if (!order || !order.rootHash) return;
    setPhase("paying");
    try {
      const signature = await signRootHash(order.rootHash as `0x${string}`);
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: order.id, buyerSignature: signature }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) {
          setPhase("expired");
          return;
        }
        throw new Error(data.error ?? "payment failed");
      }
      router.push(`/receipt/${order.id}`);
    } catch (err) {
      setPhase("locked");
      toast.error(err instanceof Error ? err.message : "Payment failed — you were not charged");
    }
  }, [order, signRootHash, router]);

  // Fresh login → invalidate any stale quote
  useEffect(() => {
    setOrder(null);
    setPhase("idle");
  }, [eoa]);

  return (
    <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-[1fr_320px]">
      {/* Order summary */}
      <Card className="h-fit pt-0 overflow-hidden">
        <div className="flex h-40 items-center justify-center bg-muted text-7xl">
          <span aria-hidden>{product.emoji}</span>
        </div>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <h1 className="text-lg font-semibold">{product.name}</h1>
            <span className="font-mono font-semibold tabular-nums">${product.priceUsd}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
          <Separator className="my-4" />
          <p className="text-xs leading-5 text-muted-foreground">
            Pay from anything you hold on Ethereum, Base, Arbitrum, BSC or
            Solana. The merchant receives native USDC on Arbitrum, instantly.
          </p>
        </CardContent>
      </Card>

      {/* Pay sheet */}
      <div className="flex flex-col gap-4">
        {!eoa ? (
          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Sign in to pay</h2>
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!emailInput.includes("@")) {
                    toast.error("Enter a valid email");
                    return;
                  }
                  loginWithEmail(emailInput).catch((err) =>
                    toast.error(err instanceof Error ? err.message : "Login failed"),
                  );
                }}
              >
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={busy}
                  autoFocus
                />
                <Button type="submit" disabled={busy}>
                  {busy ? "Check your inbox…" : "Continue with email"}
                </Button>
              </form>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <Separator className="flex-1" />
                or
                <Separator className="flex-1" />
              </div>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  connectWallet().catch((err) =>
                    toast.error(err instanceof Error ? err.message : "No wallet found"),
                  )
                }
              >
                Connect a wallet
              </Button>
              <p className="text-[11px] leading-4 text-muted-foreground">
                No seed phrase, no extension needed. Email creates a secure
                wallet that works everywhere.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Unified balance */}
            <Card>
              <CardContent>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Your balance — everywhere
                </p>
                {balance.isLoading ? (
                  <Skeleton className="mt-1 h-8 w-28" />
                ) : balance.data ? (
                  <>
                    <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">
                      $
                      {balance.data.totalUsd.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      across {balance.data.chains || 1} chain
                      {balance.data.chains === 1 ? "" : "s"} · one account
                      {method === "magic" && email ? ` · ${email}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Balance unavailable — you can still pay.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quote / pay */}
            <AnimatePresence mode="wait">
              {phase === "idle" || phase === "quoting" ? (
                <motion.div
                  key="get-quote"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <Button className="w-full" size="lg" onClick={requestQuote} disabled={phase === "quoting"}>
                    {phase === "quoting" ? "Locking your price…" : "Lock my price"}
                  </Button>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    We&rsquo;ll sign a firm quote, fixed for 30 seconds.
                  </p>
                </motion.div>
              ) : phase === "expired" ? (
                <motion.div
                  key="expired"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <Card>
                    <CardContent className="flex flex-col gap-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        The lock expired. You were not charged.
                      </p>
                      <Button onClick={requestQuote}>Get a fresh price</Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : order ? (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <Card className="border-primary/40">
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Total — locked
                          </p>
                          <p className="font-mono text-3xl font-semibold tabular-nums">
                            ${order.quotedUsd}
                          </p>
                        </div>
                        <TtlRing
                          expiresAt={order.expiresAt}
                          ttlSeconds={order.ttlSeconds}
                          onExpire={() => setPhase((p) => (p === "paying" ? p : "expired"))}
                        />
                      </div>
                      <div className="rounded-lg bg-muted px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                        Signed price guarantee — you can never be charged more
                        than <span className="font-mono">${order.boundUsd}</span>.
                        Includes all fees. Item ${order.notionalUsd}.
                      </div>
                      <Button size="lg" onClick={pay} disabled={phase === "paying"}>
                        {phase === "paying" ? "Confirming…" : `Pay $${order.quotedUsd}`}
                      </Button>
                      <p className="text-center text-[11px] text-muted-foreground">
                        One signature. No gas. No chain to pick.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
