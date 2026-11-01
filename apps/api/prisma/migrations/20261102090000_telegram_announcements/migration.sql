-- CreateEnum
CREATE TYPE "TelegramDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "telegramNotify" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "telegramReachable" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "telegram_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TelegramDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telegram_deliveries_status_createdAt_idx" ON "telegram_deliveries"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_deliveries_notificationId_userId_key" ON "telegram_deliveries"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "telegram_deliveries" ADD CONSTRAINT "telegram_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_deliveries" ADD CONSTRAINT "telegram_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

