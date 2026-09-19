ALTER TABLE "Interview"
ADD COLUMN "scorecard" JSONB,
ADD COLUMN "scoreTotal" INTEGER,
ADD COLUMN "scorePossible" INTEGER,
ADD COLUMN "completedAt" TIMESTAMP(3);
