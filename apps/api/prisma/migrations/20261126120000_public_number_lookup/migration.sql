-- Explicit institution consent; existing institutions remain private.
ALTER TABLE "School" ADD COLUMN "publicNumberLookup" BOOLEAN NOT NULL DEFAULT false;
