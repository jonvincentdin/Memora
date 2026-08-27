-- CreateEnum
CREATE TYPE "Appearance" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NoteSourceType" AS ENUM ('PDF', 'MARKDOWN', 'TXT', 'DOCX', 'GOOGLE_DOCS', 'NOTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "ReviewerStyle" AS ENUM ('COMPLETE', 'QUICK', 'EXAM', 'CONCEPT', 'DEFINITION', 'COMPARISON', 'CUSTOM');

-- CreateEnum
CREATE TYPE "QuizMode" AS ENUM ('QUIZ', 'PRACTICE_EXAM', 'MOCK_EXAM', 'TIMED_EXAM', 'MASTERY_TEST');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'NORMAL', 'HARD', 'MIXED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('NOTE', 'REVIEWER', 'QUIZ');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('VIEW', 'EDIT', 'OWNER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appearance" "Appearance" NOT NULL DEFAULT 'SYSTEM',
    "defaultQuestionCount" INTEGER NOT NULL DEFAULT 10,
    "defaultDifficulty" "Difficulty" NOT NULL DEFAULT 'MIXED',
    "defaultQuizMode" "QuizMode" NOT NULL DEFAULT 'QUIZ',
    "showExplanations" BOOLEAN NOT NULL DEFAULT true,
    "autoSave" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "originalFilename" TEXT,
    "sourceType" "NoteSourceType" NOT NULL,
    "sourceUrl" TEXT,
    "content" BYTEA NOT NULL,
    "fileExtension" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewers" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "style" "ReviewerStyle" NOT NULL DEFAULT 'COMPLETE',
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewer_notes" (
    "reviewerId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,

    CONSTRAINT "reviewer_notes_pkey" PRIMARY KEY ("reviewerId","noteId")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mode" "QuizMode" NOT NULL DEFAULT 'QUIZ',
    "configuration" JSONB NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_reviewers" (
    "quizId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,

    CONSTRAINT "quiz_reviewers_pkey" PRIMARY KEY ("quizId","reviewerId")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_shares" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "Permission" NOT NULL DEFAULT 'VIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_collections" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_collection_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_feedback" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "resourceType" "ResourceType",
    "resourceId" TEXT,
    "authorName" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE INDEX "notes_ownerId_idx" ON "notes"("ownerId");

-- CreateIndex
CREATE INDEX "reviewers_ownerId_idx" ON "reviewers"("ownerId");

-- CreateIndex
CREATE INDEX "quizzes_ownerId_idx" ON "quizzes"("ownerId");

-- CreateIndex
CREATE INDEX "quiz_attempts_userId_idx" ON "quiz_attempts"("userId");

-- CreateIndex
CREATE INDEX "quiz_attempts_quizId_idx" ON "quiz_attempts"("quizId");

-- CreateIndex
CREATE INDEX "resource_shares_userId_idx" ON "resource_shares"("userId");

-- CreateIndex
CREATE INDEX "resource_shares_resourceId_resourceType_idx" ON "resource_shares"("resourceId", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "resource_shares_resourceId_resourceType_userId_key" ON "resource_shares"("resourceId", "resourceType", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "share_collections_slug_key" ON "share_collections"("slug");

-- CreateIndex
CREATE INDEX "share_collections_ownerId_idx" ON "share_collections"("ownerId");

-- CreateIndex
CREATE INDEX "share_collection_items_collectionId_idx" ON "share_collection_items"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "share_collection_items_collectionId_resourceType_resourceId_key" ON "share_collection_items"("collectionId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "share_feedback_collectionId_idx" ON "share_feedback"("collectionId");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewers" ADD CONSTRAINT "reviewers_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_notes" ADD CONSTRAINT "reviewer_notes_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "reviewers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewer_notes" ADD CONSTRAINT "reviewer_notes_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_reviewers" ADD CONSTRAINT "quiz_reviewers_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_reviewers" ADD CONSTRAINT "quiz_reviewers_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "reviewers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_shares" ADD CONSTRAINT "resource_shares_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_shares" ADD CONSTRAINT "resource_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_collections" ADD CONSTRAINT "share_collections_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_collection_items" ADD CONSTRAINT "share_collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "share_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_feedback" ADD CONSTRAINT "share_feedback_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "share_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
