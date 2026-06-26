# NEMESIS

NEMESIS is an approval-first automation platform for Base wallets. Users describe intent in plain language, the Master Agent proposes one or more single-condition agent plans, and every transaction remains user-approved from the user's own wallet.

![NEMESIS](/assets/nemesis-banner-dark.png)

## Product Rules

- NEMESIS never custodies user funds.
- Agents propose actions; users approve before any wallet signature.
- Deployment plans must show a plain-language approval summary with real parameter values.
- Each template stays one condition, one action.
- High-risk and degen templates require explicit risk acknowledgement.

## Current Implementation

- Web app: Next.js 14, RainbowKit, Wagmi, SIWE, iron-session.
- Bot: Telegraf with linked-wallet command authorization.
- Database: Supabase/Postgres through `pg`, shared by web and bot.
- Templates: `@nemesis/templates`, 10 v1 templates.
- Master Agent API: SIWE-protected `/api/intent`, OpenRouter-backed structured output.
- Runner: production evaluators are enabled for all 10 v1 templates, with review-only proposals where arbitrary calldata is not yet safe to generate.

## Important Reality Check

NEMESIS is approval-first and non-custodial. Some production templates generate executable ETH/USDC swap payloads after exact proposal review; templates that involve arbitrary new tokens, pools, yield claims, or protocol interactions remain review-only until a dedicated encoder is wired and tested. The `/demo` command is limited to smoke testing the proposal handoff.

## Required Production Environment

Set these in Railway or your deploy provider:

```bash
DATABASE_URL=
SESSION_SECRET=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=xiaomi/mimo-v2.5
TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_SITE_URL=
```

`SESSION_SECRET` must be unique and at least 32 characters. `NEXT_PUBLIC_SITE_URL` must be the canonical HTTPS URL. `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` must belong to the NEMESIS WalletConnect project.

## Railway Deployment

`railway.toml` configures a Nixpacks build with `npm run build` and starts the monolith with `npm start`, which launches both:

- `nemesis-web`
- `nemesis-bot`

The health endpoint is `/api/health`. Run `npm run smoke:prod` after production deploys. See `docs/OPS_RUNBOOK.md` for launch operations, rate limits, alerts, rollback, and manual device smoke checks.

## Local Development

```bash
npm install
npm run build:db
npm run build:web
npm run build:bot
```

For full local runtime, create local env files from:

- `apps/web/.env.example`
- `apps/telegram-bot/.env.example`

## Telegram Commands

- `/start` - link-aware welcome
- `/link <code>` - link this chat to the SIWE-authenticated wallet code
- `/unlink` - remove Telegram link
- `/agents` - list only linked wallet agents
- `/status [agent_id]` - show linked wallet status only
- `/pause <agent_id>` - pause linked wallet agent
- `/resume <agent_id>` - resume linked wallet agent
- `/demo` - create a demo proposal for the linked wallet

## Launch Status

- Legal/privacy/terms internal product compliance review: completed for the current release.
- External legal counsel review: not claimed by this repository.
- Production env variables: configured under the NEMESIS project identity.
- Production deploy: live on Railway at `https://nemesis-agent.xyz`.
- P1 API rate limits, ops alert hooks, production smoke script, and launch runbook: completed.
- Real mobile-device and cross-browser smoke test checklist: documented in `docs/OPS_RUNBOOK.md` and must be executed on actual target devices before broad marketing rollout.
