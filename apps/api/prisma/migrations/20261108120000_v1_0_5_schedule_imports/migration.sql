-- Additive only; no existing data is removed.
ALTER TABLE "ExamScheduleEntry" ADD COLUMN "importId" TEXT, ADD COLUMN "importBaseline" TIMESTAMP(3), ADD COLUMN "series" TEXT, ADD COLUMN "sourcePublisher" TEXT;
CREATE INDEX "ExamScheduleEntry_importId_idx" ON "ExamScheduleEntry"("importId");
CREATE TABLE "ScheduleImport" (
  "id" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "total" INTEGER NOT NULL, "saved" INTEGER NOT NULL DEFAULT 0,
  "invalid" INTEGER NOT NULL DEFAULT 0, "duplicates" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'processing',
  CONSTRAINT "ScheduleImport_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PublisherAlias" (
  "id" TEXT NOT NULL, "source" TEXT NOT NULL, "publisherId" TEXT NOT NULL,
  "series" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublisherAlias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PublisherAlias_source_key" ON "PublisherAlias"("source");
ALTER TABLE "User" ADD COLUMN "setupTokenHash" TEXT, ADD COLUMN "setupExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_setupTokenHash_key" ON "User"("setupTokenHash");
