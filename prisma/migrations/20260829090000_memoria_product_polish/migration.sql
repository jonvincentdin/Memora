ALTER TABLE "users"
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Existing accounts have already completed the legacy first-run experience.
UPDATE "users" SET "onboardingCompletedAt" = CURRENT_TIMESTAMP;

CREATE TABLE "active_sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userAgent" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "active_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "share_collection_members" (
  "id" TEXT NOT NULL,
  "collectionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "share_collection_members_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "share_feedback"
  ADD COLUMN "authorUserId" TEXT,
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "feedback_reports" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "active_sessions_userId_lastSeenAt_idx" ON "active_sessions"("userId", "lastSeenAt");
CREATE UNIQUE INDEX "share_collection_members_collectionId_userId_key" ON "share_collection_members"("collectionId", "userId");
CREATE INDEX "share_collection_members_userId_createdAt_idx" ON "share_collection_members"("userId", "createdAt");
CREATE INDEX "share_feedback_parentId_createdAt_idx" ON "share_feedback"("parentId", "createdAt");
CREATE INDEX "share_feedback_authorUserId_idx" ON "share_feedback"("authorUserId");
CREATE UNIQUE INDEX "feedback_reports_feedbackId_userId_key" ON "feedback_reports"("feedbackId", "userId");
CREATE INDEX "feedback_reports_userId_createdAt_idx" ON "feedback_reports"("userId", "createdAt");

ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_collection_members" ADD CONSTRAINT "share_collection_members_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "share_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_collection_members" ADD CONSTRAINT "share_collection_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_feedback" ADD CONSTRAINT "share_feedback_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "share_feedback" ADD CONSTRAINT "share_feedback_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "share_feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "share_feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
