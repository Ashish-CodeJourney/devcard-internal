-- Platform link verification metadata.
--
-- Ownership verification ("verified") and existence checks ("checked_at") are
-- separate signals: OAuth proves the handle belongs to the user, whereas a
-- public-API existence check only proves the account exists.

ALTER TABLE "platform_links" ADD COLUMN "verification_method" TEXT;
ALTER TABLE "platform_links" ADD COLUMN "platform_user_id" TEXT;
ALTER TABLE "platform_links" ADD COLUMN "checked_at" TIMESTAMP(3);
