-- CreateTable
CREATE TABLE "icd10_cancer_site_map" (
    "id" SERIAL NOT NULL,
    "icd_prefix" VARCHAR(10) NOT NULL,
    "cancer_site_id" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icd10_cancer_site_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_imports" (
    "id" SERIAL NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "imported_rows" INTEGER NOT NULL,
    "skipped_rows" INTEGER NOT NULL DEFAULT 0,
    "imported_by_id" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    "error_log" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_visits" (
    "id" SERIAL NOT NULL,
    "import_id" INTEGER NOT NULL,
    "hn" VARCHAR(20) NOT NULL,
    "vn" VARCHAR(30) NOT NULL,
    "visit_date" DATE NOT NULL,
    "primary_diagnosis" VARCHAR(10) NOT NULL,
    "secondary_diagnoses" TEXT,
    "hpi" TEXT,
    "doctor_notes" TEXT,
    "medications_raw" TEXT,
    "resolved_site_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_medications" (
    "id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "raw_line" TEXT NOT NULL,
    "hospital_code" VARCHAR(20),
    "medication_name" VARCHAR(300),
    "quantity" VARCHAR(50),
    "unit" VARCHAR(50),
    "resolved_drug_id" INTEGER,

    CONSTRAINT "visit_medications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "icd10_cancer_site_map_icd_prefix_key" ON "icd10_cancer_site_map"("icd_prefix");

-- CreateIndex
CREATE INDEX "idx_icd10_map_icd_prefix" ON "icd10_cancer_site_map"("icd_prefix");

-- CreateIndex
CREATE INDEX "idx_icd10_map_cancer_site_id" ON "icd10_cancer_site_map"("cancer_site_id");

-- CreateIndex
CREATE INDEX "idx_patient_imports_imported_by" ON "patient_imports"("imported_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_visits_vn_key" ON "patient_visits"("vn");

-- CreateIndex
CREATE INDEX "idx_patient_visits_hn" ON "patient_visits"("hn");

-- CreateIndex
CREATE INDEX "idx_patient_visits_import_id" ON "patient_visits"("import_id");

-- CreateIndex
CREATE INDEX "idx_patient_visits_resolved_site_id" ON "patient_visits"("resolved_site_id");

-- CreateIndex
CREATE INDEX "idx_patient_visits_visit_date" ON "patient_visits"("visit_date");

-- CreateIndex
CREATE INDEX "idx_visit_medications_visit_id" ON "visit_medications"("visit_id");

-- CreateIndex
CREATE INDEX "idx_visit_medications_resolved_drug_id" ON "visit_medications"("resolved_drug_id");

-- AddForeignKey
ALTER TABLE "icd10_cancer_site_map" ADD CONSTRAINT "icd10_cancer_site_map_cancer_site_id_fkey" FOREIGN KEY ("cancer_site_id") REFERENCES "cancer_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_imports" ADD CONSTRAINT "patient_imports_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "patient_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_visits" ADD CONSTRAINT "patient_visits_resolved_site_id_fkey" FOREIGN KEY ("resolved_site_id") REFERENCES "cancer_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_medications" ADD CONSTRAINT "visit_medications_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "patient_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_medications" ADD CONSTRAINT "visit_medications_resolved_drug_id_fkey" FOREIGN KEY ("resolved_drug_id") REFERENCES "drugs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
