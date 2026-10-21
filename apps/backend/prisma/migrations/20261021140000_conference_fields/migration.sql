-- Conference details for events (ticketing + call-for-papers).
--
-- All columns are nullable and every statement is guarded, so re-running is
-- harmless and pre-existing events simply have no conference details.

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ticketPrice" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "tracks" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "cfpDeadline" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "cfpUrl" TEXT;
