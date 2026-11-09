ALTER TABLE "AnswerKeyFile" ADD COLUMN "generated" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "FmtShare" (
 "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "templateId" TEXT NOT NULL,
 "createdById" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
 "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FmtShare_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FmtShare_tokenHash_key" ON "FmtShare"("tokenHash");
CREATE INDEX "FmtShare_createdById_createdAt_idx" ON "FmtShare"("createdById","createdAt");
CREATE INDEX "FmtShare_expiresAt_idx" ON "FmtShare"("expiresAt");
ALTER TABLE "FmtShare" ADD CONSTRAINT "FmtShare_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OpticalTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
