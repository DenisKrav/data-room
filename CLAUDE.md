# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A secure virtual data room (due-diligence document sharing): nested folders, PDF upload, and granular sharing (public link or per-user invite) with read-only enforcement. Two independent apps in one repo — no shared workspace tooling, no shared `node_modules`:

- `backend/` — NestJS + Prisma + PostgreSQL (Supabase), deployed to Render
- `frontend/` — Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui, deployed to Vercel

Full design rationale, the ERD, and the "how it scales" answers live in the root `README.md` — read that before making schema or sharing-model changes.

## Commands

Run from `backend/` or `frontend/` respectively — there is no root-level script runner.

```bash
# backend (http://localhost:4000/api)
npm run start:dev        # dev server, watch mode
npm run build             # nest build
npm run lint               # eslint --fix
npm run test               # jest (unit) — no spec files exist yet
npx prisma migrate dev --name <name>   # create + apply a migration
npx prisma generate                     # regenerate the client after schema.prisma changes

# frontend (http://localhost:3000)
npm run dev
npm run build
npm run lint
```

Both dev servers must run simultaneously (two terminals) for the app to work end to end; the frontend calls the backend over HTTP using `NEXT_PUBLIC_API_URL`.

**Windows gotcha**: `nest start --watch` holds a lock on the generated Prisma query engine DLL. Running `prisma migrate`/`generate` while it's still running fails with `EPERM`. Kill the node process (or stop the dev server) first, then migrate, then restart.

There is no automated test suite yet (`jest`/`test:e2e` are configured but empty) — everything was verified manually against the real Supabase-backed dev server (`curl` for the API, Playwright for the browser) during development.

## Architecture

### Data model shape

Every `DataRoom` owns exactly one root `Folder` (`parentId = null`), created together in one transaction (`DataRoomsService.create`) to break the circular FK between the two (`DataRoom.rootFolderId` is nullable for exactly this reason). Everything else — files, nested folders — hangs off that root, so there is no special-cased "am I at the room root?" branch anywhere in the app.

`Folder.path: string[]` is a materialized path (ancestor folder ids, root-to-here, excluding itself). It's what makes breadcrumbs, cascade delete, and share-inheritance checks O(depth) instead of recursive queries.

`Folder.fileCount` / `folderCount` / `totalSize` are denormalized subtree aggregates. They are **never** recomputed by scanning — every create/move/delete of a file or folder walks the ancestor chain (`path`) and applies a `±delta` to each ancestor, inside the same transaction as the mutation (see `FolderAggregatesService.applyDelta`, called from `FoldersService` and `FilesService`). If you add a new mutation that changes subtree contents, it must update aggregates the same way or every ancestor's displayed size/count will drift.

### Access control

`PermissionsService` (`backend/src/common/permissions.service.ts`) is the single place read/write access is decided: owner always passes; write requires ownership; read additionally passes if there's an active `Share` covering the resource itself **or any ancestor** (checked via `Folder.path`). Every controller method that touches a folder/file/data room goes through `assertFolderAccess` / `assertFileAccess` / `assertDataRoomAccess` — don't bypass it with a raw Prisma query in a new endpoint.

Public-link sharing is a **separate, parallel** code path (`SharesService.getPublicFolderChildren` / `getPublicFileViewUrl`, exposed by `PublicSharesController`, all routes marked `@Public()`), gated purely by the token, with its own scope check (is the requested folder/file the shared resource or a descendant of it) — it never goes through `PermissionsService` since there's no authenticated user.

`FoldersService.getChildren` and `FilesService.getOne` both compute and return a `canWrite` flag (owner vs. read-only-via-share). The frontend uses this — not the URL — to decide whether to show owner-only UI (upload/rename/move/delete/share buttons) and which top-level nav item ("My Data Rooms" vs "Shared with me") should be highlighted (`frontend/src/lib/section-store.ts`), because `/rooms/:roomId/...` is the route for both owned and shared-into rooms.

### Auth

Access tokens are short-lived JWTs (15 min), kept in memory on the client only (never localStorage), attached via an axios interceptor (`frontend/src/lib/api/client.ts`). Refresh tokens live 14 days as an httpOnly `SameSite=None` cookie (cross-origin: Vercel ↔ Render), rotated on every use — each refresh revokes the old token and issues a new pair; replaying an already-rotated token revokes every session for that user (theft signal). Only the SHA-256 hash of the refresh token is stored (`RefreshToken.tokenHash`).

### File viewing

There is exactly one rendering path for viewing a file: a dedicated page (`/rooms/:roomId/files/:fileId`, or the public equivalent under `/share/:token/files/:fileId`), not a modal. This exists because a file shared on its own (no folder access granted) has nowhere to open into if the only entry point is a modal launched from inside a folder listing — see `frontend/src/app/rooms/[roomId]/files/[fileId]/page.tsx`. Folder browsing (owned, public-link, or shared) all link into this same page rather than each having their own viewer.

### Shared row UI

`frontend/src/components/browser/list-row.tsx` (`ListRow`) is the one presentational row shell used by the folder browser (`FolderRow`, `FileRow`) and the "Shared with me" list (`SharedItemCard`) — same icon/title/subtitle layout, only the trailing actions differ (owner dropdown vs. nothing). Add new item-list UI through this component rather than re-styling a row from scratch.

## Deployment

- Backend: Render, configured via `render.yaml` at the repo root (Blueprint). `rootDir: backend`. Build installs devDependencies explicitly (`npm install --include=dev`) because `NODE_ENV=production` otherwise skips them — that's where `@nestjs/cli` lives, and the build breaks without it.
- Frontend: Vercel, with **Root Directory set to `frontend`** in the project settings (this is not a single-app repo).
- Backend `CORS_ORIGIN` must exactly match the frontend's deployed origin — required for the cross-origin `SameSite=None` refresh cookie to work.