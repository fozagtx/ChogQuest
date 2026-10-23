# Quest Chog

Your Chog has a goal. So do you. You complete yours, it completes its, you all win.

Your private goals become RPG quests. Your Chog NFT is your party member. Each night it goes out and comes back with a diary page and up to three items. XP, level, streak and items are recorded on Monad against the Chog's **token ID** in the Chronicle contract, so they follow the NFT if it changes wallets.

Built for Chogathon 2026.

## How you play

1. **Claim your Chog.** Connect the wallet that holds it and sign in (a free signature).
2. **Set your goals.** Up to three. They are encrypted and never go on-chain. Your Chog gets its own quest.
3. **Check in. Level up.** Each check-in is +60 XP and moves your Chog's quest too. Claim last night's items for +40 XP before the end of the next day (UTC), or they slip into Lost and Found.

## What is in this repo

| Path | What |
| --- | --- |
| `app/` | Next.js 16 app: landing, `/start`, `/app` (Today, Quests, Chog, Share), `/link`, and all `/api/*` routes |
| `lib/xp.ts`, `lib/night.ts`, `lib/items.ts` | Deterministic game rules: XP, levels, streak with weekly sleep-in, night rolls (about 1 in 12 nights has an EPIC item) |
| `lib/narrate.ts` | The only AI call. It writes the diary title and text from the roll. It never decides numbers |
| `lib/game.ts` | Goals, check-ins, nights, claims, app state |
| `lib/chain.ts` | Chog NFT reads (`ownerOf`, `tokenURI`), EIP-712 voucher signing, relayer |
| `lib/bot.ts`, `app/api/telegram` | Telegram bot: `/start CODE`, `/night`, `/goals`, `/mute`, inline Claim / Check in / Remind me later / Mute |
| `lib/cron.ts` | Morning (generate nights, morning message) and evening (one nudge, quiet hours, mute) |
| `contracts/` | Foundry project with `Chronicle.sol`, 21 tests, deploy script |
| `scripts/smoke.ts` | End-to-end check of the API with a real wallet key |
| `render.yaml` | Render Blueprint: web service, Postgres, two cron jobs, env group |

## Trust model

- The server is a **trusted signer**. Before every claim it checks Chog ownership with `ownerOf` on the Chog NFT contract, then signs an EIP-712 voucher. The relayer submits it, so claims are gasless for players.
- Chronicle enforces one claim per Chog per day (`day > lastClaimDay`), a per-claim XP cap, voucher deadlines and pause. The database also has a unique `(chog, day)` constraint.
- If Chronicle is on testnet and the Chog NFT is on mainnet, Chronicle cannot check ownership on-chain itself. Only the server's signature vouches for it.
- Goal titles and check-in notes are AES-256-GCM encrypted at rest and never logged. Only XP, level, streak and item IDs go on-chain. Share cards hide goal names by default. "Delete my data" removes goals and check-ins.
- The signer and relayer are different wallets. The relayer holds only a small MON balance.

## Local development

Needs Bun 1.3+, Postgres, and Foundry for the contracts.

```bash
bun install
createdb questchog
cp .env.example .env.local      # fill in the values
bun run db:migrate
bun dev                         # http://localhost:3000
```

Contracts:

```bash
cd contracts
forge test
```

### Full local run on anvil

```bash
anvil
# deploy Chronicle with signer = your VOUCHER_SIGNER address, cap 1000
cd contracts && forge create src/Chronicle.sol:Chronicle --rpc-url http://127.0.0.1:8545 \
  --private-key <deployer key> --broadcast --constructor-args <owner> <signer address> 1000
```

Set `MONAD_RPC_URL=http://127.0.0.1:8545`, `CHRONICLE_ADDRESS`, both keys and `CHOG_NFT_ADDRESS` (an ERC-721 you hold on that chain), fund the relayer, then:

```bash
BASE_URL=http://localhost:3000 SMOKE_PRIVATE_KEY=<holder key> SMOKE_TOKEN_ID=<id> bun run smoke
```

The smoke test signs in, rejects a Chog the wallet doesn't hold, creates a goal, checks in, rejects a second check-in, claims the night on-chain, rejects a second claim the same day, and deletes the data.

## Deploying

### 1. Chronicle on Monad

Deployed on Monad testnet (chain 10143), max 1000 XP per claim:

| | |
| --- | --- |
| Chronicle contract | [`0xb46cd62a826b94f07a507c5359f79f189200ec93`](https://testnet.monadscan.com/address/0xb46cd62a826b94f07a507c5359f79f189200ec93) |
| Deploy transaction | [`0x1045bec6…3bd3a1`](https://testnet.monadscan.com/tx/0x1045bec6056a0dee2e127928713dcc2433dddf24d837d620832f36a72a3bd3a1) (block 73,399,927) |
| Owner | [`0xE712a13CFA3220B9b1Ea5f7bd6e77CAd44F5B826`](https://testnet.monadscan.com/address/0xE712a13CFA3220B9b1Ea5f7bd6e77CAd44F5B826) |
| Voucher signer | [`0x9933dDD92CfDef3A674a7eD101648B042fCB1DF6`](https://testnet.monadscan.com/address/0x9933dDD92CfDef3A674a7eD101648B042fCB1DF6) |
| Relayer | [`0x19F75699aaF157604Beee753093612271856B5D0`](https://testnet.monadscan.com/address/0x19F75699aaF157604Beee753093612271856B5D0) |

The app uses this address by default (`lib/contracts.ts`). Set `CHRONICLE_ADDRESS` to point at a different deployment.

```bash
cd contracts
export DEPLOYER_PRIVATE_KEY=0x...
export VOUCHER_SIGNER_ADDRESS=0x...   # address of VOUCHER_SIGNER_PRIVATE_KEY
export MAX_XP_PER_CLAIM=1000          # must match MAX_XP_PER_CLAIM in lib/xp.ts
forge script script/Deploy.s.sol:Deploy --rpc-url monad_testnet --broadcast
```

### 2. Render

1. Push the repo and create a Blueprint from `render.yaml`.
2. Fill in the `sync: false` values when prompted: Telegram token and username, signer and relayer keys, AI key, `CHOG_NFT_ADDRESS`, `CHRONICLE_ADDRESS`, `APP_URL` (the web service URL), and `CHOG_RPC_URL` if the NFT is on a different network than Chronicle.
3. Send the relayer address a small amount of MON for gas.
4. Register the bot webhook once:

```bash
TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=<value from Render> APP_URL=https://... bun scripts/set-webhook.ts
```

Notes from Render's docs (October 2026): a Free web service spins down after 15 minutes without traffic, which makes the first bot reply slow. The Blueprint uses the Starter plan for that reason. Each cron job has a minimum charge of $1 per month. Check current pricing before you deploy.

Cron schedule (UTC): morning `0 7 * * *`, evening `0 19 * * *`. Both endpoints require the `x-cron-secret` header.

## Testing instructions for judges

1. Open the app URL and press **CLAIM YOUR CHOG**.
2. Connect a wallet that holds a Chog and sign the free sign-in message.
3. Pick your Chog and set a first goal.
4. On **Today**, read last night's diary, press **CLAIM**, and see XP go up. The transaction hash appears under the button.
5. Check in on your goal. Your Chog's quest moves too.
6. **Chog** shows the inventory recorded against the token ID. **Share** saves cards as images.
7. Optional: on **Chog**, press **LINK TELEGRAM**, send the code to the bot, confirm with your wallet, then send `/night`.

$CHOG is never required to play.
