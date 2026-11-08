ALTER TABLE "PublishedAnswerKey" ADD COLUMN "showInEvaluation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OpticalKey" ADD COLUMN "publicationId" TEXT;
CREATE UNIQUE INDEX "OpticalKey_publicationId_key" ON "OpticalKey"("publicationId");
ALTER TABLE "OpticalKey" ADD CONSTRAINT "OpticalKey_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "PublishedAnswerKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
