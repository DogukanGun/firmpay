# FirmPay — the price that can't flinch

**Quote-locked, chain-abstracted consumer checkout.** Pay with anything you hold, on any chain, with just an email — against one EIP-712-signed price that is contractually forbidden from moving against you. Settled in native USDC on Arbitrum in seconds.

Built for the **UXmaxx Hackathon** — Universal Accounts Track (Particle Network), with the Arbitrum "Road to Open House London" bounty and Magic Labs bonus.

Based on the research paper: *Quote-Locked Cross-Chain Consumer Checkout: An ERC-7683 Intent and EIP-712 Firm-Quote Architecture for Zero-Delta, Higher-Conversion Stablecoin Settlement* (see [`docs/quote-locked-checkout.pdf`](docs/quote-locked-checkout.pdf)). Headline results from the seeded N=1,500 A/B evaluation: **+17.7% relative conversion lift** (p ≈ 3.9×10⁻¹⁰), **0.2% breach rate**, **−0.94 bps mean signed delta** (buyer-favorable), **15.9s p95 settlement**, self-funding solver economics.

## The two defects this kills

1. **Quote instability** — the price at asset selection is an estimate; the charge at confirmation is something else.
2. **Cognitive overload** — the buyer is asked to reason about chains, gas, bridges, and USDC variants.

Both collapse under one abstraction: a **firm, signed price** wrapped around an **invisible funding path**.

## How it works

```
Buyer (email login, Magic)                    FirmPay server                      Arbitrum One
──────────────────────────                    ──────────────                      ────────────
1. email OTP → EOA           ──────────►
   (EOA upgraded in place to
   a Universal Account via EIP-7702)
2. "Lock my price"           ──────────►  builds the real UA cross-chain
                                          transfer (any-chain assets → native
                                          USDC to solver deposit), reads its
                                          all-in cost, signs an EIP-712
                                          LockedQuote with a hard 30s TTL
3. ONE signature over the    ──────────►  verifies sig + TTL, submits the UA
   UA rootHash                            transfer, then IMMEDIATELY pays the
                                          merchant from solver inventory ────►  merchant receives
                                                                                native USDC (~seconds)
4. receipt: stepper +                     UA leg reconciles asynchronously —
   in-browser EIP-712                     solver inventory made whole; buyer
   signature verification                 delta is structurally ZERO
```

The key disentanglement (paper §4): **pricing risk** is borne by the solver inside the lock window; **settlement risk** is absorbed by the inventory pool asynchronously. Neither ever reaches the buyer. The buyer signs a fixed set of deposit legs — the realized debit *is* the quoted debit.

## Track requirements

- **Universal Accounts SDK in EIP-7702 mode** — `src/lib/ua-server.ts` (`smartAccountOptions.useEIP7702: true`); the buyer's EOA becomes a chain-abstracted account in place, no migration.
- **Cross-chain value via UA** — every purchase routes the buyer's any-chain assets into native USDC on Arbitrum through `createTransferTransaction` / `sendTransaction`.
- **Arbitrum as invisible settlement layer** — merchant payouts, solver inventory, and canonical USDC all live on Arbitrum One; the buyer never sees a chain name.
- **Magic embedded wallet** — email OTP creates the EOA (`src/hooks/use-buyer.tsx`); no extension, no seed phrase. Injected-wallet fallback included.

## Architecture

```
src/quote_lock/     pure engine: EIP-712 LockedQuote, micro-USD money math,
                    pricing (spread + hedge buffer + TTL), delta-bps — unit-tested
src/lib/ua-server.ts   Universal Accounts glue (server-side only)
src/lib/solver.ts      hot-wallet solver: USDC payout, inventory back-pressure
src/app/api/quote      getLockedQuote  → builds UA transfer + signs the lock
src/app/api/confirm    confirmAndPay   → verify, submit UA leg, pay merchant
src/app/api/orders/[id]  status polling; drives reconciliation + expiry release
src/app/checkout/      pay sheet: email login, unified balance, TTL ring, one button
src/app/receipt/       stepper (Quote locked → Deposit → Merchant paid → Finality)
                       + EIP-712 signature verification IN THE BROWSER
src/app/dashboard/     solver desk: delta breach rate, spread vs subsidy, inventory
```

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required env (see `.env.example`):

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_PARTICLE_PROJECT_ID` / `_CLIENT_KEY` / `_APP_ID` | [dashboard.particle.network](https://dashboard.particle.network) |
| `NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY` | [dashboard.magic.link](https://dashboard.magic.link) |
| `QUOTE_SIGNER_PRIVATE_KEY` | fresh key, signs quotes, holds no funds |
| `SOLVER_PRIVATE_KEY` | hot wallet on Arbitrum One with native USDC + a little ETH |
| `MERCHANT_ADDRESS` | any address — receives the payouts |
| `DATABASE_URL` | Neon Postgres (optional locally — falls back to in-memory) |

```bash
npm test        # quote-lock engine unit tests
npm run db:push # push schema to Postgres (when DATABASE_URL is set)
```

## The guarantee, verifiable

Every receipt shows the EIP-712 quote hash and lock signature, and **re-verifies the signature client-side** against the quote engine's public address — the "price that can't flinch" is checkable by anyone, not just claimed.

## License

MIT — built during the UXmaxx Hackathon.
