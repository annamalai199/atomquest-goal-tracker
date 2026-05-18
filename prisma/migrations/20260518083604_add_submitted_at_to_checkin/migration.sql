/*
  Warnings:

  - You are about to drop the `EscalationLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EscalationRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "EscalationLog";

-- DropTable
DROP TABLE "EscalationRule";
