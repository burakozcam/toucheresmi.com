-- CreateEnum
CREATE TYPE "PublisherRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AnswerKeyFileCategory" AS ENUM ('ANSWER_KEY', 'LEARNING_OUTCOMES');

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublisherRequest" (
    "id" TEXT NOT NULL,
    "publisherName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT,
    "publisherId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "status" "PublisherRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerKey" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "examName" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnswerKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerKeyFile" (
    "id" TEXT NOT NULL,
    "answerKeyId" TEXT NOT NULL,
    "category" "AnswerKeyFileCategory" NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerKeyFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_normalizedName_key" ON "Publisher"("normalizedName");

-- CreateIndex
CREATE INDEX "Publisher_active_name_idx" ON "Publisher"("active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PublisherRequest_normalizedName_status_key" ON "PublisherRequest"("normalizedName", "status");

-- CreateIndex
CREATE INDEX "PublisherRequest_status_createdAt_idx" ON "PublisherRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PublisherRequest_requestedByUserId_createdAt_idx" ON "PublisherRequest"("requestedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PublisherRequest_publisherId_idx" ON "PublisherRequest"("publisherId");

-- CreateIndex
CREATE INDEX "AnswerKey_published_createdAt_idx" ON "AnswerKey"("published", "createdAt");

-- CreateIndex
CREATE INDEX "AnswerKey_publisherId_grade_idx" ON "AnswerKey"("publisherId", "grade");

-- CreateIndex
CREATE INDEX "AnswerKeyFile_answerKeyId_category_idx" ON "AnswerKeyFile"("answerKeyId", "category");

-- AddForeignKey
ALTER TABLE "PublisherRequest" ADD CONSTRAINT "PublisherRequest_publisherId_fkey"
    FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherRequest" ADD CONSTRAINT "PublisherRequest_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherRequest" ADD CONSTRAINT "PublisherRequest_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerKey" ADD CONSTRAINT "AnswerKey_publisherId_fkey"
    FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerKey" ADD CONSTRAINT "AnswerKey_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerKeyFile" ADD CONSTRAINT "AnswerKeyFile_answerKeyId_fkey"
    FOREIGN KEY ("answerKeyId") REFERENCES "AnswerKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
