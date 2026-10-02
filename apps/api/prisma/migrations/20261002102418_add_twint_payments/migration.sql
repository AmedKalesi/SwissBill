-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "twint_paid_at" TIMESTAMP(3),
ADD COLUMN     "twint_payment_link" TEXT,
ADD COLUMN     "twint_status" TEXT NOT NULL DEFAULT 'none';
