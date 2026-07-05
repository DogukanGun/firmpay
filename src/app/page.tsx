import Link from "next/link";
import { PRODUCTS } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StorePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="mb-14 max-w-2xl">
        <Badge variant="secondary" className="mb-4 font-mono text-[11px]">
          demo store · settles on Arbitrum
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          The price that can&rsquo;t flinch.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Pay with anything you hold, on any chain, with just an email. FirmPay
          locks one signed price for 30 seconds — and that number cannot move
          against you. No gas, no bridges, no wallet setup.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            <span className="font-mono font-medium text-foreground">0.2%</span> breach rate
          </span>
          <span>
            <span className="font-mono font-medium text-foreground">15.9s</span> p95 settlement
          </span>
          <span>
            <span className="font-mono font-medium text-foreground">+17.7%</span> conversion lift
          </span>
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-xl font-semibold">Shop</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {PRODUCTS.map((p) => (
            <Card key={p.id} className="group overflow-hidden pt-0 transition-shadow hover:shadow-md">
              <div className="flex h-36 items-center justify-center bg-muted text-6xl transition-transform duration-300 group-hover:scale-105">
                <span aria-hidden>{p.emoji}</span>
              </div>
              <CardContent className="flex flex-1 flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-medium">{p.name}</h3>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    ${p.priceUsd}
                  </span>
                </div>
                <p className="flex-1 text-xs leading-5 text-muted-foreground">{p.description}</p>
                <Button
                  className="mt-2 w-full"
                  render={<Link href={`/checkout/${p.id}`} />}
                >
                  Buy now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">How it works</h2>
        <ol className="mt-3 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
          <li>
            <span className="font-mono text-xs text-primary">01</span>
            <p className="mt-1">
              Sign in with email. Your account is upgraded in place to a
              chain-abstracted Universal Account (EIP-7702) — one balance, every chain.
            </p>
          </li>
          <li>
            <span className="font-mono text-xs text-primary">02</span>
            <p className="mt-1">
              We sign an EIP-712 price lock with a hard 30s TTL. The number you
              see is cryptographically bound — it cannot be revised upward.
            </p>
          </li>
          <li>
            <span className="font-mono text-xs text-primary">03</span>
            <p className="mt-1">
              One signature. Our solver pays the merchant native USDC on
              Arbitrum instantly; your funds reconcile in the background.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}
