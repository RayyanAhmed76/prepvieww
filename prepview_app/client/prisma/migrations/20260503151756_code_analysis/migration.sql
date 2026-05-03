/*
  Warnings:

  - You are about to drop the `CV` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InterviewSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CV" DROP CONSTRAINT "CV_userId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewSession" DROP CONSTRAINT "InterviewSession_userId_fkey";

-- DropTable
DROP TABLE "CV";

-- DropTable
DROP TABLE "InterviewSession";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password_reset_token" VARCHAR(128),
    "password_reset_expires" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cvs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personalInfo" JSONB NOT NULL,
    "summary" TEXT,
    "skills" JSONB NOT NULL,
    "projects" JSONB NOT NULL,
    "education" JSONB NOT NULL,
    "experience" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cvs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_sessions" (
    "session_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fieldid" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "interview_chunks" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" VARCHAR(10) NOT NULL,
    "nlp_full_json" JSONB,
    "transcript" TEXT,
    "speech_metrics" JSONB,
    "linguistic_metrics" JSONB,
    "phase1_score" DOUBLE PRECISION,
    "prosodic_confidence" DOUBLE PRECISION,
    "cv_full_json" JSONB,
    "head_movement" JSONB,
    "eye_gaze" JSONB,
    "facial_expression" JSONB,
    "cv_score" DOUBLE PRECISION,
    "original_technical_score" DOUBLE PRECISION,
    "score_with_penalties" DOUBLE PRECISION,
    "proctoring_results" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_reports" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nlp_aggregate" JSONB NOT NULL,
    "cv_aggregate" JSONB NOT NULL,
    "code_aggregate" JSONB,
    "ai_feedback" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "final_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cvs_userId_key" ON "cvs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_sessions_session_id_key" ON "interview_sessions"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "final_reports_session_id_key" ON "final_reports"("session_id");

-- AddForeignKey
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_chunks" ADD CONSTRAINT "interview_chunks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reports" ADD CONSTRAINT "final_reports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reports" ADD CONSTRAINT "final_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
