-- DropForeignKey
ALTER TABLE "protocol_names" DROP CONSTRAINT "protocol_names_cancer_site_id_fkey";

-- AlterTable
ALTER TABLE "protocol_names" ADD COLUMN     "notes" TEXT;

-- AddForeignKey
ALTER TABLE "protocol_names" ADD CONSTRAINT "protocol_names_cancer_site_id_fkey" FOREIGN KEY ("cancer_site_id") REFERENCES "cancer_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
