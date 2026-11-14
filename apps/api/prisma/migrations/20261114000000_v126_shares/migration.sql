-- Additive migration only. No existing links, users or results are removed.
ALTER TABLE "FmtShare" ALTER COLUMN "expiresAt" DROP NOT NULL;
ALTER TABLE "FmtShare" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'FMT',
 ADD COLUMN "targetId" TEXT, ADD COLUMN "name" TEXT, ADD COLUMN "tokenEncrypted" TEXT,
 ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "downloads" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "lastAccessAt" TIMESTAMP(3);
ALTER TABLE "FmtShare" ADD COLUMN "usedAt" TIMESTAMP(3);
CREATE TABLE "ScoreProfile" (
 "id" TEXT NOT NULL, "name" TEXT NOT NULL, "publisher" TEXT NOT NULL,
 "grade" INTEGER NOT NULL, "base" DOUBLE PRECISION NOT NULL,
 "weights" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ScoreProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScoreProfile_publisher_grade_active_idx" ON "ScoreProfile"("publisher","grade","active");
ALTER TABLE "ScoreProfile" ADD COLUMN "multipleMark" TEXT NOT NULL DEFAULT 'wrong';
CREATE UNIQUE INDEX "ScoreProfile_one_active_default" ON "ScoreProfile"("publisher","grade") WHERE "active" = true;
