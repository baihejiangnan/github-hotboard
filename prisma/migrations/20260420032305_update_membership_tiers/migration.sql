/*
  Warnings:

  - The values [premium] on the enum `MembershipTier` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MembershipTier_new" AS ENUM ('free', 'plus', 'god');
ALTER TABLE "User" ALTER COLUMN "membershipTier" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "membershipTier" TYPE "MembershipTier_new" USING ("membershipTier"::text::"MembershipTier_new");
ALTER TYPE "MembershipTier" RENAME TO "MembershipTier_old";
ALTER TYPE "MembershipTier_new" RENAME TO "MembershipTier";
DROP TYPE "MembershipTier_old";
ALTER TABLE "User" ALTER COLUMN "membershipTier" SET DEFAULT 'free';
COMMIT;
