/*
  Warnings:

  - A unique constraint covering the columns `[startDate]` on the table `weeks` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[year,weekNumber]` on the table `weeks` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `year` to the `weeks` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "weeks_startDate_endDate_idx";

-- DropIndex
DROP INDEX "weeks_weekNumber_key";

-- AlterTable
ALTER TABLE "weeks" ADD COLUMN     "year" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "weeks_startDate_key" ON "weeks"("startDate");

-- CreateIndex
CREATE INDEX "weeks_status_idx" ON "weeks"("status");

-- CreateIndex
CREATE INDEX "weeks_year_idx" ON "weeks"("year");

-- CreateIndex
CREATE UNIQUE INDEX "weeks_year_weekNumber_key" ON "weeks"("year", "weekNumber");
