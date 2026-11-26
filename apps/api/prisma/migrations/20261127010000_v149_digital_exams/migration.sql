-- AlterTable
ALTER TABLE "StudentPortal" ADD COLUMN     "enrollmentId" TEXT;

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentNo" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "branch" TEXT NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGroup" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "StudentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGroupMember" (
    "groupId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,

    CONSTRAINT "StudentGroupMember_pkey" PRIMARY KEY ("groupId","enrollmentId")
);

-- CreateTable
CREATE TABLE "DigitalExam" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "penalty" INTEGER NOT NULL,
    "grade" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "allowTimed" BOOLEAN NOT NULL DEFAULT true,
    "allowUntimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalAttempt" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "timed" BOOLEAN,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "booklets" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 0,
    "resultId" TEXT,

    CONSTRAINT "DigitalAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDocumentAccess" (
    "documentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,

    CONSTRAINT "StudentDocumentAccess_pkey" PRIMARY KEY ("documentId","enrollmentId")
);

-- CreateTable
CREATE TABLE "AnswerKeyImportReceipt" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerKeyImportReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_userId_key" ON "StudentEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_schoolId_studentNo_key" ON "StudentEnrollment"("schoolId", "studentNo");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGroup_schoolId_name_key" ON "StudentGroup"("schoolId", "name");

-- CreateIndex
CREATE INDEX "DigitalExam_schoolId_createdAt_idx" ON "DigitalExam"("schoolId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalAttempt_resultId_key" ON "DigitalAttempt"("resultId");

-- CreateIndex
CREATE INDEX "DigitalAttempt_submittedAt_endsAt_idx" ON "DigitalAttempt"("submittedAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalAttempt_examId_enrollmentId_key" ON "DigitalAttempt"("examId", "enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDocument_fileId_key" ON "StudentDocument"("fileId");

-- CreateIndex
CREATE INDEX "AnswerKeyImportReceipt_actorId_createdAt_idx" ON "AnswerKeyImportReceipt"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentPortal" ADD CONSTRAINT "StudentPortal_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroup" ADD CONSTRAINT "StudentGroup_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroupMember" ADD CONSTRAINT "StudentGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroupMember" ADD CONSTRAINT "StudentGroupMember_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalExam" ADD CONSTRAINT "DigitalExam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalExam" ADD CONSTRAINT "DigitalExam_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "OpticalKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAttempt" ADD CONSTRAINT "DigitalAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "DigitalExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAttempt" ADD CONSTRAINT "DigitalAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAttempt" ADD CONSTRAINT "DigitalAttempt_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "OpticalResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ManagedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocumentAccess" ADD CONSTRAINT "StudentDocumentAccess_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StudentDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocumentAccess" ADD CONSTRAINT "StudentDocumentAccess_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
