-- Event discovery + moderation.
--
-- Adds geo coordinates (for the map), an event kind, and a moderation status so
-- that submitted events stay invisible until an admin approves them.
--
-- Existing rows predate moderation, so they are backfilled to APPROVED rather
-- than silently disappearing from listings.

CREATE TYPE "EventKind" AS ENUM ('HACKATHON', 'MEETUP', 'CONFERENCE', 'OTHER');
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "kind" "EventKind" NOT NULL DEFAULT 'HACKATHON';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "status" "EventStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "url" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "reviewed_by_id" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

-- Pre-existing events predate the moderation flow.
UPDATE "events" SET "status" = 'APPROVED' WHERE "status" = 'PENDING' AND "created_at" < NOW();

CREATE INDEX IF NOT EXISTS "events_status_start_date_idx" ON "events"("status", "start_date");
CREATE INDEX IF NOT EXISTS "events_latitude_longitude_idx" ON "events"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "events_kind_idx" ON "events"("kind");
