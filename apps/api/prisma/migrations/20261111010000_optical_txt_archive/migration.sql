CREATE TABLE "OpticalTxtFile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evaluatedAt" TIMESTAMP(3),
  "resultId" TEXT,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "OpticalTxtFile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpticalTxtFile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OpticalTxtFile_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "OpticalResult"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OpticalTxtFile_storedName_key" ON "OpticalTxtFile"("storedName");
CREATE INDEX "OpticalTxtFile_createdById_deletedAt_createdAt_idx" ON "OpticalTxtFile"("createdById","deletedAt","createdAt");
CREATE INDEX "OpticalTxtFile_resultId_idx" ON "OpticalTxtFile"("resultId");

CREATE TABLE "OpticalTxtUse" (
  "fileId" TEXT NOT NULL,
  "resultId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpticalTxtUse_pkey" PRIMARY KEY ("fileId","resultId"),
  CONSTRAINT "OpticalTxtUse_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "OpticalTxtFile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OpticalTxtUse_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "OpticalResult"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OpticalTxtUse_resultId_idx" ON "OpticalTxtUse"("resultId");
