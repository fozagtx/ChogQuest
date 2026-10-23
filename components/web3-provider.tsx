"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConnectKitProvider } from "connectkit"
import { useState } from "react"
import { WagmiProvider } from "wagmi"

import { monad, wagmiConfig } from "@/lib/wagmi"

// ConnectKit themed to match the app: cream, yellow, ink, rounded Nunito.
const theme = {
  "--ck-font-family": "var(--font-nunito), sans-serif",
  "--ck-border-radius": "28px",
  "--ck-overlay-background": "rgba(26, 18, 0, 0.35)",
  "--ck-overlay-backdrop-filter": "blur(8px)",
  "--ck-body-background": "#FFFBF1",
  "--ck-body-color": "#1A1200",
  "--ck-body-color-muted": "rgba(26, 18, 0, 0.55)",
  "--ck-body-action-color": "rgba(26, 18, 0, 0.45)",
  "--ck-body-background-secondary": "rgba(255, 184, 0, 0.1)",
  "--ck-body-background-tertiary": "rgba(255, 184, 0, 0.16)",
  "--ck-modal-box-shadow": "0 40px 80px -30px rgba(26, 18, 0, 0.35)",
  "--ck-primary-button-background": "rgba(255, 184, 0, 0.12)",
  "--ck-primary-button-hover-background": "rgba(255, 184, 0, 0.24)",
  "--ck-primary-button-color": "#1A1200",
  "--ck-primary-button-border-radius": "20px",
  "--ck-primary-button-font-weight": "800",
  "--ck-secondary-button-background": "#FFB800",
  "--ck-secondary-button-color": "#1A1200",
  "--ck-focus-color": "#FFB800",
  "--ck-spinner-color": "#FFB800",
  "--ck-tooltip-background": "#1A1200",
  "--ck-tooltip-color": "#FFFBF1",
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          mode="light"
          customTheme={theme}
          options={{ initialChainId: monad.id, enforceSupportedChains: true, hideBalance: true }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
