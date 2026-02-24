-- AlterTable
ALTER TABLE "patient_visits" ADD COLUMN     "case_id" INTEGER,
ADD COLUMN     "patient_id" INTEGER;

-- CreateTable
CREATE TABLE "patients" (
    "id" SERIAL NOT NULL,
    "hn" VARCHAR(20) NOT NULL,
    "citizen_id" VARCHAR(13) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_cases" (
    "id" SERIAL NOT NULL,
    "case_number" VARCHAR(50) NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "protocol_id" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_by_user_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_billing_claims" (
    "id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "round_number" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "decided_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_by_user_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_billing_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_hn_key" ON "patients"("hn");

-- CreateIndex
CREATE UNIQUE INDEX "patients_citizen_id_key" ON "patients"("citizen_id");

-- CreateIndex
CREATE INDEX "idx_patients_citizen_id" ON "patients"("citizen_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_cases_case_number_key" ON "patient_cases"("case_number");

-- CreateIndex
CREATE INDEX "idx_patient_cases_patient_id" ON "patient_cases"("patient_id");

-- CreateIndex
CREATE INDEX "idx_patient_cases_protocol_id" ON "patient_cases"("protocol_id");

-- CreateIndex
CREATE INDEX "idx_patient_cases_status" ON "patient_cases"("status");

-- CreateIndex
CREATE INDEX "idx_visit_billing_claims_visit_id" ON "visit_billing_claims"("visit_id");

-- CreateIndex
CREATE INDEX "idx_visit_billing_claims_status" ON "visit_billing_claims"("status");

-- CreateIndex
CREATE UNIQUE INDEX "visit_billing_claims_visit_id_round_number_key" ON "visit_billing_claims"("visit_id", "round_number");

-- CreateIndex
CREATE INDEX "idx_patient_visits_patient_id" ON "patient_visits"("patient_id");

-- CreateIndex
CREATE INDEX "idx_patient_visits_case_id" ON "patient_visits"("case_id");

-- AddForeignKey
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "patient_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_cases" ADD CONSTRAINT "patient_cases_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_cases" ADD CONSTRAINT "patient_cases_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocol_names"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_cases" ADD CONSTRAINT "patient_cases_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_billing_claims" ADD CONSTRAINT "visit_billing_claims_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "patient_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_billing_claims" ADD CONSTRAINT "visit_billing_claims_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
