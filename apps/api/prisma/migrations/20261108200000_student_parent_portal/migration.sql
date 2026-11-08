ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARENT';
ALTER TABLE "User" ADD COLUMN "readerManagerId" TEXT;
ALTER TABLE "User" ADD COLUMN "readerStudentNo" TEXT;
CREATE INDEX "User_readerManagerId_role_createdAt_idx" ON "User"("readerManagerId", "role", "createdAt");
ALTER TABLE "User" ADD CONSTRAINT "User_readerManagerId_fkey" FOREIGN KEY ("readerManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpticalTemplate" ADD COLUMN "originalBase64" TEXT;
ALTER TABLE "OpticalResult" ADD COLUMN "studentPublished" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "StudentResultAccess" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "resultId" TEXT NOT NULL,
 "studentNo" TEXT NOT NULL, "studentName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "StudentResultAccess_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "StudentResultAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "StudentResultAccess_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "OpticalResult"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StudentResultAccess_userId_resultId_studentNo_key" ON "StudentResultAccess"("userId", "resultId", "studentNo");
CREATE INDEX "StudentResultAccess_userId_createdAt_idx" ON "StudentResultAccess"("userId", "createdAt");
CREATE INDEX "StudentResultAccess_resultId_idx" ON "StudentResultAccess"("resultId");
