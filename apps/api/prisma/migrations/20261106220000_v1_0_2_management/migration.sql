-- Preserve every existing school while new writes use a normalized identity key.
ALTER TABLE "School"
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "duplicateKey" TEXT;

UPDATE "School"
SET "duplicateKey" = 'legacy:' || "id"
WHERE "duplicateKey" IS NULL;

ALTER TABLE "School"
ALTER COLUMN "duplicateKey" SET NOT NULL;

CREATE UNIQUE INDEX "School_duplicateKey_key" ON "School"("duplicateKey");
CREATE INDEX "School_dealerId_active_idx" ON "School"("dealerId", "active");
CREATE INDEX "School_createdByUserId_active_idx" ON "School"("createdByUserId", "active");

ALTER TABLE "School"
ADD CONSTRAINT "School_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Exam"
ADD COLUMN "publisherId" TEXT;

CREATE INDEX "Exam_publisherId_idx" ON "Exam"("publisherId");

ALTER TABLE "Exam"
ADD CONSTRAINT "Exam_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublishedAnswerKey"
ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "PublishedAnswerKey"
SET "publishedAt" = "createdAt"
WHERE "publishedAt" IS NULL;

ALTER TABLE "PublishedAnswerKey"
ALTER COLUMN "publishedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "publishedAt" SET NOT NULL;
CREATE INDEX "PublishedAnswerKey_published_publishedAt_idx" ON "PublishedAnswerKey"("published", "publishedAt");

CREATE TABLE "SchoolDuplicateAttempt" (
    "id" TEXT NOT NULL,
    "submittedByUserId" TEXT,
    "matchedSchoolId" TEXT NOT NULL,
    "submittedName" TEXT NOT NULL,
    "submittedCity" TEXT,
    "submittedDistrict" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolDuplicateAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SchoolDuplicateAttempt_reviewedAt_createdAt_idx" ON "SchoolDuplicateAttempt"("reviewedAt", "createdAt");
CREATE INDEX "SchoolDuplicateAttempt_submittedByUserId_createdAt_idx" ON "SchoolDuplicateAttempt"("submittedByUserId", "createdAt");
CREATE INDEX "SchoolDuplicateAttempt_matchedSchoolId_idx" ON "SchoolDuplicateAttempt"("matchedSchoolId");

ALTER TABLE "SchoolDuplicateAttempt"
ADD CONSTRAINT "SchoolDuplicateAttempt_submittedByUserId_fkey"
FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolDuplicateAttempt"
ADD CONSTRAINT "SchoolDuplicateAttempt_matchedSchoolId_fkey"
FOREIGN KEY ("matchedSchoolId") REFERENCES "School"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolDuplicateAttempt"
ADD CONSTRAINT "SchoolDuplicateAttempt_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
