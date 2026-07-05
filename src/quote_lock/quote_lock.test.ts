import { describe, it, expect } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { toMicro, fromMicro, addBpsCeil, deltaBps } from "./money";
import {
  lockedQuoteHash,
  signLockedQuote,
  verifyLockedQuote,
  verifyBuyerSignature,
  isExpired,
} from "./eip712";
import { transferAmountMicro, boundMicro, DEFAULT_PRICING } from "./pricing";
import type { LockedQuoteMessage } from "./types";

const MERCHANT = "0x000000000000000000000000000000000000dEaD" as const;
const SOLVER = "0x000000000000000000000000000000000000bEEF" as const;
const ROOT =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as const;

function sampleMessage(overrides: Partial<LockedQuoteMessage> = {}): LockedQuoteMessage {
  return {
    orderId: "ord_test_1",
    merchant: MERCHANT,
    notionalUsd: toMicro("5.00"),
    quotedUsd: toMicro("5.02"),
    boundUsd: toMicro("5.033"),
    rootHash: ROOT,
    solverDeposit: SOLVER,
    expiry: BigInt(Math.floor(Date.now() / 1000) + 30),
    ...overrides,
  };
}

describe("money", () => {
  it("round-trips micro-USD", () => {
    expect(toMicro("5.02")).toBe(5_020_000n);
    expect(fromMicro(5_020_000n)).toBe("5.02");
    expect(toMicro("0.000001")).toBe(1n);
    expect(fromMicro(toMicro("1234.567890"))).toBe("1234.56789");
  });

  it("addBpsCeil rounds up conservatively", () => {
    // 5.00 + 25bps = 5.0125 exactly
    expect(addBpsCeil(5_000_000n, 25)).toBe(5_012_500n);
    // 1 micro + 1bp must round UP, never down
    expect(addBpsCeil(1n, 1)).toBe(2n);
    expect(addBpsCeil(0n, 500)).toBe(0n);
  });

  it("deltaBps matches the paper's definition δ = 1e4·(p−q)/V", () => {
    const V = toMicro("100");
    expect(deltaBps(toMicro("100.10"), toMicro("100.00"), V)).toBeCloseTo(10);
    expect(deltaBps(toMicro("99.90"), toMicro("100.00"), V)).toBeCloseTo(-10);
    expect(deltaBps(toMicro("50"), toMicro("50"), V)).toBe(0);
  });
});

describe("pricing", () => {
  it("transfer amount = notional + spread", () => {
    expect(transferAmountMicro(toMicro("5.00"), DEFAULT_PRICING)).toBe(
      toMicro("5.0125"),
    );
  });

  it("bound = quoted × (1 + buffer)", () => {
    expect(boundMicro(toMicro("5.02"), DEFAULT_PRICING)).toBe(toMicro("5.03255"));
  });
});

describe("eip712 LockedQuote", () => {
  it("hash is stable for identical messages", () => {
    const a = lockedQuoteHash(sampleMessage());
    const b = lockedQuoteHash(sampleMessage());
    expect(a).toBe(b);
  });

  it("hash changes when any bound-relevant field changes", () => {
    const base = lockedQuoteHash(sampleMessage());
    expect(lockedQuoteHash(sampleMessage({ quotedUsd: toMicro("5.03") }))).not.toBe(base);
    expect(lockedQuoteHash(sampleMessage({ rootHash: `0x${"22".repeat(32)}` }))).not.toBe(base);
    expect(lockedQuoteHash(sampleMessage({ expiry: 1n }))).not.toBe(base);
  });

  it("sign + verify round-trips; wrong signer rejects", async () => {
    const key = generatePrivateKey();
    const signer = privateKeyToAccount(key);
    const msg = sampleMessage();
    const { quoteHash, signature } = await signLockedQuote(msg, key);
    expect(quoteHash).toBe(lockedQuoteHash(msg));
    expect(await verifyLockedQuote(msg, signature, signer.address)).toBe(true);
    expect(await verifyLockedQuote(msg, signature, MERCHANT)).toBe(false);
  });

  it("buyer signature over raw rootHash bytes verifies", async () => {
    const key = generatePrivateKey();
    const buyer = privateKeyToAccount(key);
    const sig = await buyer.signMessage({ message: { raw: ROOT } });
    expect(await verifyBuyerSignature(ROOT, sig, buyer.address)).toBe(true);
    expect(await verifyBuyerSignature(ROOT, sig, MERCHANT)).toBe(false);
  });

  it("TTL expiry is enforced", () => {
    const live = sampleMessage();
    expect(isExpired(live)).toBe(false);
    const dead = sampleMessage({ expiry: BigInt(Math.floor(Date.now() / 1000) - 1) });
    expect(isExpired(dead)).toBe(true);
  });
});
