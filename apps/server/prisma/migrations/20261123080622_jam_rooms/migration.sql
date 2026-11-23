-- CreateTable
CREATE TABLE "jam_rooms" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "headcount" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "jam_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jam_participants" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "slots" INTEGER[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "jam_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jam_rooms_slug_key" ON "jam_rooms"("slug");

-- CreateIndex
CREATE INDEX "jam_rooms_endDate_idx" ON "jam_rooms"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "jam_participants_roomId_nameKey_key" ON "jam_participants"("roomId", "nameKey");

-- AddForeignKey
ALTER TABLE "jam_participants" ADD CONSTRAINT "jam_participants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "jam_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
