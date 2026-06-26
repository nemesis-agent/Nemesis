# NEMESIS Operations Runbook

Status: P1 launch operations completed for the current release.
Date: 2026-06-26

## Production URLs

- App: `https://nemesis-agent.xyz`
- Health: `https://nemesis-agent.xyz/api/health`
- Terms: `https://nemesis-agent.xyz/terms`
- Privacy: `https://nemesis-agent.xyz/privacy`
- GitHub: `https://github.com/nemesis-agent/Nemesis`
- X: `https://x.com/Nemesis_agent`

## Required Production Environment

```bash
DATABASE_URL=
SESSION_SECRET=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=xiaomi/mimo-v2.5
TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_SITE_URL=https://nemesis-agent.xyz
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=NemesisTesterBot
NEMESIS_ALERT_WEBHOOK_URL= # optional but recommended
BASE_RPC_URL= # optional, defaults to https://mainnet.base.org
```

Rules:

- `SESSION_SECRET` must be unique and at least 32 characters.
- Never put private keys, seed phrases, or custodial wallet credentials in Railway env.
- `NEMESIS_ALERT_WEBHOOK_URL` should point to a private ops channel webhook if enabled.

## Automated Production Smoke

Run after every deploy:

```bash
npm run smoke:prod
```

The smoke test verifies:

- `/api/health` returns healthy and database connected.
- `/`, `/templates`, `/terms`, `/privacy`, and `/templates/ape-agent` return 200.
- Protected POST APIs reject unauthenticated requests.
- SIWE nonce endpoint returns a nonce.
- Sensitive routes have rate-limit enforcement.
- Review-only template boundaries do not generate arbitrary calldata.

## Manual Mobile Smoke Checklist

Complete on at least one iOS wallet and one Android wallet before broad rollout:

- Open `https://nemesis-agent.xyz` on mobile browser.
- Connect wallet through WalletConnect/RainbowKit.
- Complete SIWE sign-in on Base chain.
- Open `/templates`, select `dip-buyer`, and deploy with default params.
- Open dashboard and confirm agent appears.
- Generate Telegram link code and link the bot with `/link <code>`.
- Confirm `/start`, `/agents`, and `/status` only show linked wallet data.
- Pause and resume the agent from dashboard.
- Pause and resume the agent from Telegram.
- If a proposal exists, verify approve routes the user to the dashboard for final wallet signing.
- Confirm terms/privacy links are visible in the footer.

## Cross-Browser Smoke Checklist

Complete on desktop Chrome, Brave, Edge, and at least one mobile browser:

- Home page loads without broken visuals.
- Footer social links open NEMESIS GitHub and X profile.
- `/terms` and `/privacy` load.
- Wallet connect modal opens.
- SIWE nonce request succeeds.
- Unauthenticated dashboard/API states do not leak private data.
- Template detail pages render all 10 templates.

## Rate Limits

Current in-process limits:

- `GET /api/auth/nonce`: 30/min per IP.
- `POST /api/auth/verify`: 12/min per IP.
- `POST /api/intent`: 12/min per wallet.
- `POST /api/agents`: 20/min per wallet.
- `POST /api/link/generate`: 6/10min per wallet.
- `POST /api/agents/[id]/pause`: 30/min per wallet.
- `POST /api/agents/[id]/resume`: 30/min per wallet.
- `POST /api/proposals/[id]/confirm`: 10/min per wallet.

If Railway is scaled to multiple replicas, replace the in-process limiter with Redis/Upstash-backed shared counters.

## Monitoring And Alerts

The bot emits structured logs and optional webhook alerts for:

- Telegram polling lock acquired.
- Telegram polling conflict / lock wait / lock wait timeout.
- Runner cycle errors.
- Agent evaluation failures.
- Proposal pruning failures.
- Proposal dispatch failures.

Set `NEMESIS_ALERT_WEBHOOK_URL` to receive alert payloads. If unset, alerts are logged only.

## Deploy Verification

After push/deploy:

```bash
railway status
npm run smoke:prod
curl.exe -i -s --max-time 20 https://nemesis-agent.xyz/api/health
railway logs --latest --lines 160
```

Expected:

- Railway service status is `Online`, and the latest deployment is `SUCCESS`.
- Health returns `200` with `database: connected`.
- Logs show `nemesis-web` online, `nemesis-bot` acquired polling lock, bot running, and runner initialized.
- Telegram polling conflict or lock wait may appear during handoff; it must resolve to lock acquired and bot running. If lock wait exceeds 240 seconds, the bot process exits cleanly so PM2 can retry.

## Rollback

If a deploy is bad:

1. Identify the last healthy commit from GitHub/Railway deployment history.
2. Revert the faulty commit with a normal revert commit.
3. Push to `main`.
4. Wait for Railway deploy.
5. Run `npm run smoke:prod` and inspect logs.

Do not use destructive git reset on shared `main`.

## Secret Rotation

Rotate immediately if a secret is exposed:

- OpenRouter key: revoke in OpenRouter, create a new key, update Railway env.
- Telegram bot token: rotate with BotFather, update Railway env.
- Session secret: replace with a fresh 32+ character value. Existing sessions will be invalidated.
- WalletConnect project ID: create/replace in Reown dashboard and update Railway env.

After rotation, redeploy and run smoke checks.

## Calldata Boundary

Executable payloads are allowed only for verified ETH/USDC paths that the server can reconstruct and the confirm API can verify exactly.

Review-only paths remain review-only until dedicated encoders and tests exist:

- New Base token profile review.
- New Base pool review.
- Yield claim/redeposit review.
- Airdrop/protocol interaction review.
- Non-ETH tracked assets where no safe Base payload builder is wired.
