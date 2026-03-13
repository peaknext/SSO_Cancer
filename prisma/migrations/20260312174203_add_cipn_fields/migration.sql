-- AlterTable
ALTER TABLE "billing_export_batches" ADD COLUMN     "export_type" VARCHAR(10) NOT NULL DEFAULT 'SSOP';

-- AlterTable
ALTER TABLE "patient_visits" ADD COLUMN     "adj_rw" DECIMAL(8,4),
ADD COLUMN     "admission_source" VARCHAR(2),
ADD COLUMN     "admission_type" VARCHAR(2),
ADD COLUMN     "admit_time" VARCHAR(8),
ADD COLUMN     "auth_code" VARCHAR(30),
ADD COLUMN     "auth_date" TIMESTAMPTZ(6),
ADD COLUMN     "birth_weight" DECIMAL(6,3),
ADD COLUMN     "department" VARCHAR(5),
ADD COLUMN     "discharge_status" VARCHAR(2),
ADD COLUMN     "discharge_time" VARCHAR(8),
ADD COLUMN     "drg" VARCHAR(10),
ADD COLUMN     "drg_version" VARCHAR(5),
ADD COLUMN     "leave_day" INTEGER DEFAULT 0,
ADD COLUMN     "length_of_stay" INTEGER,
ADD COLUMN     "rw" DECIMAL(8,4),
ADD COLUMN     "ward" VARCHAR(20);

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "district" VARCHAR(10),
ADD COLUMN     "id_type" VARCHAR(2),
ADD COLUMN     "marital_status" VARCHAR(2),
ADD COLUMN     "nationality" VARCHAR(5),
ADD COLUMN     "province" VARCHAR(5);

-- AlterTable
ALTER TABLE "visit_billing_items" ADD COLUMN     "discount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "service_date" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "visit_diagnoses" (
    "id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "diag_code" VARCHAR(10) NOT NULL,
    "diag_type" VARCHAR(2) NOT NULL,
    "code_sys" VARCHAR(15) NOT NULL DEFAULT 'ICD-10',
    "diag_term" VARCHAR(500),
    "doctor_license" VARCHAR(20),
    "diag_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_procedures" (
    "id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "procedure_code" VARCHAR(10) NOT NULL,
    "code_sys" VARCHAR(15) NOT NULL DEFAULT 'ICD9CM',
    "procedure_term" VARCHAR(500),
    "doctor_license" VARCHAR(20),
    "start_date" DATE,
    "start_time" VARCHAR(8),
    "end_date" DATE,
    "end_time" VARCHAR(8),
    "location" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_visit_diagnoses_visit_id" ON "visit_diagnoses"("visit_id");

-- CreateIndex
CREATE INDEX "idx_visit_procedures_visit_id" ON "visit_procedures"("visit_id");

-- AddForeignKey
ALTER TABLE "visit_diagnoses" ADD CONSTRAINT "visit_diagnoses_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "patient_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_procedures" ADD CONSTRAINT "visit_procedures_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "patient_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
