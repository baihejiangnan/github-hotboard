-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('free', 'premium');

-- CreateEnum
CREATE TYPE "GenerationMode" AS ENUM ('local', 'premium');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "membershipActivatedAt" TIMESTAMP(3),
ADD COLUMN     "membershipExpiresAt" TIMESTAMP(3),
ADD COLUMN     "membershipTier" "MembershipTier" NOT NULL DEFAULT 'free';

-- AlterTable
ALTER TABLE "VideoJob" ADD COLUMN     "generationMode" "GenerationMode",
ADD COLUMN     "speechProvider" TEXT,
ADD COLUMN     "videoProvider" TEXT;

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoMode" "GenerationMode" NOT NULL DEFAULT 'local',
    "videoProvider" TEXT NOT NULL DEFAULT 'local_template',
    "speechProvider" TEXT NOT NULL DEFAULT 'piper',
    "defaultVideoFormat" TEXT NOT NULL DEFAULT 'vertical_60',
    "promptTargetPlatform" TEXT NOT NULL DEFAULT 'generic',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApiCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "maskedPreview" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApiCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipCode" (
    "codeHash" TEXT NOT NULL,
    "codePreview" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedByUserId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "createdByAdminEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserApiCredential_userId_provider_key" ON "UserApiCredential"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipCode_codeHash_key" ON "MembershipCode"("codeHash");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApiCredential" ADD CONSTRAINT "UserApiCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCode" ADD CONSTRAINT "MembershipCode_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
