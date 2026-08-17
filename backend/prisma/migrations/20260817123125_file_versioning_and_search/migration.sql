-- CreateTable
CREATE TABLE "file_versions" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_versions_fileId_idx" ON "file_versions"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "file_versions_fileId_version_key" ON "file_versions"("fileId", "version");

-- CreateIndex
CREATE INDEX "files_name_idx" ON "files"("name");

-- AddForeignKey
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigram index so ILIKE '%substring%' name search (extra-credit search feature)
-- stays index-backed instead of a sequential scan as the table grows — see
-- README "how it scales". Hand-added: Prisma has no native schema syntax for
-- extensions/trigram indexes without the postgresqlExtensions preview feature.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "files_name_trgm_idx" ON "files" USING GIN ("name" gin_trgm_ops);
