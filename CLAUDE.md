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

## Conventions — where new code goes

### Backend: one folder per resource, under `backend/src/`

Follow the shape of `folders/`, `files/`, `data-rooms/`, `shares/` for any new resource:

```
<resource>/
  dto/                        one class per file, kebab-case filename → PascalCase class
                               (create-folder.dto.ts → CreateFolderDto), class-validator decorators only
  <resource>.controller.ts    routes + @CurrentUser()/@Public(), no business logic
  <resource>.service.ts       business logic, calls PermissionsService for every access check
  <resource>.module.ts        wires controller + service(s), imported into app.module.ts
```

Extra services that don't fit "the" service for a resource get their own file in the same folder (`folder-aggregates.service.ts`, `folder-listing.service.ts`) rather than being crammed into the main service or a generic `utils.ts`.

Cross-cutting stuff goes in `common/` (`PermissionsService`, `name-conflict.util.ts`) — not duplicated per-module. Auth-specific pieces (`guards/`, `decorators/`, `strategies/`, `types/`) live under `auth/`, not `common/`, since nothing outside auth constructs a JWT strategy or reads `@CurrentUser()`.

Rules that hold for every resource module:
- Every endpoint that reads or writes a folder/file/data room goes through `PermissionsService.assertFolderAccess` / `assertFileAccess` / `assertDataRoomAccess` — never a raw `prisma.folder.findUnique` ownership check inlined in a controller or service.
- DTOs validate input; don't hand-roll `if (!x) throw new BadRequestException(...)` for things `class-validator` already covers.
- Anything that changes a file/folder's existence, name, or parent must update `Folder` subtree aggregates via `FolderAggregatesService.applyDelta` in the same transaction — see the Architecture section above.

### Frontend: route files stay thin, logic lives in `components/`

```
src/app/**/page.tsx          routing + 'use client' + useParams()/useRouter() only —
                               delegates to a component immediately, no business logic inline
src/components/<domain>/     grouped by feature: browser, rooms, share, shared-with-me,
                               public-share, layout, common — mirrors the app/ route it serves
src/components/ui/            shadcn primitives ONLY (see below) — nothing hand-written here
src/lib/api/<resource>.ts     one file per backend resource; thin functions returning typed
                               promises, always through the shared `api` axios instance
src/lib/types.ts              TS interfaces mirroring backend response shapes
src/lib/*-store.ts            zustand stores for state that spans components (auth-store,
                               section-store) — not React Context, not prop drilling
```

Rules:
- Server state (anything from the API) goes through TanStack Query (`useQuery`/`useMutation`) calling a `lib/api/*` function — never a raw `fetch`/`axios` call inside a component, never data-fetching `useEffect`.
- Every new item-list row (files, folders, shared items, anything with an icon + title + subtitle) goes through `ListRow` (`components/browser/list-row.tsx`) — don't build a new bespoke flex row.
- Forms are plain controlled `useState` + a submit handler (see `login/page.tsx`, `create-room-dialog.tsx`) — this project deliberately has no `react-hook-form`/`zod` dependency; client-side validation is minimal (`required`, `minLength` on the `<input>`) and the real validation is the backend's `class-validator` DTOs, surfaced via `getApiErrorMessage` + a `sonner` toast on failure.

## Tech stack — use these, don't introduce alternatives

Stick to what's already installed; don't add a second library that does the same job.

| Concern | Use | Not |
|---|---|---|
| UI components | shadcn/ui — `npx shadcn add <name>` from `frontend/`, then edit the generated file if needed | MUI, Chakra, Ant Design, a hand-rolled component when shadcn already has one |
| Icons | `lucide-react` | inline SVG, another icon set |
| Server state (API data) | TanStack Query | SWR, raw `useEffect` + `fetch` |
| Cross-component client state | Zustand (`lib/*-store.ts`) | Redux, React Context as a store |
| HTTP client | the shared `api` instance in `lib/api/client.ts` (axios, handles the auth header + silent refresh) | a new axios instance per file, raw `fetch` |
| Forms | controlled `useState` | react-hook-form, formik (not installed — don't add them for a one-off form) |
| Toasts/notifications | `sonner` (`toast.success`/`toast.error`) | a custom toast component |
| Styling | Tailwind utility classes | CSS modules, styled-components, inline `style={}` beyond one-offs |
| ORM | Prisma | raw SQL in application code (a documented backfill/audit script is the only exception — see README "how it scales") |
| Backend validation | class-validator/class-transformer DTOs + the global `ValidationPipe` | manual `if` checks in a service for anything a DTO decorator already covers |
| File storage | Supabase Storage via `StorageService` | writing to local disk, another storage provider |
| Auth | the existing JWT access + rotating refresh-cookie flow (`auth/`) | swapping in session-based auth, NextAuth, Supabase Auth |

`date-fns` is in `frontend/package.json` but not actually used anywhere — don't treat its presence as license to reach for it; the two formatting helpers that exist (`formatBytes`, `formatItemCount` in `lib/format.ts`) are hand-rolled on purpose, and if a real date-formatting need comes up, prefer plain `Intl.DateTimeFormat` before adding it back as a real dependency.

## Deployment

- Backend: Render, configured via `render.yaml` at the repo root (Blueprint). `rootDir: backend`. Build installs devDependencies explicitly (`npm install --include=dev`) because `NODE_ENV=production` otherwise skips them — that's where `@nestjs/cli` lives, and the build breaks without it.
- Frontend: Vercel, with **Root Directory set to `frontend`** in the project settings (this is not a single-app repo).
- Backend `CORS_ORIGIN` must exactly match the frontend's deployed origin — required for the cross-origin `SameSite=None` refresh cookie to work.