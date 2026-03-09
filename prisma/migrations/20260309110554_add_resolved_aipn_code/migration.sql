-- AlterTable
ALTER TABLE "visit_medications" ADD COLUMN     "resolved_aipn_code" INTEGER;

-- CreateIndex
CREATE INDEX "idx_visit_medications_aipn_code" ON "visit_medications"("resolved_aipn_code");
