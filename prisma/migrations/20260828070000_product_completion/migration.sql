-- CreateEnum
CREATE TYPE "AccountTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI');

-- CreateEnum
CREATE TYPE "TestMode" AS ENUM ('REVIEW', 'EXAM');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- DropIndex
DROP INDEX "notes_ownerId_idx";

-- DropIndex
DROP INDEX "reviewers_ownerId_idx";

-- DropIndex
DROP INDEX "quizzes_ownerId_idx";

-- DropIndex
DROP INDEX "quiz_attempts_userId_idx";

-- DropIndex
DROP INDEX "quiz_attempts_quizId_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- Existing password-authenticated accounts predate verification emails.
UPDATE "users" SET "emailVerified" = CURRENT_TIMESTAMP WHERE "emailVerified" IS NULL;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceExternalId" TEXT,
ADD COLUMN     "sourceSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reviewers" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quiz_attempts" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "flagged" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "questionOrder" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "testMode" "TestMode" NOT NULL DEFAULT 'EXAM',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "score" SET DEFAULT 0,
ALTER COLUMN "answers" SET DEFAULT '{}';

-- Attempts created before durable drafts were always final submissions.
UPDATE "quiz_attempts"
SET "status" = CASE WHEN "completedAt" IS NOT NULL THEN 'COMPLETED'::"AttemptStatus" ELSE 'EXPIRED'::"AttemptStatus" END;
ALTER TABLE "quiz_attempts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "share_collections" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" BYTEA,
ALTER COLUMN "isPublished" SET DEFAULT false;

-- CreateTable
CREATE TABLE "account_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AccountTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "apiKey" BYTEA NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "sourceText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "lastGrade" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcard_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewed" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_tags" (
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "note_tags_pkey" PRIMARY KEY ("noteId","tagId")
);

-- CreateTable
CREATE TABLE "reviewer_tags" (
    "reviewerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "reviewer_tags_pkey" PRIMARY KEY ("reviewerId","tagId")
);

-- CreateTable
CREATE TABLE "quiz_tags" (
    "quizId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "quiz_tags_pkey" PRIMARY KEY ("quizId","tagId")
);

-- CreateTable
CREATE TABLE "resource_revisions" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_invites" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "permission" "Permission" NOT NULL DEFAULT 'VIEW',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_tokens_tokenHash_key" ON "account_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "account_tokens_userId_type_idx" ON "account_tokens"("userId", "type");

-- CreateIndex
CREATE INDEX "account_tokens_expiresAt_idx" ON "account_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "ai_connections_userId_idx" ON "ai_connections"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_connections_userId_provider_key" ON "ai_connections"("userId", "provider");

-- CreateIndex
CREATE INDEX "flashcards_ownerId_updatedAt_idx" ON "flashcards"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "flashcards_reviewerId_idx" ON "flashcards"("reviewerId");

-- CreateIndex
CREATE INDEX "flashcard_progress_userId_dueAt_idx" ON "flashcard_progress"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "flashcard_progress_userId_flashcardId_key" ON "flashcard_progress"("userId", "flashcardId");

-- CreateIndex
CREATE INDEX "flashcard_reviews_userId_reviewedAt_idx" ON "flashcard_reviews"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "flashcard_reviews_flashcardId_idx" ON "flashcard_reviews"("flashcardId");

-- CreateIndex
CREATE INDEX "study_sessions_userId_startedAt_idx" ON "study_sessions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "tags_ownerId_idx" ON "tags"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_ownerId_name_key" ON "tags"("ownerId", "name");

-- CreateIndex
CREATE INDEX "resource_revisions_ownerId_resourceType_resourceId_createdA_idx" ON "resource_revisions"("ownerId", "resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

CREATE UNIQUE INDEX "resource_invites_resourceId_resourceType_email_key" ON "resource_invites"("resourceId", "resourceType", "email");
CREATE INDEX "resource_invites_email_expiresAt_idx" ON "resource_invites"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "notes_ownerId_archivedAt_updatedAt_idx" ON "notes"("ownerId", "archivedAt", "updatedAt");

-- Connected imports can refresh the same external document without creating duplicates.
CREATE UNIQUE INDEX "notes_ownerId_sourceType_sourceExternalId_key" ON "notes"("ownerId", "sourceType", "sourceExternalId");

-- CreateIndex
CREATE INDEX "reviewers_ownerId_archivedAt_updatedAt_idx" ON "reviewers"("ownerId", "archivedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "quizzes_ownerId_archivedAt_updatedAt_idx" ON "quizzes"("ownerId", "archivedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "quiz_attempts_userId_status_startedAt_idx" ON "quiz_attempts"("userId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "quiz_attempts_quizId_userId_status_idx" ON "quiz_attempts"("quizId", "userId", "status");

-- Prevent duplicate active attempts caused by double-clicks or retried requests.
CREATE UNIQUE INDEX "quiz_attempts_one_active_per_mode_idx"
ON "quiz_attempts" ("quizId", "userId", "testMode")
WHERE "status" = 'IN_PROGRESS';

-- AddForeignKey
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_connections" ADD CONSTRAINT "ai_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "reviewers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_progress" ADD CONSTRAINT "flashcard_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_progress" ADD CONSTRAINT "flashcard_progress_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_tags" ADD CONSTRAINT "reviewer_tags_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "reviewers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_tags" ADD CONSTRAINT "reviewer_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_tags" ADD CONSTRAINT "quiz_tags_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_tags" ADD CONSTRAINT "quiz_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_revisions" ADD CONSTRAINT "resource_revisions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_invites" ADD CONSTRAINT "resource_invites_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
