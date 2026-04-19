-- CreateEnum
CREATE TYPE "QueryRunTriggerType" AS ENUM ('manual', 'scheduled', 'retry');

-- CreateEnum
CREATE TYPE "DailyDigestStatus" AS ENUM ('pending', 'sent', 'skipped', 'failed');

-- AlterTable
ALTER TABLE "QueryRun" ADD COLUMN     "attemptNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "dailyDigestId" TEXT,
ADD COLUMN     "retryOfRunId" TEXT,
ADD COLUMN     "triggerType" "QueryRunTriggerType" NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "SavedQuery" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastRunError" TEXT,
ADD COLUMN     "lastRunQueryRunId" TEXT,
ADD COLUMN     "lastRunResultCount" INTEGER,
ADD COLUMN     "lastRunStatus" TEXT,
ADD COLUMN     "nextRunAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DailyDigest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "digestDate" TIMESTAMP(3) NOT NULL,
    "status" "DailyDigestStatus" NOT NULL DEFAULT 'pending',
    "transport" TEXT,
    "externalId" TEXT,
    "summaryJson" JSONB,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDigest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyDigest_userId_digestDate_key" ON "DailyDigest"("userId", "digestDate");

-- AddForeignKey
ALTER TABLE "QueryRun" ADD CONSTRAINT "QueryRun_dailyDigestId_fkey" FOREIGN KEY ("dailyDigestId") REFERENCES "DailyDigest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDigest" ADD CONSTRAINT "DailyDigest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
