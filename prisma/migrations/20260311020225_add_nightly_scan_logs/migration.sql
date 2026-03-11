-- CreateTable
CREATE TABLE "nightly_scan_logs" (
    "id" SERIAL NOT NULL,
    "scan_date" VARCHAR(10) NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "finished_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL,
    "total_scanned" INTEGER NOT NULL DEFAULT 0,
    "new_patients" INTEGER NOT NULL DEFAULT 0,
    "new_visits" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "filter_config" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nightly_scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nightly_scan_details" (
    "id" SERIAL NOT NULL,
    "scan_log_id" INTEGER NOT NULL,
    "hn" VARCHAR(20) NOT NULL,
    "patient_name" VARCHAR(200),
    "status" VARCHAR(20) NOT NULL,
    "imported_visits" INTEGER NOT NULL DEFAULT 0,
    "skipped_visits" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nightly_scan_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_nightly_scan_logs_scan_date" ON "nightly_scan_logs"("scan_date");

-- CreateIndex
CREATE INDEX "idx_nightly_scan_logs_status" ON "nightly_scan_logs"("status");

-- CreateIndex
CREATE INDEX "idx_nightly_scan_details_scan_log_id" ON "nightly_scan_details"("scan_log_id");

-- AddForeignKey
ALTER TABLE "nightly_scan_details" ADD CONSTRAINT "nightly_scan_details_scan_log_id_fkey" FOREIGN KEY ("scan_log_id") REFERENCES "nightly_scan_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
