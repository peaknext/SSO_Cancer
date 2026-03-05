-- DropIndex
DROP INDEX "sso_aipn_items_code_key";

-- CreateIndex
CREATE INDEX "idx_sso_aipn_items_code" ON "sso_aipn_items"("code");

-- CreateIndex
CREATE INDEX "idx_sso_aipn_items_date_range" ON "sso_aipn_items"("date_effective", "date_expiry");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sso_aipn_code_date_effective" ON "sso_aipn_items"("code", "date_effective");
