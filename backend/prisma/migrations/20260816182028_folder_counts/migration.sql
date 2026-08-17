/*
  Warnings:

  - You are about to drop the column `itemCount` on the `folders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "folders" DROP COLUMN "itemCount",
ADD COLUMN     "fileCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "folderCount" INTEGER NOT NULL DEFAULT 0;
