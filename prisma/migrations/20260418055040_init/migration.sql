-- CreateEnum
CREATE TYPE "QueryRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "VideoJobStatus" AS ENUM ('pending', 'rendering', 'completed', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "SavedQuery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rankingMode" TEXT NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "keyword" TEXT,
    "language" TEXT,
    "topic" TEXT,
    "limit" INTEGER NOT NULL,
    "channelPreset" JSONB NOT NULL,
    "scheduleCron" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedQueryId" TEXT,
    "inputJson" JSONB NOT NULL,
    "status" "QueryRunStatus" NOT NULL DEFAULT 'pending',
    "partial" BOOLEAN NOT NULL DEFAULT false,
    "quotaSnapshot" JSONB,
    "error" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "QueryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "description" TEXT,
    "topics" JSONB NOT NULL,
    "language" TEXT,
    "defaultBranch" TEXT,
    "totalStars" INTEGER NOT NULL,
    "fork" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "pushedAt" TIMESTAMP(3),
    "metadataSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoStarEvent" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "starredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepoStarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryRunResult" (
    "id" TEXT NOT NULL,
    "queryRunId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "totalStars" INTEGER NOT NULL,
    "starGain" INTEGER,
    "starsPerDay" DOUBLE PRECISION,
    "matchedFields" JSONB NOT NULL,

    CONSTRAINT "QueryRunResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "queryRunId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "exportPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "queryRunId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" "VideoJobStatus" NOT NULL DEFAULT 'pending',
    "scriptJson" JSONB NOT NULL,
    "audioPath" TEXT,
    "captionJson" JSONB,
    "videoPath" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubId_key" ON "Repository"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "RepoStarEvent_repositoryId_starredAt_key" ON "RepoStarEvent"("repositoryId", "starredAt");

-- CreateIndex
CREATE UNIQUE INDEX "QueryRunResult_queryRunId_repositoryId_key" ON "QueryRunResult"("queryRunId", "repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "QueryRunResult_queryRunId_rank_key" ON "QueryRunResult"("queryRunId", "rank");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedQuery" ADD CONSTRAINT "SavedQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryRun" ADD CONSTRAINT "QueryRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryRun" ADD CONSTRAINT "QueryRun_savedQueryId_fkey" FOREIGN KEY ("savedQueryId") REFERENCES "SavedQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoStarEvent" ADD CONSTRAINT "RepoStarEvent_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryRunResult" ADD CONSTRAINT "QueryRunResult_queryRunId_fkey" FOREIGN KEY ("queryRunId") REFERENCES "QueryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryRunResult" ADD CONSTRAINT "QueryRunResult_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareDraft" ADD CONSTRAINT "ShareDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareDraft" ADD CONSTRAINT "ShareDraft_queryRunId_fkey" FOREIGN KEY ("queryRunId") REFERENCES "QueryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoJob" ADD CONSTRAINT "VideoJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoJob" ADD CONSTRAINT "VideoJob_queryRunId_fkey" FOREIGN KEY ("queryRunId") REFERENCES "QueryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
