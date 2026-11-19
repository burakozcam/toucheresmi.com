-- AlterTable
ALTER TABLE "FmtShare" ADD COLUMN     "startsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "state" TEXT NOT NULL DEFAULT 'ACTIVE',
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "section" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceEvent" TEXT,
    "publicationId" TEXT,
    "releaseDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementTarget" (
    "announcementId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,

    CONSTRAINT "AnnouncementTarget_pkey" PRIMARY KEY ("announcementId","targetId")
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("announcementId","userId")
);

-- CreateTable
CREATE TABLE "AnnouncementAutomation" (
    "kind" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "targetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementAutomation_pkey" PRIMARY KEY ("kind")
);

-- CreateIndex
CREATE UNIQUE INDEX "Announcement_sourceEvent_key" ON "Announcement"("sourceEvent");

-- CreateIndex
CREATE INDEX "Announcement_state_startsAt_endsAt_idx" ON "Announcement"("state", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Announcement_category_state_startsAt_idx" ON "Announcement"("category", "state", "startsAt");

-- CreateIndex
CREATE INDEX "Announcement_publicationId_idx" ON "Announcement"("publicationId");

-- CreateIndex
CREATE INDEX "AnnouncementTarget_targetId_announcementId_idx" ON "AnnouncementTarget"("targetId", "announcementId");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "PublishedAnswerKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTarget" ADD CONSTRAINT "AnnouncementTarget_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
