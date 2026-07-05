import { UniversalAccount, CHAIN_ID } from "@/lib/ua-sdk";
import { formatEther } from "viem";
import { particleConfig } from "./config";
import { toMicro } from "@/quote_lock/money";

/** Native USDC on Arbitrum One — the canonical settlement asset (paper §4). */
export const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const;

/**
 * Server-side Universal Account handle for a buyer EOA, in EIP-7702 mode.
 * Creating transactions needs only the owner address; the buyer's single
 * signature over the returned rootHash authorizes execution.
 */
export function createBuyerUA(ownerAddress: `0x${string}`) {
  const cfg = particleConfig();
  return new UniversalAccount({
    projectId: cfg.projectId,
    projectClientKey: cfg.projectClientKey,
    projectAppUuid: cfg.projectAppUuid,
    smartAccountOptions: {
      name: "UNIVERSAL",
      version: "2.0.1",
      ownerAddress,
      useEIP7702: true,
    },
    tradeConfig: {
      slippageBps: 100,
    },
  });
}

export interface UaTransferQuote {
  /** the full ITransaction — persisted and replayed verbatim at confirm */
  transaction: Record<string, unknown>;
  rootHash: `0x${string}`;
  /** all-in USD debit from the buyer's wallet (micro-USD) */
  totalDebitMicro: bigint;
  /** UA routing/service/LP fees (micro-USD) */
  feeMicro: bigint;
}

/**
 * Build the cross-chain transfer that delivers `amountUsd` of native USDC on
 * Arbitrum to the solver's deposit address, funded from whatever the buyer
 * holds anywhere. The returned transaction's deposit legs are fixed at
 * creation, so the buyer's debit cannot move after the quote is locked.
 */
export async function createSettlementTransfer(
  buyerEoa: `0x${string}`,
  solverDeposit: `0x${string}`,
  amountUsd: string,
): Promise<UaTransferQuote> {
  const ua = createBuyerUA(buyerEoa);
  const tx = (await ua.createTransferTransaction({
    token: { chainId: CHAIN_ID.ARBITRUM_MAINNET_ONE, address: USDC_ARBITRUM },
    amount: amountUsd,
    receiver: solverDeposit,
  })) as unknown as Record<string, unknown> & {
    rootHash: `0x${string}`;
    totalDepositTokenAmountInUSD?: unknown;
    transactionFees?: Record<string, unknown>;
  };

  const totalDebitMicro =
    parseUsd18(tx.totalDepositTokenAmountInUSD) ?? toMicro(amountUsd);

  const fees = tx.transactionFees ?? {};
  const feeMicro =
    (parseUsd18(fees.transactionServiceFeeAmountInUSD) ?? 0n) +
    (parseUsd18(fees.transactionLPFeeAmountInUSD) ?? 0n);

  return {
    transaction: tx,
    rootHash: tx.rootHash,
    totalDebitMicro,
    feeMicro,
  };
}

/** Submit the stored transaction with the buyer's signature over rootHash. */
export async function sendSettlementTransfer(
  buyerEoa: `0x${string}`,
  transaction: Record<string, unknown>,
  buyerSignature: `0x${string}`,
): Promise<{ transactionId: string | null; raw: unknown }> {
  const ua = createBuyerUA(buyerEoa);
  const result = await ua.sendTransaction(
    transaction as unknown as Parameters<typeof ua.sendTransaction>[0],
    buyerSignature,
  );
  const transactionId =
    (result?.transactionId as string | undefined) ??
    (typeof result === "string" ? result : null);
  return { transactionId, raw: result };
}

/** Poll a Universal Account transaction; status per UA_TRANSACTION_STATUS. */
export async function getUaTransaction(
  buyerEoa: `0x${string}`,
  transactionId: string,
): Promise<{ status: number | null; raw: unknown }> {
  const ua = createBuyerUA(buyerEoa);
  const result = await ua.getTransaction(transactionId);
  const status =
    typeof result?.status === "number" ? result.status : null;
  return { status, raw: result };
}

/**
 * UA API amounts-in-USD arrive as 18-decimal fixed-point integers (hex or
 * decimal string). Convert to micro-USD; null when unparseable.
 */
function parseUsd18(v: unknown): bigint | null {
  try {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return toMicro(v);
    if (typeof v === "string") {
      if (v.includes(".")) return toMicro(v);
      const wei = BigInt(v); // handles both 0x-hex and decimal integers
      return toMicro(formatEther(wei));
    }
    return null;
  } catch {
    return null;
  }
}
