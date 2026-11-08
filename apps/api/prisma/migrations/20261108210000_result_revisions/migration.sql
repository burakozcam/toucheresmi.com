ALTER TABLE "OpticalResult" ADD COLUMN "seriesId" TEXT, ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "supersedesId" TEXT, ADD COLUMN "uploadChecksum" TEXT, ADD COLUMN "reviewedAt" TIMESTAMP(3);
UPDATE "OpticalResult" SET "seriesId" = "id";
ALTER TABLE "OpticalResult" ALTER COLUMN "seriesId" SET NOT NULL;
CREATE UNIQUE INDEX "OpticalResult_seriesId_revision_key" ON "OpticalResult"("seriesId", "revision");
CREATE UNIQUE INDEX "OpticalResult_supersedesId_key" ON "OpticalResult"("supersedesId");
CREATE UNIQUE INDEX "OpticalResult_original_upload_key" ON "OpticalResult"("schoolId", "keyId", "templateId", "uploadChecksum") WHERE "supersedesId" IS NULL AND "uploadChecksum" IS NOT NULL;
ALTER TABLE "OpticalResult" ADD CONSTRAINT "OpticalResult_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "OpticalResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
