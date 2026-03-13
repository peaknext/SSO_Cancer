-- AlterTable: Add IPD (inpatient) fields to patient_visits
ALTER TABLE "patient_visits" ADD COLUMN "an" VARCHAR(30),
ADD COLUMN "discharge_date" DATE;

-- CreateIndex: Unique index on admission number
CREATE UNIQUE INDEX "patient_visits_an_key" ON "patient_visits"("an");

-- CreateIndex: Index on visit_type for OPD/IPD filtering
CREATE INDEX "idx_patient_visits_visit_type" ON "patient_visits"("visit_type");

-- Backfill: Set all existing visits to OPD (visit_type='1')
UPDATE "patient_visits" SET "visit_type" = '1' WHERE "visit_type" IS NULL;
