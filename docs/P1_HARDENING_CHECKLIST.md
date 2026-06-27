# NEMESIS P1 Hardening Checklist

This checklist tracks production hardening work after P0 launch blockers are clear. P1 items are not allowed to weaken the approval-first rules in AGENTS.md.

## Automated gates

Run these before pushing production-facing changes:

```bash
npm run audit:p1
npm run build
npm audit --omit=dev --audit-level=high
npm run smoke:prod
```

## Covered by `npm run audit:p1`

- Template registry has production coverage and no duplicate template IDs.
- Every template keeps one condition, one action, protocols, parameters, and an approval summary.
- Approval summaries interpolate declared parameter keys only.
- High and degen templates include specific risk notes.
- Solana templates stay scoped to Solflare/Jupiter and state that nothing signs or broadcasts automatically.
- User-facing source is checked for mojibake text corruption.
- Telegram linking exposes a direct NEMESIS bot CTA and per-chain code generation.
- Unified wallet connect keeps Base and Solflare in one connect menu.
- Deploy flow shows `fillApprovalSummary()` and keeps high/degen risk gating.
- Proposal confirmation paths verify Base and Solana transaction ownership.
- Ops docs include required production environment variables.

## Covered by `npm run smoke:prod`

- Production health endpoint returns database-connected status.
- Home, templates, terms, privacy, and every template detail route return 200.
- Mutating sensitive routes reject unauthenticated requests.
- Auth nonce endpoint returns a usable nonce.
- Rate-limit enforcement remains present on sensitive routes.
- Review-only template boundaries remain explicit.
- Chain-aware deploy and Telegram linking remain enforced.
- Solana profit taker keeps guarded Jupiter sell preparation.

## Manual checks still recommended before larger traffic

- Real-device wallet flows: Chrome Android, Safari iOS, desktop Chrome.
- Base wallet connect and SIWE sign-in with a real wallet.
- Solflare connect and Solana sign-in with a real wallet.
- Telegram `/start`, `/link`, invalid code, expired code, and duplicate link attempts.
- One Base template deploy, pause, resume, proposal view, and proposal confirmation dry-run.
- One Solana template deploy and proposal view.
- Visual scan of dashboard, template pages, deploy flow, Telegram panel, terms, and privacy on mobile and desktop.

## Known upstream dependency note

`npm audit --omit=dev --audit-level=high` must stay clean. Current moderate advisories are upstream in Next/PostCSS and wallet/Solana dependency chains; `npm audit fix --force` proposes breaking downgrades, so do not force it without a dedicated compatibility pass.