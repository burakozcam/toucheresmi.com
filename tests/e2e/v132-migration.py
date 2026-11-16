"""Real migration/backfill test in a separate, disposable database with minimal v131 ownership tables."""
from pathlib import Path
import subprocess,os,json
pg='/tmp/ks-v132-pg/usr/lib/postgresql/16/bin/'
env={**os.environ,'LD_LIBRARY_PATH':'/tmp/ks-v132-pg/usr/lib/x86_64-linux-gnu'}
args=['-h','127.0.0.1','-p','55442','-U','ks132']
subprocess.run([pg+'dropdb',*args,'--if-exists','ks_v132_migration'],env=env,check=True,stdout=subprocess.DEVNULL)
subprocess.run([pg+'createdb',*args,'ks_v132_migration'],env=env,check=True)
def sql(text,success=True):
 r=subprocess.run([pg+'psql',*args,'-d','ks_v132_migration','-v','ON_ERROR_STOP=1','-At'],input=text,text=True,capture_output=True,env=env)
 if success and r.returncode:raise RuntimeError(r.stderr)
 if not success:assert r.returncode!=0
 return r.stdout.strip()
sql('''CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN','DEALER','SCHOOL_ADMIN','STUDENT','PARENT');
CREATE TABLE "Dealer" (id text PRIMARY KEY,name text NOT NULL,phone text,email text,active boolean DEFAULT true,"createdAt" timestamp DEFAULT now(),"updatedAt" timestamp DEFAULT now());
CREATE TABLE "User" (id text PRIMARY KEY,"firstName" text,"lastName" text,role "Role","dealerId" text REFERENCES "Dealer"(id),"passwordHash" text,active boolean DEFAULT true);
CREATE TABLE "School" (id text PRIMARY KEY,name text,"dealerId" text REFERENCES "Dealer"(id),"createdByUserId" text REFERENCES "User"(id));
CREATE TABLE "AuditLog" (id text PRIMARY KEY,action text,summary text);
INSERT INTO "Dealer" (id,name) VALUES ('dealer-b','Sahte B');
INSERT INTO "User" (id,"firstName","lastName",role,"dealerId","passwordHash") VALUES ('old-a','Sahte','A','DEALER',NULL,'not-a-real-password'),('old-b','Sahte','B','DEALER','dealer-b','not-a-real-password'),('old-admin','Sahte','Admin','SUPER_ADMIN',NULL,'not-a-real-password');
INSERT INTO "School" VALUES ('owned-b','Sahte B kurumu','dealer-b','old-a'),('unassigned-a','Sahte A kurumu',NULL,'old-a'),('unassigned-b','Sahte B yeni',NULL,'old-b'),('admin-school','Sahte admin kurumu',NULL,'old-admin');
INSERT INTO "AuditLog" VALUES ('old-edit','RESULT_DATA_EDIT','{"changes":[{"field":"name","before":"Legacy QA","after":"Changed QA"}],"resultId":"r"}');''')
sql(Path('apps/api/prisma/migrations/20261116010000_dealer_security/migration.sql').read_text())
assert sql('SELECT "dealerId" FROM "School" WHERE id=\'owned-b\';')=='dealer-b'
assert sql('SELECT "dealerId" FROM "School" WHERE id=\'unassigned-a\';')=='legacy-dealer-old-a'
assert sql('SELECT "dealerId" FROM "School" WHERE id=\'unassigned-b\';')=='dealer-b'
assert sql('SELECT "dealerId" IS NULL FROM "School" WHERE id=\'admin-school\';')=='t'
assert sql('SELECT COUNT(*) FROM "School";')=='4'
assert sql('SELECT bool_and("canCreateSchool" AND "canEditSchool" AND "canEvaluate" AND "canDeleteResult" AND "canEditResult" AND "canReevaluate" AND "canExport" AND NOT "restrictedRegions" AND "dailyStudentLimit" IS NULL) FROM "Dealer";')=='t'
assert 'Legacy QA' not in sql('SELECT summary FROM "AuditLog";')
sql('UPDATE "School" SET "dealerId"=\'legacy-dealer-old-a\' WHERE id=\'owned-b\';',success=False)
assert sql('SELECT "dealerId" FROM "School" WHERE id=\'owned-b\';')=='dealer-b'
result={'passed':True,'preservedSchools':4,'ownedInstitutionsNotTransferred':True,'legacyUnassignedCreatorLinkBackfilled':True,'adminUnassignedRetained':True,'allPermissionsEnabled':True,'regionsFree':True,'quotaUnlimited':True,'immutableOwnerTrigger':True,'historicAuditPIIRedacted':True}
Path('test-results/v132/migration.json').write_text(json.dumps(result,indent=2));print(result)
