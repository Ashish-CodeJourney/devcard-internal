-- Platform link verification metadata.
--
-- Ownership verification ("verified") and existence checks ("checked_at") are
-- separate signals: OAuth proves the handle belongs to the user, whereas a
-- public-API existence check only proves the account exists.
--
-- Written with IF NOT EXISTS so re-running is harmless if the columns were ever
-- added out-of-band.

ALTER TABLE "platform_links" ADD COLUMN IF NOT EXISTS "verification_method" TEXT;
ALTER TABLE "platform_links" ADD COLUMN IF NOT EXISTS "platform_user_id" TEXT;
ALTER TABLE "platform_links" ADD COLUMN IF NOT EXISTS "checked_at" TIMESTAMP(3);
