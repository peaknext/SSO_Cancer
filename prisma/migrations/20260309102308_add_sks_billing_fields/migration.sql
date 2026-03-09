-- AlterTable
ALTER TABLE "visit_billing_items" ADD COLUMN     "sks_dfs_text" TEXT,
ADD COLUMN     "sks_drug_code" VARCHAR(30),
ADD COLUMN     "sks_reimb_price" DECIMAL(12,2),
ADD COLUMN     "std_group" VARCHAR(10);
