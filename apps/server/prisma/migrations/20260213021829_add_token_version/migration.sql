-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
