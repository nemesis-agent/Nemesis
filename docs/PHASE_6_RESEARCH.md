# Phase 6: Production Ops, Scale & SRE Research

**Date:** 26 June 2026
**Status:** AUDITED & VALIDATED FOR EXECUTION
**Objective:** Institutional-grade ("Quant-Grade") infrastructure deployment on Railway.

---

## 1. Deployment Topology: The Monolith Pattern
Because NEMESIS relies on `node:sqlite` (SQLite), we face a strict concurrency boundary. 
**Data Fact:** SQLite WAL mode allows concurrent *readers*, but only a **single writer**. If Railway spins up multiple containers attempting to mount the same volume, file locking will fail and corrupt the DB.

**The Zero-Mistake Solution (PM2 Monolith):**
We must run Next.js (Web), Telegraf (Bot), and the Runner loop inside **ONE single Railway container**.
- We will install `pm2` as the process manager.
- We will create an `ecosystem.config.js` to boot all three Node.js processes simultaneously.
- They will all point to `NEMESIS_DB_PATH=/data/nemesis.db` on a Railway Persistent Volume.
- *Why it's safe:* Running on a single OS kernel ensures SQLite lock primitives (`busy_timeout`) work flawlessly. Processes will politely queue their writes.

---

## 2. Observability & Alerting
If a trade fails or the Base network RPC drops, we cannot rely on reading standard `console.log` visually.

**Data Fact:** Vercel AI SDK and Next.js App Router integrate natively with Sentry.
**The Zero-Mistake Solution:**
- **Sentry:** We will run `npx @sentry/wizard@latest -i nextjs` to automatically instrument Next.js API routes (including the LLM Intent layer).
- **Pino:** We will replace `console.log` in the Bot and Runner with `pino`, outputting strict JSON logs. Railway's log viewer parses JSON automatically, allowing us to filter by `{"level": "error"}`.
- **Health API:** Create `GET /api/health` that returns `200 OK` only if a `SELECT 1` query to SQLite succeeds.

---

## 3. Data Pruning (Preventing Volume Overflow)
Railway persistent volumes cost money and have limits. If agents create thousands of "skipped" proposals, the `.db` file will bloat, slowing down I/O.

**The Zero-Mistake Solution:**
Inject a cleanup routine (`cleanup.ts`) into the background Runner that fires once per day:
1. `DELETE FROM proposals WHERE status = 'skipped' AND created_at < datetime('now', '-7 days');`
2. `VACUUM;` (SQLite command to rebuild the DB file and reclaim empty bytes).

---

## 4. Edge Cases & Expiry
**Data Fact:** Crypto markets are highly volatile. A proposal created on Monday is extremely dangerous to approve on Tuesday.
**The Zero-Mistake Solution:**
- Modify the Telegram Bot's `approve` callback. Before building the unsigned transaction, check if the proposal is > 24 hours old. If true, auto-reject it with a "Proposal Expired" warning.

---

*This document validates the high-level system operations for Phase 6. Awaiting GO signal to execute these modifications.*
