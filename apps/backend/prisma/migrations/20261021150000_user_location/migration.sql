-- Optional free-text location on the user profile (city, "Remote", …).
--
-- Nullable and guarded, so re-running is harmless and existing users
-- simply have no location set.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" TEXT;
