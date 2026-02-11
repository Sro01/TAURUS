/*
  Warnings:

  - You are about to drop the column `description` on the `teams` table. All the data in the column will be lost.
  - You are about to drop the column `generation` on the `teams` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "teams" DROP COLUMN "description",
DROP COLUMN "generation";
