-- CreateTable
CREATE TABLE "accounting_integrations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'bexio',
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "external_tenant_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "last_sync_at" TIMESTAMP(3),
    "sync_error" TEXT,
    "synced_invoices" INTEGER NOT NULL DEFAULT 0,
    "synced_expenses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounting_integrations_company_id_idx" ON "accounting_integrations"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_integrations_company_id_provider_key" ON "accounting_integrations"("company_id", "provider");

-- AddForeignKey
ALTER TABLE "accounting_integrations" ADD CONSTRAINT "accounting_integrations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
