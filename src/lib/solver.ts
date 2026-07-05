import {
  createPublicClient,
  createWalletClient,
  http,
  erc20Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { arbitrumRpcUrl, solverKey, inventoryMinUsdc } from "./config";
import { USDC_ARBITRUM } from "./ua-server";

/**
 * The single hot-wallet solver (paper §4): holds native USDC inventory on
 * Arbitrum One, pays the merchant the instant a lock is confirmed, and is
 * made whole asynchronously when the buyer's UA transfer lands.
 *
 * Micro-USD and USDC base units are both 6dp, so amounts map 1:1.
 */

function clients() {
  const account = privateKeyToAccount(solverKey());
  const transport = http(arbitrumRpcUrl());
  return {
    account,
    wallet: createWalletClient({ account, chain: arbitrum, transport }),
    public: createPublicClient({ chain: arbitrum, transport }),
  };
}

export function solverAddress(): `0x${string}` {
  return privateKeyToAccount(solverKey()).address;
}

export function solverDepositAddress(): `0x${string}` {
  return (process.env.SOLVER_DEPOSIT_ADDRESS as `0x${string}`) || solverAddress();
}

/** Free USDC inventory (base units = micro-USD). */
export async function inventoryMicro(): Promise<bigint> {
  const { public: pub, account } = clients();
  return pub.readContract({
    address: USDC_ARBITRUM,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
}

/** Low-inventory back-pressure gate (paper §4 inventory policy π). */
export async function hasInventoryFor(notionalMicro: bigint): Promise<boolean> {
  const floor = BigInt(Math.round(inventoryMinUsdc() * 1e6));
  const bal = await inventoryMicro();
  return bal >= notionalMicro + floor;
}

/** Pay the merchant `amountMicro` native USDC. Non-blocking on the buyer's cross-chain leg. */
export async function payMerchant(
  merchant: `0x${string}`,
  amountMicro: bigint,
): Promise<Hex> {
  const { wallet } = clients();
  return wallet.writeContract({
    address: USDC_ARBITRUM,
    abi: erc20Abi,
    functionName: "transfer",
    args: [merchant, amountMicro],
  });
}

/** Wait for the payout tx to be mined (used by the receipt stepper). */
export async function waitForTx(hash: Hex): Promise<"success" | "reverted"> {
  const { public: pub } = clients();
  const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return receipt.status;
}
