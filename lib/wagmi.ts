import { http, createConfig } from "wagmi"
import { injected } from "wagmi/connectors"
import { defineChain } from "viem"

import { MONAD } from "@/lib/config"

export const monad = defineChain({
  id: MONAD.chainId,
  name: MONAD.name,
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [MONAD.rpcUrl] } },
  blockExplorers: { default: { name: "Monadscan", url: MONAD.explorer } },
})

// Browser wallets only (MetaMask, Rabby, Brave, Phantom, ...), discovered through EIP-6963.
// No WalletConnect, so no project ID is needed.
export const wagmiConfig = createConfig({
  chains: [monad],
  connectors: [injected()],
  transports: { [monad.id]: http(MONAD.rpcUrl) },
  ssr: true,
})

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}
