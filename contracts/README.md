# Chronicle

Public record of each Chog's nights in Quest Chog, keyed by the Chog NFT's token ID: XP, level,
claim streak, last claimed day, and an item inventory. No funds, no tokens, no trusted keys.

## How it works

- `claimNight(tokenId, day)` is called by the Chog's current holder from their own wallet.
  Chronicle checks `ownerOf(tokenId)` on the Chog NFT (`NotChogHolder` otherwise).
- `day` is a UTC day number and must be today or yesterday (`DayNotClaimable`), and later than the
  last claimed day (`AlreadyClaimed`). So each Chog claims at most once per day.
- The night's items come from `rollNight(tokenId, day)`: a public, deterministic roll of 1 to 3
  distinct items (COMMON 1-12, RARE 13-18, EPIC 19-21; about 1 in 12 nights has an EPIC). The app
  calls the same view to show the items on the diary page before the claim.
- Each claim adds 40 XP; level = 1 + xp / 500. The streak counts consecutive claimed days.
- Progress belongs to the token ID, so it follows the Chog to a new holder.
- The owner can `pause()` and `unpause()` claims. Nothing else is privileged.

Emits `NightClaimed(tokenId, day, holder, itemIds, newXp, newLevel, streak)`. The app verifies
this event from the claim transaction before recording the claim off-chain.

## Commands

```bash
forge build
forge test                      # 16 tests, including a fuzz test of the roll
jq '.abi' out/Chronicle.sol/Chronicle.json > abi/Chronicle.json
```

Deploy (the deployer becomes the owner):

```bash
export DEPLOYER_PRIVATE_KEY=0x...
export CHOG_NFT_ADDRESS=0x...    # optional, defaults to Chog Genesis on Monad mainnet
forge script script/Deploy.s.sol:Deploy --rpc-url monad --broadcast
```

Deployed on Monad mainnet (chain 143): `0xB46cd62a826b94f07a507c5359F79F189200ec93`, reading Chog Genesis at `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`.

Earlier testnet deployments (unused): `0x6b52bBa2e20E1B3842dd2b297d5398d718e548b6` and the paused signer-based `0xb46c…ec93` on chain 10143.
