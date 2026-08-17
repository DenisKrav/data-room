-- DropIndex
-- Superseded by the GIN trigram index (files_name_trgm_idx) — no other
-- query needs a plain btree on name alone.
DROP INDEX "files_name_idx";

-- Backfill: every file that predates FileVersion gets a synthetic "version 1"
-- row pointing at its current storageKey. Without this, pre-existing files
-- would have no version history and, worse, their original blob would never
-- be cleaned up on delete (FilesService.remove only walks FileVersion rows).
INSERT INTO "file_versions" ("id", "fileId", "version", "storageKey", "mimeType", "sizeBytes", "createdAt")
SELECT gen_random_uuid(), f."id", 1, f."storageKey", f."mimeType", f."sizeBytes", f."createdAt"
FROM "files" f
WHERE NOT EXISTS (SELECT 1 FROM "file_versions" fv WHERE fv."fileId" = f."id");
