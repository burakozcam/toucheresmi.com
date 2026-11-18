-- Additive report metadata only. No historical result or answer data is modified.
CREATE TABLE "ExamReportLogo" (
 "id" TEXT NOT NULL,
 "schoolId" TEXT NOT NULL,
 "keyId" TEXT NOT NULL,
 "enabled" BOOLEAN NOT NULL DEFAULT true,
 "image" TEXT NOT NULL,
 "updatedById" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ExamReportLogo_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ExamReportLogo_image_size" CHECK (octet_length("image") <= 720000),
 CONSTRAINT "ExamReportLogo_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ExamReportLogo_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "OpticalKey"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExamReportLogo_schoolId_keyId_key" ON "ExamReportLogo"("schoolId", "keyId");
CREATE INDEX "ExamReportLogo_keyId_idx" ON "ExamReportLogo"("keyId");
