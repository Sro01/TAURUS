/*
  Warnings:

  - A unique constraint covering the columns `[weekNumber]` on the table `weeks` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "weeks_weekNumber_key" ON "weeks"("weekNumber");
