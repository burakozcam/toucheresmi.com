-- Adds verification evidence without rewriting or disabling existing templates.
ALTER TABLE "OpticalTemplate" ADD COLUMN "validation" JSONB;
