// Deployed contract addresses. CHRONICLE_ADDRESS in the environment overrides these.

export const MONAD_TESTNET = {
  chainId: 10143,
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorer: "https://testnet.monadscan.com",
} as const

/** The Chog NFT, read-only. Same chain as Chronicle, so ownership can be checked on Monad testnet. */
export const CHOG_NFT = {
  name: "Chog Genesis (Testnet)",
  address: "0x11138917b6Dd0782C8Ef98AC7EBB0c3Bd5706ccE",
  chainId: MONAD_TESTNET.chainId,
} as const

export const CHRONICLE = {
  address: "0xb46cd62a826b94f07a507c5359f79f189200ec93",
  chainId: MONAD_TESTNET.chainId,
  deployTx: "0x1045bec6056a0dee2e127928713dcc2433dddf24d837d620832f36a72a3bd3a1",
  deployBlock: 73_399_927,
  maxXpPerClaim: 1000,
} as const

export function explorerAddress(address: string) {
  return `${MONAD_TESTNET.explorer}/address/${address}`
}

export function explorerTx(hash: string) {
  return `${MONAD_TESTNET.explorer}/tx/${hash}`
}
