-- AlterTable
ALTER TABLE "patient_visits" ADD COLUMN     "confirmed_at" TIMESTAMPTZ(6),
ADD COLUMN     "confirmed_by_user_id" INTEGER,
ADD COLUMN     "confirmed_protocol_id" INTEGER,
ADD COLUMN     "confirmed_regimen_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_patient_visits_confirmed_protocol" ON "patient_visits"("confirmed_protocol_id");

-- CreateIndex
CREATE INDEX "idx_patient_visits_confirmed_by" ON "patient_visits"("confirmed_by_user_id");

-- AddForeignKey
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_confirmed_protocol_id_fkey" FOREIGN KEY ("confirmed_protocol_id") REFERENCES "protocol_names"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_confirmed_regimen_id_fkey" FOREIGN KEY ("confirmed_regimen_id") REFERENCES "regimens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
