CREATE TABLE "OpticalTemplate" (
 "id" TEXT NOT NULL, "name" TEXT NOT NULL, "originalFmt" TEXT NOT NULL, "layout" JSONB NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OpticalTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OpticalTemplate_name_key" ON "OpticalTemplate"("name");
CREATE TABLE "OpticalKey" (
 "id" TEXT NOT NULL, "name" TEXT NOT NULL, "questions" JSONB NOT NULL, "penalty" INTEGER NOT NULL DEFAULT 3,
 "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OpticalKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OpticalKey_name_key" ON "OpticalKey"("name");
CREATE TABLE "OpticalResult" (
 "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "templateId" TEXT NOT NULL, "keyId" TEXT NOT NULL,
 "createdById" TEXT NOT NULL, "filename" TEXT NOT NULL, "snapshot" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OpticalResult_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "OpticalResult_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "OpticalResult_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OpticalTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "OpticalResult_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "OpticalKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "OpticalResult_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "OpticalResult_schoolId_createdAt_idx" ON "OpticalResult"("schoolId", "createdAt");
