-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "signature_data" TEXT,
ADD COLUMN     "signed_at" TIMESTAMP(3),
ADD COLUMN     "signed_by_name" TEXT,
ADD COLUMN     "signed_ip" TEXT;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "signature_data" TEXT,
ADD COLUMN     "signed_at" TIMESTAMP(3),
ADD COLUMN     "signed_by_name" TEXT,
ADD COLUMN     "signed_ip" TEXT;
