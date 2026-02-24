-- CreateTable
CREATE TABLE "sso_protocol_drugs" (
    "id" SERIAL NOT NULL,
    "protocol_code" VARCHAR(10) NOT NULL,
    "formula_category" VARCHAR(30) NOT NULL DEFAULT '',
    "aipn_code" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_protocol_drugs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_sso_protocol_drugs_protocol_code" ON "sso_protocol_drugs"("protocol_code");

-- CreateIndex
CREATE INDEX "idx_sso_protocol_drugs_aipn_code" ON "sso_protocol_drugs"("aipn_code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sso_protocol_drug_code" ON "sso_protocol_drugs"("protocol_code", "aipn_code");
