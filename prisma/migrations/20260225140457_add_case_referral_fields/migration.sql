-- AlterTable
ALTER TABLE "patient_cases" ADD COLUMN     "admission_date" DATE,
ADD COLUMN     "referral_date" DATE,
ADD COLUMN     "source_hospital_code_10" VARCHAR(10),
ADD COLUMN     "source_hospital_code_5" VARCHAR(5);
