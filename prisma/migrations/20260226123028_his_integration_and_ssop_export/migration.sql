-- AlterTable
ALTER TABLE "patient_cases" ADD COLUMN     "vcr_code" VARCHAR(20);

-- AlterTable
ALTER TABLE "patient_imports" ADD COLUMN     "source" VARCHAR(20) NOT NULL DEFAULT 'EXCEL';

-- AlterTable
ALTER TABLE "patient_visits" ADD COLUMN     "clinic_code" VARCHAR(5),
ADD COLUMN     "physician_license_no" VARCHAR(20),
ADD COLUMN     "service_end_time" TIMESTAMPTZ(6),
ADD COLUMN     "service_start_time" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "address" TEXT,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "gender" VARCHAR(10),
ADD COLUMN     "main_hospital_code" VARCHAR(5),
ADD COLUMN     "phone_number" VARCHAR(20),
ADD COLUMN     "title_name" VARCHAR(30);

-- CreateTable
CREATE TABLE "visit_billing_items" (
    "id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "hospital_code" VARCHAR(20) NOT NULL,
    "aipn_code" VARCHAR(20),
    "billing_group" VARCHAR(5) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "claim_unit_price" DECIMAL(12,2),
    "claim_category" VARCHAR(5) NOT NULL DEFAULT 'OP1',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_billing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_export_batches" (
    "id" SERIAL NOT NULL,
    "session_no" INTEGER NOT NULL,
    "hcode" VARCHAR(5) NOT NULL,
    "sub_unit" VARCHAR(2) NOT NULL DEFAULT '01',
    "export_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visit_count" INTEGER NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "file_name" VARCHAR(200) NOT NULL,
    "visit_ids" INTEGER[],
    "file_data" BYTEA,
    "created_by_user_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_export_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_visit_billing_items_visit_id" ON "visit_billing_items"("visit_id");

-- CreateIndex
CREATE INDEX "idx_visit_billing_items_aipn_code" ON "visit_billing_items"("aipn_code");

-- AddForeignKey
ALTER TABLE "visit_billing_items" ADD CONSTRAINT "visit_billing_items_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "patient_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_export_batches" ADD CONSTRAINT "billing_export_batches_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
