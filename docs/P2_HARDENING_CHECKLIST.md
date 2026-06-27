# NEMESIS P2 Hardening Checklist

P2 work improves post-launch robustness without changing the approval-first security model.

## Automated P2 gates

Run these before pushing P2 changes:

```bash
npm run audit:p1
npm run audit:p2
npm run build
npm audit --omit=dev --audit-level=high
npm run smoke:prod
```

## Covered by `npm run audit:p2`

- Telegram `/help` exists, is registered, and appears in `/start` for linked and unlinked users.
- Telegram command copy is ASCII-safe and free of mojibake in bot-facing files.
- Solana proposal confirmation supports retrying a submitted signature when RPC returns pending confirmation.
- Production smoke discovers all template detail routes from the template registry.
- Ops runbook documents all-template smoke coverage and P2 manual QA.
- P1 and P2 audit scripts are both available from `package.json`.

## Manual P2 QA still recommended

- Real-device Base wallet connection and SIWE on desktop and mobile.
- Real-device Solflare connect, sign-in, and disconnect on desktop and mobile.
- Telegram `/start`, `/help`, `/link`, `/unlink`, `/agents`, `/status`, `/pause`, and `/resume` against a real linked chat.
- Solana transaction submit then retry verification if the chain/RPC is slow to confirm.
- Visual scan for overflow on dashboard, deploy chat, template detail, Telegram panel, and proposal rows.

## P2 implementation notes

- `/help` is intentionally read-only and never exposes wallet data before link ownership is established.
- Solana retry stores only the submitted signature in component state and reuses the server confirmation endpoint.
- Rate limits remain in-process for this Railway monolith. Move to Redis/Upstash only if scaling to more than one replica.