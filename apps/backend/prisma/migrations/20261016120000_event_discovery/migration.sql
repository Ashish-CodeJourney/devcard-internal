-- Event discovery + moderation.
--
-- Adds geo coordinates (for the map), an event kind, and a moderation status so
-- that submitted events stay invisible until an admin approves them.
--
-- NOTE: the existing `events` table uses camelCase column names (startDate,
-- organizerId, isPublic) — only createdAt is mapped to created_at — so the new
-- columns follow the same convention to match schema.prisma.
--
-- Guarded so re-running is harmless.

DO $$ BEGIN
  CREATE TYPE "EventKind" AS ENUM ('HACKATHON', 'MEETUP', 'CONFERENCE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "kind" "EventKind" NOT NULL DEFAULT 'HACKATHON';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "status" "EventStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "url" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- Pre-existing events predate the moderation flow.
UPDATE "events" SET "status" = 'APPROVED' WHERE "status" = 'PENDING' AND "created_at" < NOW();

CREATE INDEX IF NOT EXISTS "events_status_startDate_idx" ON "events"("status", "startDate");
CREATE INDEX IF NOT EXISTS "events_latitude_longitude_idx" ON "events"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "events_kind_idx" ON "events"("kind");
