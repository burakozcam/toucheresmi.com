ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "ExamScheduleEntry" (
  "id" TEXT NOT NULL,
  "publisherId" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "examDate" DATE NOT NULL,
  "scope" TEXT NOT NULL,
  "answerKeyId" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamScheduleEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExamScheduleEntry_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ExamScheduleEntry_answerKeyId_fkey" FOREIGN KEY ("answerKeyId") REFERENCES "PublishedAnswerKey"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ExamScheduleEntry_level_check" CHECK ("level" IN ('1','2','3','4','5','6','7','8','9','10','11','12','TYT','AYT')),
  CONSTRAINT "ExamScheduleEntry_sequence_check" CHECK ("sequence" > 0)
);
CREATE UNIQUE INDEX "ExamScheduleEntry_publisherId_level_sequence_examDate_key" ON "ExamScheduleEntry"("publisherId", "level", "sequence", "examDate");
CREATE INDEX "ExamScheduleEntry_published_level_examDate_idx" ON "ExamScheduleEntry"("published", "level", "examDate");
CREATE INDEX "ExamScheduleEntry_answerKeyId_idx" ON "ExamScheduleEntry"("answerKeyId");
