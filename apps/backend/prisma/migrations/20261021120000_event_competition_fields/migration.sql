-- Competition details for events (prizes, team rules, organiser contact).
--
-- All columns are nullable and every statement is guarded, so re-running is
-- harmless and pre-existing events simply have no competition details.

DO $$ BEGIN
  CREATE TYPE "EventMode" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "prizePool" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "registrationDeadline" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "teamSizeMin" INTEGER;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "teamSizeMax" INTEGER;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "mode" "EventMode";
