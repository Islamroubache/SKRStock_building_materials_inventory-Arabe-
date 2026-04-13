-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "customerAI" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "customerNIF" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "customerNIS" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "customerRC" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "customerAI" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerNIF" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerNIS" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerRC" TEXT;
