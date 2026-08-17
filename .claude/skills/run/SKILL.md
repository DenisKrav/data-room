---
name: run
description: Start both the Data Room backend (NestJS, :4000) and frontend (Next.js, :3000) dev servers for this project. Use when asked to run, start, or launch the app locally.
---

# Run Data Room locally

Two independent apps, no shared script runner — start both.

## Prerequisites

- `backend/.env` exists (see `backend/.env.example` — Supabase `DATABASE_URL`/`DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET`, JWT secrets)
- `frontend/.env.local` exists with `NEXT_PUBLIC_API_URL=http://localhost:4000/api`

## Steps

1. Check ports 3000 and 4000 aren't already held by a stale process — this repo has repeatedly hit orphaned `node.exe` processes left over from a previous session binding these ports on Windows:
   ```bash
   netstat -ano | grep -E ":3000 |:4000 "
   ```
   If something's listed, `taskkill //F //PID <pid>` before continuing.

2. Start the backend (from `backend/`):
   ```bash
   npm run start:dev
   ```
   Wait for `Nest application successfully started` in the log — first compile takes ~15-20s.

3. Start the frontend (from `frontend/`):
   ```bash
   npm run dev
   ```
   Wait for `Ready in ...`.

4. Smoke-check both:
   ```bash
   curl -s http://localhost:4000/api/health
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
   ```
   Expect `{"status":"ok"}` and `200`.

## Gotcha

`nest start --watch` holds a lock on the generated Prisma query engine DLL on Windows. If you need to run `prisma migrate`/`generate` after this, stop the backend dev server first — otherwise it fails with `EPERM`. See the `db-migrate` skill.