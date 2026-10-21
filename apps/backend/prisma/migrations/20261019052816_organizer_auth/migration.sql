-- Organizer auth (organiser profiles).
--
-- Reconstructed from the organiser-auth branch schema to match the objects
-- already present in production. Every statement is guarded so re-running
-- against a database that already has these objects is a harmless no-op.

DO $$ BEGIN
  CREATE TYPE "OrganizerType" AS ENUM ('COMPANY', 'STUDENT_CLUB', 'COMMUNITY', 'NONPROFIT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OrganizerStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "organizer_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "type" "OrganizerType" NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "logo_url" TEXT,
    "phone_number" TEXT,
    "city" TEXT,
    "country" TEXT,
    "status" "OrganizerStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "organizer_profiles_username_key" ON "organizer_profiles"("username");

CREATE UNIQUE INDEX IF NOT EXISTS "organizer_profiles_email_key" ON "organizer_profiles"("email");
