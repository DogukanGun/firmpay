"use client";

import { useEffect, useState } from "react";

/**
 * Circular countdown for the lock TTL. Purely presentational — expiry is
 * enforced server-side; this just makes the guarantee legible.
 */
export function TtlRing({
  expiresAt,
  ttlSeconds,
  onExpire,
}: {
  expiresAt: string;
  ttlSeconds: number;
  onExpire?: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemainingMs(left);
      if (left === 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 100);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const total = ttlSeconds * 1000;
  const frac = total > 0 ? remainingMs / total : 0;
  const R = 15;
  const C = 2 * Math.PI * R;
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div className="relative size-10" role="timer" aria-label={`${seconds} seconds remaining`}>
      <svg viewBox="0 0 36 36" className="size-10 -rotate-90">
        <circle cx="18" cy="18" r={R} fill="none" className="stroke-border" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          className="stroke-primary transition-[stroke-dashoffset] duration-100 ease-linear"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold tabular-nums">
        {seconds}
      </span>
    </div>
  );
}
