import { createConfig, http } from "wagmi";
import { arbitrum, mainnet, base } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/** Fallback connect-wallet path (MetaMask etc.). Magic email login is the hero flow. */
export const wagmiConfig = createConfig({
  chains: [arbitrum, base, mainnet],
  connectors: [injected()],
  transports: {
    [arbitrum.id]: http(),
    [base.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});
