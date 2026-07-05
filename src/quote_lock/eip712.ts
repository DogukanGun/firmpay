import {
  hashTypedData,
  verifyTypedData,
  verifyMessage,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { LockedQuoteMessage, LockedQuote } from "./types";

export const ARBITRUM_ONE_CHAIN_ID = 42161;

export const LOCKED_QUOTE_DOMAIN = {
  name: "FirmPay LockedQuote",
  version: "1",
  chainId: ARBITRUM_ONE_CHAIN_ID,
} as const;

export const LOCKED_QUOTE_TYPES = {
  LockedQuote: [
    { name: "orderId", type: "string" },
    { name: "merchant", type: "address" },
    { name: "notionalUsd", type: "uint256" },
    { name: "quotedUsd", type: "uint256" },
    { name: "boundUsd", type: "uint256" },
    { name: "rootHash", type: "bytes32" },
    { name: "solverDeposit", type: "address" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

export function lockedQuoteHash(message: LockedQuoteMessage): Hex {
  return hashTypedData({
    domain: LOCKED_QUOTE_DOMAIN,
    types: LOCKED_QUOTE_TYPES,
    primaryType: "LockedQuote",
    message,
  });
}

/** Quote-engine signs the LockedQuote. The signature IS the price guarantee. */
export async function signLockedQuote(
  message: LockedQuoteMessage,
  signerKey: Hex,
): Promise<{ quoteHash: Hex; signature: Hex }> {
  const account = privateKeyToAccount(signerKey);
  const signature = await account.signTypedData({
    domain: LOCKED_QUOTE_DOMAIN,
    types: LOCKED_QUOTE_TYPES,
    primaryType: "LockedQuote",
    message,
  });
  return { quoteHash: lockedQuoteHash(message), signature };
}

/** Anyone (receipt page, judge) can verify the guarantee against the signer address. */
export async function verifyLockedQuote(
  message: LockedQuoteMessage,
  signature: Hex,
  expectedSigner: `0x${string}`,
): Promise<boolean> {
  return verifyTypedData({
    address: expectedSigner,
    domain: LOCKED_QUOTE_DOMAIN,
    types: LOCKED_QUOTE_TYPES,
    primaryType: "LockedQuote",
    message,
    signature,
  });
}

/**
 * Verify the buyer's single signature: a personal_sign over the raw bytes of
 * the Universal Account rootHash (the merkle root covering every cross-chain
 * user-op in the transfer).
 */
export async function verifyBuyerSignature(
  rootHash: Hex,
  signature: Hex,
  buyerEoa: `0x${string}`,
): Promise<boolean> {
  return verifyMessage({
    address: buyerEoa,
    message: { raw: rootHash },
    signature,
  });
}

export function isExpired(quote: Pick<LockedQuoteMessage, "expiry">, nowSeconds?: number): boolean {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  return BigInt(now) > quote.expiry;
}

export type { LockedQuote };
