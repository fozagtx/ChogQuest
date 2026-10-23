# Quest Chog Chronicle contracts

`src/Chronicle.sol` is a public, on-chain record for each Chog NFT token ID in Quest Chog:
XP, level (`1 + xp / 500`), streak, last claimed day, and item inventory counts.
It holds no funds and mints no tokens.

Progress is written with `claimNight(...)`, which takes an EIP-712 `NightVoucher` signed by the
game server's voucher signer. Anyone (a relayer) may submit a voucher; the contract does not check
`msg.sender`.

**Trust model:** ownership of the Chog NFT is verified server-side before a voucher is signed, so
the voucher signer is a trusted party. If the signer key leaks, the owner should `pause()` and
`setSigner(newSigner)`. One claim per Chog per UTC day (`day` must strictly increase), which also
makes every voucher single-use.

## EIP-712

- Domain: `name = "QuestChogChronicle"`, `version = "1"`, `chainId`, `verifyingContract`
- Type: `NightVoucher(uint256 tokenId,uint32 day,bytes32 itemsHash,uint32 xpGain,uint32 streak,uint256 deadline)`
- `itemsHash = keccak256(abi.encodePacked(itemIds))` (each `uint16` padded to 32 bytes, as Solidity
  does for arrays in `encodePacked`; viem: `keccak256(encodePacked(["uint16[]"], [itemIds]))`)
- `hashVoucher(...)` and `domainSeparator()` are exposed as views for cross-checking the server.

## Commands

```sh
forge build
forge test -vv

# Export ABI after building
jq '.abi' out/Chronicle.sol/Chronicle.json > abi/Chronicle.json
```

## Deploy

```sh
export DEPLOYER_PRIVATE_KEY=0x...
export VOUCHER_SIGNER_ADDRESS=0x...
export MAX_XP_PER_CLAIM=1000  # optional, default 1000 (must match the server cap)

# Monad testnet (chain id 10143)
forge script script/Deploy.s.sol:Deploy --rpc-url monad_testnet --broadcast

# Monad mainnet
export MONAD_RPC_URL=https://...
forge script script/Deploy.s.sol:Deploy --rpc-url monad --broadcast
```

The deployer address becomes the contract owner. The script logs the deployed address.
