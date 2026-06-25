# NEMESIS

Deploy autonomous agents on Base. Built on Hermes, executed through Base
MCP. Approval-first, always.

## Structure

```
nemesis/
├── apps/
│   ├── web/             Next.js 14 — landing, templates, dashboard, agent detail
│   └── telegram-bot/    Telegraf — proposal delivery, linking, agent management
├── packages/
│   ├── db/              Shared SQLite layer (node:sqlite — zero native deps)
│   └── templates/       Shared agent template definitions
├── assets/              Branding source files (mascot, banner)
├── CONTEXT.md           Full project context — read this first
├── ARCHITECTURE.md      Technical architecture + wiring guide
└── AGENTS.md            AI agent handoff context
```

## Requirements

**Node.js 22.5+** — required for the `node:sqlite` built-in used by
`packages/db`. Earlier Node versions will fail when the database opens.

## Getting started

```bash
npm install

# Build shared packages (always first)
npm run build:db

# Seed demo data (4 agents + 7 proposals)
npm run seed:db

# Web app — http://localhost:3000
npm run dev:web

# Telegram bot (requires apps/telegram-bot/.env)
npm run dev:bot
```

Pre-hooks auto-run `build:db` before `dev:web`, `build:web`, `dev:bot`,
and `build:bot` — so you never need to run it manually after the first
time.

## Environment variables

Copy examples and fill in before running:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/telegram-bot/.env.example apps/telegram-bot/.env
```

**Web app** (`apps/web/.env.example`):
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — get one at
  https://cloud.walletconnect.com (placeholder works locally but
  WalletConnect modal will fail in production)
- `NEXT_PUBLIC_SITE_URL` — set to your production URL for correct OG
  image absolute URLs
- `NEMESIS_DB_PATH` — optional; override the SQLite file path

**Telegram bot** (`apps/telegram-bot/.env.example`):
- `TELEGRAM_BOT_TOKEN` — from @BotFather (required — bot exits without it)
- `NEMESIS_ALLOWED_USER_IDS` — comma-separated Telegram user IDs for
  access control (leave blank in dev to allow all)
- `NEMESIS_DB_PATH` — optional; **must match the web app's path** so both
  apps read the same database

## Telegram linking flow

Once the bot is running and the web app is serving:

1. Open the dashboard and connect your wallet
2. Click **Generate code** in the Connect Telegram card
3. Send `/link CODE` to the bot on Telegram
4. Bot confirms — proposals from your agents will now arrive in that chat

Commands: `/start`, `/link <code>`, `/unlink`, `/agents`, `/status`,
`/pause <id>`, `/resume <id>`, `/demo` (sends a test proposal)

## What's real vs. placeholder

**Real (backed by live SQLite reads/writes):**
- Dashboard agent list and agent detail pages (`force-dynamic`)
- Pause/resume from the web dashboard and bot
- Wallet ↔ Telegram linking (generate code → consume code → stored in DB)
- Proposal history (created by `/demo` or the seed script)
- All bot commands

**Placeholder (to be replaced with real backend):**
- `apps/web/lib/match-template.ts` — keyword matcher, not a real Hermes
  Agent. Replace with a POST to a Hermes instance.
- Agent deployment — `DeployChat` uses a `setTimeout` simulation. Replace
  with `createAgent()` in the DB + Hermes instance spin-up.
- No sub-agent runtime exists yet — no cron is monitoring conditions or
  creating proposals automatically. The `/demo` bot command and the seed
  script are the only ways proposals are created right now.
- No Base MCP connection — approve callback writes to DB but no unsigned
  transaction is built or delivered.

See CONTEXT.md section 8 for the full "what's not real yet" table, and
ARCHITECTURE.md for how to wire each piece.

## Branding assets

`assets/` contains the NEMESIS mascot in both color schemes. Already
copied into `apps/web/public/assets/` and wired into site metadata
(favicon, Open Graph) and the hero section.

| File | Use |
|------|-----|
| `nemesis-avatar-dark.png` | X/Telegram profile picture (dark, 1:1) |
| `nemesis-avatar-light.png` | Light-mode equivalent |
| `nemesis-banner-dark.png` | X header / website banner (dark, 3:1) |
| `nemesis-banner-light.png` | Light-mode banner |
| `nemesis-icon.png` | Favicon / small app icon |

## Known issues

- **`npm audit`** — 34-37 vulnerabilities in the wallet connector
  dependency tree (RainbowKit → wagmi → WalletConnect/MetaMask SDK). All
  transitive. Update `@rainbow-me/rainbowkit`, `wagmi`, and `viem`
  together when upstream patches land.
- **Two harmless build warnings** — `@react-native-async-storage` from
  MetaMask SDK and `pino-pretty` from WalletConnect. Neither is used; the
  build still succeeds.
- **WalletConnect project ID** — placeholder by default. Set the env var
  before production.
- **No SIWE** on `/api/link/generate` — the server trusts the wallet
  address in the request body. Add SIWE before public launch. See
  ARCHITECTURE.md, "API route authorization".
