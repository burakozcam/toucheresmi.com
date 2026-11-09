-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT;

-- CreateTable
CREATE TABLE "SystemEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "ip" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpRestriction" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "IpRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "folderId" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedFileShare" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedFileShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsMetric" (
    "day" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalyticsMetric_pkey" PRIMARY KEY ("day","page","hour")
);

-- CreateTable
CREATE TABLE "AnalyticsVisitor" (
    "day" TEXT NOT NULL,
    "visitor" TEXT NOT NULL,

    CONSTRAINT "AnalyticsVisitor_pkey" PRIMARY KEY ("day","visitor")
);

-- CreateIndex
CREATE INDEX "SystemEvent_createdAt_idx" ON "SystemEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SystemEvent_kind_createdAt_idx" ON "SystemEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "IpRestriction_ip_expiresAt_idx" ON "IpRestriction"("ip", "expiresAt");

-- CreateIndex
CREATE INDEX "BlogPost_published_createdAt_idx" ON "BlogPost"("published", "createdAt");

-- CreateIndex
CREATE INDEX "ManagedFolder_parentId_idx" ON "ManagedFolder"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedFile_storedName_key" ON "ManagedFile"("storedName");

-- CreateIndex
CREATE INDEX "ManagedFile_folderId_createdAt_idx" ON "ManagedFile"("folderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedFileShare_tokenHash_key" ON "ManagedFileShare"("tokenHash");

-- CreateIndex
CREATE INDEX "ManagedFileShare_fileId_createdAt_idx" ON "ManagedFileShare"("fileId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsMetric_day_idx" ON "AnalyticsMetric"("day");

-- AddForeignKey
ALTER TABLE "ManagedFolder" ADD CONSTRAINT "ManagedFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ManagedFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedFile" ADD CONSTRAINT "ManagedFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ManagedFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedFileShare" ADD CONSTRAINT "ManagedFileShare_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ManagedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
