-- Additive only; no existing tables or records are altered.
CREATE TABLE "OpticalExamTemplate" (
 "id" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "structure" JSONB NOT NULL,
 "createdById" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OpticalExamTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OpticalExamTemplate_createdById_createdAt_idx" ON "OpticalExamTemplate"("createdById", "createdAt");
