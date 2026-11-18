-- Additive only: historical results, keys, audit records and users are untouched.
CREATE TABLE "SearchHistory" (
 "id" TEXT NOT NULL,
 "term" VARCHAR(120) NOT NULL,
 "day" VARCHAR(10) NOT NULL,
 "count" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lastSearchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "SearchHistory_count_check" CHECK ("count" > 0)
);
CREATE UNIQUE INDEX "SearchHistory_day_term_key" ON "SearchHistory"("day", "term");
CREATE INDEX "SearchHistory_lastSearchedAt_idx" ON "SearchHistory"("lastSearchedAt");
CREATE TABLE "QuestionArchive" (
 "id" TEXT NOT NULL,
 "examId" TEXT NOT NULL,
 "publisherId" TEXT NOT NULL,
 "examVersion" TEXT NOT NULL,
 "grade" INTEGER NOT NULL,
 "lesson" TEXT NOT NULL,
 "session" TEXT NOT NULL,
 "booklet" TEXT NOT NULL,
 "originalNumber" INTEGER NOT NULL,
 "canonicalNumber" INTEGER NOT NULL,
 "correctAnswer" TEXT NOT NULL,
 "storageKey" TEXT NOT NULL,
 "mediaType" TEXT NOT NULL,
 "contentSha256" TEXT NOT NULL,
 "rightsStatus" TEXT NOT NULL DEFAULT 'PENDING',
 "rightsReference" TEXT,
 "rightsExpiresAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "QuestionArchive_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "QuestionArchive_numbers_check" CHECK ("originalNumber" BETWEEN 1 AND 300 AND "canonicalNumber" BETWEEN 1 AND 300 AND "grade" BETWEEN 1 AND 12),
 CONSTRAINT "QuestionArchive_booklet_check" CHECK ("booklet" IN ('A','B','C','D')),
 CONSTRAINT "QuestionArchive_answer_check" CHECK ("correctAnswer" IN ('A','B','C','D','E','H','X','T')),
 CONSTRAINT "QuestionArchive_rights_check" CHECK ("rightsStatus" IN ('PENDING','LICENSED','OWNED','REVOKED'))
);
CREATE UNIQUE INDEX "QuestionArchive_examId_examVersion_lesson_session_booklet_orig_key" ON "QuestionArchive"("examId", "examVersion", "lesson", "session", "booklet", "originalNumber");
CREATE INDEX "QuestionArchive_examId_examVersion_lesson_canonicalNumber_idx" ON "QuestionArchive"("examId", "examVersion", "lesson", "canonicalNumber");
