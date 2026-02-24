-- CreateTable
CREATE TABLE "sso_aipn_items" (
    "id" SERIAL NOT NULL,
    "billing_group" VARCHAR(5) NOT NULL,
    "code" INTEGER NOT NULL,
    "unit" VARCHAR(100) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "rate2" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "date_revised" DATE NOT NULL,
    "date_effective" DATE NOT NULL,
    "date_expiry" DATE NOT NULL,
    "last_updated" DATE NOT NULL,
    "condition" VARCHAR(20) NOT NULL DEFAULT 'SSOCAC',
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_aipn_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sso_aipn_items_code_key" ON "sso_aipn_items"("code");

-- CreateIndex
CREATE INDEX "idx_sso_aipn_items_billing_group" ON "sso_aipn_items"("billing_group");

-- CreateIndex
CREATE INDEX "idx_sso_aipn_items_rate" ON "sso_aipn_items"("rate");
