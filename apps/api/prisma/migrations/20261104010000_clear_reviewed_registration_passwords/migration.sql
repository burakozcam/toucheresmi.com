UPDATE "RegistrationRequest"
SET "passwordHash" = NULL
WHERE "status" <> 'PENDING';

ALTER TABLE "RegistrationRequest"
ALTER COLUMN "passwordHash" DROP NOT NULL;
