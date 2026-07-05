"use client";

import Link from "next/link";
import { useBuyer } from "@/hooks/use-buyer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IS_DEMO } from "@/lib/mode";

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function SiteHeader() {
  const { eoa, email, method, logout } = useBuyer();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary font-mono text-[13px] font-bold text-primary-foreground">
            F
          </span>
          <span className="text-[15px] font-semibold tracking-tight">FirmPay</span>
          {IS_DEMO && (
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              testnet demo
            </Badge>
          )}
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Solver desk
          </Link>
          {eoa ? (
            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                {method === "magic" && email ? email : shortAddr(eoa)}
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Sign out
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Not signed in</span>
          )}
        </nav>
      </div>
    </header>
  );
}
