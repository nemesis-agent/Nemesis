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
- Runner: remains online for pruning and operational visibility; production template evaluators are currently gated.

## Important Reality Check

The app is safer after the latest audit, but Base MCP / AgentKit transaction encoding is not production-complete. Production template deployment is gated until each template has verified monitoring, proposal generation, and calldata. The `/demo` command is limited to a zero-value Base signature check for smoke testing the wallet handoff.

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

The health endpoint is `/api/health`.

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

## Launch Blockers

- Legal review for ToS/privacy before public launch.
- Real Base MCP/AgentKit calldata encoder and end-to-end signing test before any production template is enabled.
- Production env variables set under the NEMESIS project identity.
- Real mobile-device and cross-browser smoke tests.
