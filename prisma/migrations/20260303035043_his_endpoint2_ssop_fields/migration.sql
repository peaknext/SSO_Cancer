-- AlterTable
ALTER TABLE "patient_visits" ADD COLUMN     "bill_no" VARCHAR(30),
ADD COLUMN     "discharge_type" VARCHAR(2),
ADD COLUMN     "next_appointment_date" DATE,
ADD COLUMN     "prescription_time" TIMESTAMPTZ(6),
ADD COLUMN     "service_class" VARCHAR(5),
ADD COLUMN     "service_type" VARCHAR(5),
ADD COLUMN     "visit_type" VARCHAR(2);

-- AlterTable
ALTER TABLE "visit_billing_items" ADD COLUMN     "dfs_text" TEXT,
ADD COLUMN     "packsize" VARCHAR(20),
ADD COLUMN     "sig_code" VARCHAR(20),
ADD COLUMN     "sig_text" TEXT,
ADD COLUMN     "std_code" VARCHAR(20),
ADD COLUMN     "supply_duration" VARCHAR(10);
