-- AlterTable
ALTER TABLE "OpticalTemplate" ADD COLUMN     "grade" INTEGER,
ADD COLUMN     "publisherId" TEXT,
ADD COLUMN     "sourceFormat" TEXT;

-- CreateTable
CREATE TABLE "PublisherLogo" (
    "publisherId" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherLogo_pkey" PRIMARY KEY ("publisherId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublisherLogo_storedName_key" ON "PublisherLogo"("storedName");

-- AddForeignKey
ALTER TABLE "OpticalTemplate" ADD CONSTRAINT "OpticalTemplate_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherLogo" ADD CONSTRAINT "PublisherLogo_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
