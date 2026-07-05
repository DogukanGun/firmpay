"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createWalletClient, custom, type Hex } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
} from "wagmi";
import { getMagic } from "@/lib/magic-client";

/** Magic's typed metadata nests the EVM address under wallets.ethereum, while
 * older SDK responses expose it top-level — accept either. */
function magicAddress(info: {
  wallets?: { ethereum?: { publicAddress: string | null } };
}): `0x${string}` | null {
  const top = (info as { publicAddress?: string | null }).publicAddress;
  const addr = top ?? info.wallets?.ethereum?.publicAddress ?? null;
  return (addr as `0x${string}`) ?? null;
}

export type BuyerMethod = "magic" | "wallet";

interface BuyerState {
  eoa: `0x${string}` | null;
  method: BuyerMethod | null;
  email: string | null;
  busy: boolean;
  /** email OTP login via Magic embedded wallet (hero flow) */
  loginWithEmail: (email: string) => Promise<void>;
  /** injected wallet fallback (MetaMask etc.) */
  connectWallet: () => Promise<void>;
  logout: () => Promise<void>;
  /** the single buyer signature: personal_sign over the raw UA rootHash bytes */
  signRootHash: (rootHash: Hex) => Promise<Hex>;
}

const BuyerContext = createContext<BuyerState | null>(null);

export function BuyerProvider({ children }: { children: ReactNode }) {
  const [magicEoa, setMagicEoa] = useState<`0x${string}` | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { address: walletEoa, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  // Restore an existing Magic session on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY) return;
        const magic = await getMagic();
        if (await magic.user.isLoggedIn()) {
          const info = await magic.user.getInfo();
          const addr = magicAddress(info);
          if (!cancelled && addr) {
            setMagicEoa(addr);
            setEmail(info.email ?? null);
          }
        }
      } catch {
        // no session — fine
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithEmail = useCallback(async (emailAddr: string) => {
    setBusy(true);
    try {
      const magic = await getMagic();
      await magic.auth.loginWithEmailOTP({ email: emailAddr });
      const info = await magic.user.getInfo();
      const addr = magicAddress(info);
      if (!addr) throw new Error("Magic login returned no address");
      setMagicEoa(addr);
      setEmail(info.email ?? emailAddr);
    } finally {
      setBusy(false);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setBusy(true);
    try {
      const injected = connectors.find((c) => c.type === "injected") ?? connectors[0];
      if (!injected) throw new Error("No wallet connector available");
      await connectAsync({ connector: injected });
    } finally {
      setBusy(false);
    }
  }, [connectAsync, connectors]);

  const logout = useCallback(async () => {
    if (magicEoa) {
      try {
        const magic = await getMagic();
        await magic.user.logout();
      } catch {
        // best-effort
      }
      setMagicEoa(null);
      setEmail(null);
    }
    if (isConnected) await disconnectAsync().catch(() => {});
  }, [magicEoa, isConnected, disconnectAsync]);

  const method: BuyerMethod | null = magicEoa ? "magic" : isConnected ? "wallet" : null;
  const eoa = magicEoa ?? (isConnected ? (walletEoa as `0x${string}`) : null) ?? null;

  const signRootHash = useCallback(
    async (rootHash: Hex): Promise<Hex> => {
      if (!eoa) throw new Error("Not logged in");
      if (method === "magic") {
        const magic = await getMagic();
        const client = createWalletClient({
          transport: custom(
            magic.rpcProvider as unknown as { request: (args: unknown) => Promise<unknown> },
          ),
        });
        return client.signMessage({ account: eoa, message: { raw: rootHash } });
      }
      return signMessageAsync({ message: { raw: rootHash } });
    },
    [eoa, method, signMessageAsync],
  );

  const value = useMemo(
    () => ({ eoa, method, email, busy, loginWithEmail, connectWallet, logout, signRootHash }),
    [eoa, method, email, busy, loginWithEmail, connectWallet, logout, signRootHash],
  );

  return <BuyerContext.Provider value={value}>{children}</BuyerContext.Provider>;
}

export function useBuyer(): BuyerState {
  const ctx = useContext(BuyerContext);
  if (!ctx) throw new Error("useBuyer must be used inside <BuyerProvider>");
  return ctx;
}
