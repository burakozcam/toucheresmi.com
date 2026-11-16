BEGIN;
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "recoveryHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "twoFactorCounter" BIGINT NOT NULL DEFAULT -1,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorPending" TEXT,
ADD COLUMN     "twoFactorPendingAt" TIMESTAMP(3),
ADD COLUMN     "twoFactorSecret" TEXT;

-- AlterTable
ALTER TABLE "Dealer" ADD COLUMN     "canCreateSchool" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canDeleteResult" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canEditResult" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canEditSchool" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canEvaluate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canExport" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canReevaluate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dailyStudentLimit" INTEGER,
ADD COLUMN     "restrictedRegions" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialVersion" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "mfaVerifiedAt" TIMESTAMP(3),
    "actorAdminId" TEXT,
    "trustedDeviceId" TEXT,
    "parentSessionId" TEXT,
    "label" TEXT NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "credentialVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "label" TEXT NOT NULL,

    CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerRegion" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "publisherId" TEXT,
    "city" TEXT,
    "district" TEXT,

    CONSTRAINT "DealerRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerDailyUsage" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "students" INTEGER NOT NULL DEFAULT 0,
    "evaluations" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DealerDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerQuotaStudent" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentHash" TEXT NOT NULL,

    CONSTRAINT "DealerQuotaStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerActivity" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "actorAdminId" TEXT,
    "schoolId" TEXT,
    "keyId" TEXT,
    "publisherId" TEXT,
    "city" TEXT,
    "district" TEXT,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "resultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolLocationRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "previousCity" TEXT,
    "previousDistrict" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolLocationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityRateBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityRateBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AuthSession_userId_revokedAt_expiresAt_idx" ON "AuthSession"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_parentSessionId_idx" ON "AuthSession"("parentSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustedDevice_tokenHash_key" ON "TrustedDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "TrustedDevice_userId_revokedAt_idx" ON "TrustedDevice"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "DealerRegion_dealerId_publisherId_idx" ON "DealerRegion"("dealerId", "publisherId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerDailyUsage_dealerId_day_key" ON "DealerDailyUsage"("dealerId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DealerQuotaStudent_dealerId_day_keyId_schoolId_studentHash_key" ON "DealerQuotaStudent"("dealerId", "day", "keyId", "schoolId", "studentHash");

-- CreateIndex
CREATE INDEX "DealerActivity_dealerId_createdAt_idx" ON "DealerActivity"("dealerId", "createdAt");

-- CreateIndex
CREATE INDEX "DealerActivity_schoolId_createdAt_idx" ON "DealerActivity"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "DealerActivity_publisherId_createdAt_idx" ON "DealerActivity"("publisherId", "createdAt");

-- CreateIndex
CREATE INDEX "DealerActivity_action_createdAt_idx" ON "DealerActivity"("action", "createdAt");

-- CreateIndex
CREATE INDEX "SchoolLocationRequest_status_createdAt_idx" ON "SchoolLocationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityRateBucket_resetAt_idx" ON "SecurityRateBucket"("resetAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerRegion" ADD CONSTRAINT "DealerRegion_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerDailyUsage" ADD CONSTRAINT "DealerDailyUsage_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerQuotaStudent" ADD CONSTRAINT "DealerQuotaStudent_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Preserve all existing owned schools. Only fill the pre-existing creator relationship for unassigned dealer accounts.
INSERT INTO "Dealer" (id,name,"active","createdAt","updatedAt")
SELECT 'legacy-dealer-' || u.id, concat_ws(' ',u."firstName",u."lastName"),true,NOW(),NOW()
FROM "User" u WHERE u.role='DEALER' AND u."dealerId" IS NULL;
UPDATE "User" SET "dealerId"='legacy-dealer-' || id WHERE role='DEALER' AND "dealerId" IS NULL;
UPDATE "School" s SET "dealerId"=u."dealerId" FROM "User" u
WHERE s."createdByUserId"=u.id AND s."dealerId" IS NULL AND u.role='DEALER';

-- No institution transfers, including direct SQL outside application routes.
CREATE FUNCTION ks_school_owner_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."dealerId" IS DISTINCT FROM OLD."dealerId" THEN
  RAISE EXCEPTION 'School dealer ownership cannot be changed' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER ks_school_owner_immutable BEFORE UPDATE OF "dealerId" ON "School"
FOR EACH ROW EXECUTE FUNCTION ks_school_owner_immutable();

ALTER TABLE "Dealer" ADD CONSTRAINT ks_daily_quota_nonnegative CHECK ("dailyStudentLimit" IS NULL OR "dailyStudentLimit">=0);
ALTER TABLE "DealerRegion" ADD CONSTRAINT ks_region_district_requires_city CHECK (district IS NULL OR city IS NOT NULL);
ALTER TABLE "DealerDailyUsage" ADD CONSTRAINT ks_usage_nonnegative CHECK (students>=0 AND evaluations>=0);

-- Remove historic edit payload values from audit logs; do not touch exam data or revisions.
DO $$
DECLARE item RECORD; payload jsonb;
BEGIN
 FOR item IN SELECT id,summary FROM "AuditLog" WHERE action='RESULT_DATA_EDIT' AND summary IS NOT NULL LOOP
  BEGIN
   payload:=item.summary::jsonb;
   UPDATE "AuditLog" SET summary=jsonb_build_object('changeCount',COALESCE(jsonb_array_length(payload->'changes'),0),'resultId',payload->>'resultId','redacted',true)::text WHERE id=item.id;
  EXCEPTION WHEN OTHERS THEN
   UPDATE "AuditLog" SET summary='Sonuç düzenleme kaydı: eski ayrıntılar kişisel veri minimizasyonu için kaldırıldı.' WHERE id=item.id;
  END;
 END LOOP;
END;
$$;

CREATE FUNCTION ks_revoke_user_security() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."passwordHash" IS DISTINCT FROM OLD."passwordHash" OR NEW.role IS DISTINCT FROM OLD.role OR (OLD.active AND NOT NEW.active) THEN
  UPDATE "AuthSession" SET "revokedAt"=NOW() WHERE "userId"=NEW.id AND "revokedAt" IS NULL;
  UPDATE "TrustedDevice" SET "revokedAt"=NOW() WHERE "userId"=NEW.id AND "revokedAt" IS NULL;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER ks_revoke_user_security AFTER UPDATE OF "passwordHash",role,active ON "User" FOR EACH ROW EXECUTE FUNCTION ks_revoke_user_security();
CREATE FUNCTION ks_revoke_inactive_dealer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.active AND NOT NEW.active THEN
  UPDATE "AuthSession" SET "revokedAt"=NOW() WHERE "userId" IN (SELECT id FROM "User" WHERE "dealerId"=NEW.id AND role='DEALER') AND "revokedAt" IS NULL;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER ks_revoke_inactive_dealer AFTER UPDATE OF active ON "Dealer" FOR EACH ROW EXECUTE FUNCTION ks_revoke_inactive_dealer();

CREATE TABLE "PublicResultCode" (
 "codeHash" TEXT NOT NULL,
 "schoolId" TEXT NOT NULL,
 "keyId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PublicResultCode_pkey" PRIMARY KEY ("codeHash")
);
CREATE INDEX "PublicResultCode_schoolId_keyId_idx" ON "PublicResultCode"("schoolId","keyId");

COMMIT;
