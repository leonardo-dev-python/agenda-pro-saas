ALTER TABLE "Appointment"
ADD COLUMN "googleCalendarEventId" TEXT,
ADD COLUMN "googleSyncStatus" TEXT NOT NULL DEFAULT 'not_configured',
ADD COLUMN "googleSyncError" TEXT,
ADD COLUMN "googleSyncedAt" TIMESTAMP(3),
ADD COLUMN "googleTargetCalendarId" TEXT;
