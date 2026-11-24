-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('SENT', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TEMPORARY';

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SupportStatus" NOT NULL DEFAULT 'SENT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "ownerReadVersion" INTEGER NOT NULL DEFAULT 1,
    "adminReadVersion" INTEGER NOT NULL DEFAULT 0,
    "imageName" TEXT,
    "technical" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportUpdate" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SupportStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "scopes" TEXT[],
    "codeHash" TEXT NOT NULL,
    "linkHash" TEXT,
    "linkUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_number_key" ON "SupportTicket"("number");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_updatedAt_idx" ON "SupportTicket"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_category_status_updatedAt_idx" ON "SupportTicket"("category", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportUpdate_ticketId_version_key" ON "SupportUpdate"("ticketId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryAccess_userId_key" ON "TemporaryAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryAccess_codeHash_key" ON "TemporaryAccess"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryAccess_linkHash_key" ON "TemporaryAccess"("linkHash");

-- CreateIndex
CREATE INDEX "TemporaryAccess_expiresAt_revokedAt_idx" ON "TemporaryAccess"("expiresAt", "revokedAt");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportUpdate" ADD CONSTRAINT "SupportUpdate_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportUpdate" ADD CONSTRAINT "SupportUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryAccess" ADD CONSTRAINT "TemporaryAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
