---
name: db-migrate
description: Safely create and apply a Prisma migration for the Data Room backend, avoiding the Windows EPERM lock issue with the running dev server. Use when backend/prisma/schema.prisma has changed and needs a migration.
---

# Prisma migration workflow (Windows-safe)

`nest start --watch` holds an open handle on the generated Prisma query engine DLL. Running `prisma migrate`/`generate` while it's running fails with:
```
EPERM: operation not permitted, rename '...\query_engine-windows.dll.node.tmpXXXX' -> '...\query_engine-windows.dll.node'
```

## Steps

1. Stop the backend dev server if it's running, or kill stray node processes:
   ```bash
   taskkill //F //IM node.exe //T
   ```
   (This kills every node process — only do it if nothing else important is running.)

2. From `backend/`, create and apply the migration:
   ```bash
   npx prisma migrate dev --name <descriptive_name>
   ```
   This also regenerates the Prisma client.

3. Restart the dev server (see the `run` skill) and confirm it boots cleanly — a broken migration usually surfaces immediately as a startup crash or a Prisma Client type error.

## Notes

- Never hand-edit a migration file that's already been applied against the Supabase database — create a new migration instead.
- Prisma uses `DIRECT_URL` (not the pooled `DATABASE_URL`) for migrations — both must be set in `backend/.env`.
- Aggregates (`Folder.fileCount`/`folderCount`/`totalSize`) are maintained by application code, not by triggers — a schema migration alone never needs to backfill them unless you're changing what the columns mean.