-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'CONFIRMED_ADMIN';

-- AlterTable
ALTER TABLE "reservations" ALTER COLUMN "teamId" DROP NOT NULL;
