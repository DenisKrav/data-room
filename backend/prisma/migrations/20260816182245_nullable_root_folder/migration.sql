-- DropForeignKey
ALTER TABLE "data_rooms" DROP CONSTRAINT "data_rooms_rootFolderId_fkey";

-- AlterTable
ALTER TABLE "data_rooms" ALTER COLUMN "rootFolderId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "data_rooms" ADD CONSTRAINT "data_rooms_rootFolderId_fkey" FOREIGN KEY ("rootFolderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
