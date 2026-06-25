# Phase 6 Research - Superseded

This document previously assumed a SQLite deployment. The current NEMESIS runtime uses Supabase/Postgres through `pg`.

Current production ops facts:

- Railway config is in `railway.toml`.
- PM2 starts `nemesis-web` and `nemesis-bot` from `ecosystem.config.js`.
- Health checks use `/api/health`, which runs `SELECT 1` against Postgres.
- Required DB env is `DATABASE_URL`, not `NEMESIS_DB_PATH`.

Do not use the older SQLite/WAL/volume guidance for production.
