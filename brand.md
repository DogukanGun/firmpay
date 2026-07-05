# FirmPay — Brand

**Status:** applied
**Product:** FirmPay — a quote-locked crypto checkout. One signed price, any asset, any chain; settled in seconds on Arbitrum.
**Tagline:** "The price that can't flinch."
**Category:** consumer / payments · **Mood:** calm · premium · **References:** Stripe, Linear

## Palette — Porcelain Teal

Cool teal action color on porcelain white. Calm fintech trust; crisp in dark mode.
Runner-up (Sand Club warm bronze) survives as the secondary chart accent (`--chart-2`).

### Seeds

| Role | Light | Dark |
|---|---|---|
| bg-base | `oklch(0.98 0.005 200)` #F7FAFB | `oklch(0.13 0.012 200)` #0A1216 |
| bg-elevated | `oklch(1 0 0)` #FFFFFF | `oklch(0.18 0.016 200)` #121D23 |
| primary | `oklch(0.48 0.09 200)` #21798A | `oklch(0.74 0.11 195)` #59BAC6 |
| primary-soft | `oklch(0.68 0.07 200)` | `oklch(0.85 0.08 195)` #8FD3DB |
| fg-base | `oklch(0.18 0.012 200)` #152125 | `oklch(0.96 0.008 200)` #EEF3F4 |

### Applied tokens

Full shadcn token set written to `src/app/globals.css` (`:root` light + `.dark`), including
sidebar tokens and a 5-color chart ramp (chart-1 teal, chart-2 sand bronze, chart-3 slate blue,
chart-4 deep teal, chart-5 warm gray). Backup of the stock theme: `src/app/globals.css.bak`.
All fg/bg pairs pass WCAG AA (body ≥ 4.5:1, primary ≥ 3:1 on background, primary-foreground ≥ 4.5:1 on primary).

## Typography — Inter + JetBrains Mono

- **Sans (UI + headings):** Inter via `next/font/google`, CSS var `--font-sans`
- **Mono (numbers, hashes, addresses):** JetBrains Mono, CSS var `--font-mono`
- Wired in `src/app/layout.tsx`; Tailwind v4 reads the vars from the `@theme inline` block in `globals.css`.
- Money and hashes are ALWAYS `font-mono tabular-nums`.

Type scale: Display `text-5xl font-semibold tracking-tight` (hero price only) · H1 `text-3xl font-semibold tracking-tight` · H2 `text-xl font-semibold` · Body `text-sm` · Small `text-xs text-muted-foreground`.

## Gradients

None — flat surfaces + hairline borders. Elevation via `--card` on `--background`, not shadows or gradients. (Deliberate: the brand is "calm certainty"; gradients read as motion.)

## Tone & voice

**Calm certainty.** FirmPay's whole product is the removal of doubt, so the copy never hedges. Say "This is the price. It cannot go up." — never "estimated", "approximately", or "may vary". Numbers do the persuading; adjectives don't.

**Consumer-plain.** No chain names, no gas, no bridges, no token tickers in the buyer-facing flow. The buyer sees dollars and seconds. Infra vocabulary (rootHash, EIP-712, CCTP) is allowed only on the receipt's "verify" details and the ops dashboard, where proof is the point.

**Quietly technical when proving.** When we do show the machinery (signed quote hash, settlement stepper, delta-bps), present it in mono type, small, factual — like a receipt, not a pitch.

## Dos & don'ts

- DO put the locked price in mono, huge, with the TTL countdown adjacent.
- DO use `--primary` only for the single main action per screen (Pay button).
- DO use chart-2 (sand bronze) as the warm accent in dashboards — it's the Sand Club nod.
- DON'T use gradients, glows, or crypto-neon.
- DON'T show more than one number to the buyer at checkout. One price. That's the brand.
- DON'T use red except for genuine failures; expiry is neutral (re-quote), not an error.
