-- CreateTable
CREATE TABLE "drugs" (
    "id" SERIAL NOT NULL,
    "generic_name" VARCHAR(200) NOT NULL,
    "drug_category" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_trade_names" (
    "id" SERIAL NOT NULL,
    "drug_id" INTEGER NOT NULL,
    "drug_code" VARCHAR(10) NOT NULL,
    "trade_name" VARCHAR(300),
    "dosage_form" VARCHAR(200) NOT NULL,
    "strength" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(50),
    "unit_price" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_trade_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancer_sites" (
    "id" SERIAL NOT NULL,
    "site_code" VARCHAR(5) NOT NULL,
    "name_thai" VARCHAR(300) NOT NULL,
    "name_english" VARCHAR(300) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancer_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancer_stages" (
    "id" SERIAL NOT NULL,
    "stage_code" VARCHAR(30) NOT NULL,
    "name_thai" VARCHAR(200) NOT NULL,
    "name_english" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "stage_group" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancer_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_names" (
    "id" SERIAL NOT NULL,
    "protocol_code" VARCHAR(10) NOT NULL,
    "cancer_site_id" INTEGER NOT NULL,
    "name_thai" TEXT,
    "name_english" TEXT NOT NULL,
    "protocol_type" VARCHAR(50),
    "treatment_intent" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocol_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regimens" (
    "id" SERIAL NOT NULL,
    "regimen_code" VARCHAR(50) NOT NULL,
    "regimen_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "cycle_days" INTEGER,
    "max_cycles" INTEGER,
    "regimen_type" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regimens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_regimens" (
    "id" SERIAL NOT NULL,
    "protocol_id" INTEGER NOT NULL,
    "regimen_id" INTEGER NOT NULL,
    "line_of_therapy" INTEGER,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "protocol_regimens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regimen_drugs" (
    "id" SERIAL NOT NULL,
    "regimen_id" INTEGER NOT NULL,
    "drug_id" INTEGER NOT NULL,
    "dose_per_cycle" VARCHAR(100),
    "route" VARCHAR(50),
    "day_schedule" VARCHAR(100),
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "regimen_drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_stages" (
    "id" SERIAL NOT NULL,
    "protocol_id" INTEGER NOT NULL,
    "stage_id" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "protocol_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancer_site_stages" (
    "id" SERIAL NOT NULL,
    "cancer_site_id" INTEGER NOT NULL,
    "stage_id" INTEGER NOT NULL,

    CONSTRAINT "cancer_site_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "full_name_thai" VARCHAR(200),
    "role" VARCHAR(20) NOT NULL DEFAULT 'VIEWER',
    "department" VARCHAR(200),
    "position" VARCHAR(200),
    "phone_number" VARCHAR(20),
    "avatar_url" VARCHAR(500),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "last_login_ip" VARCHAR(45),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_id" VARCHAR(36) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER,
    "old_values" TEXT,
    "new_values" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" SERIAL NOT NULL,
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" TEXT NOT NULL,
    "description" VARCHAR(500),
    "setting_group" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drugs_generic_name_key" ON "drugs"("generic_name");

-- CreateIndex
CREATE UNIQUE INDEX "drug_trade_names_drug_code_key" ON "drug_trade_names"("drug_code");

-- CreateIndex
CREATE INDEX "idx_drug_trade_names_drug_id" ON "drug_trade_names"("drug_id");

-- CreateIndex
CREATE UNIQUE INDEX "cancer_sites_site_code_key" ON "cancer_sites"("site_code");

-- CreateIndex
CREATE UNIQUE INDEX "cancer_stages_stage_code_key" ON "cancer_stages"("stage_code");

-- CreateIndex
CREATE INDEX "idx_cancer_stages_stage_group" ON "cancer_stages"("stage_group");

-- CreateIndex
CREATE UNIQUE INDEX "protocol_names_protocol_code_key" ON "protocol_names"("protocol_code");

-- CreateIndex
CREATE INDEX "idx_protocol_names_cancer_site_id" ON "protocol_names"("cancer_site_id");

-- CreateIndex
CREATE INDEX "idx_protocol_names_protocol_type" ON "protocol_names"("protocol_type");

-- CreateIndex
CREATE UNIQUE INDEX "regimens_regimen_code_key" ON "regimens"("regimen_code");

-- CreateIndex
CREATE INDEX "idx_regimens_regimen_type" ON "regimens"("regimen_type");

-- CreateIndex
CREATE INDEX "idx_protocol_regimens_protocol_id" ON "protocol_regimens"("protocol_id");

-- CreateIndex
CREATE INDEX "idx_protocol_regimens_regimen_id" ON "protocol_regimens"("regimen_id");

-- CreateIndex
CREATE UNIQUE INDEX "protocol_regimens_protocol_id_regimen_id_key" ON "protocol_regimens"("protocol_id", "regimen_id");

-- CreateIndex
CREATE INDEX "idx_regimen_drugs_regimen_id" ON "regimen_drugs"("regimen_id");

-- CreateIndex
CREATE INDEX "idx_regimen_drugs_drug_id" ON "regimen_drugs"("drug_id");

-- CreateIndex
CREATE UNIQUE INDEX "regimen_drugs_regimen_id_drug_id_day_schedule_key" ON "regimen_drugs"("regimen_id", "drug_id", "day_schedule");

-- CreateIndex
CREATE INDEX "idx_protocol_stages_protocol_id" ON "protocol_stages"("protocol_id");

-- CreateIndex
CREATE INDEX "idx_protocol_stages_stage_id" ON "protocol_stages"("stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "protocol_stages_protocol_id_stage_id_key" ON "protocol_stages"("protocol_id", "stage_id");

-- CreateIndex
CREATE INDEX "idx_cancer_site_stages_cancer_site_id" ON "cancer_site_stages"("cancer_site_id");

-- CreateIndex
CREATE INDEX "idx_cancer_site_stages_stage_id" ON "cancer_site_stages"("stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "cancer_site_stages_cancer_site_id_stage_id_key" ON "cancer_site_stages"("cancer_site_id", "stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_id_key" ON "sessions"("token_id");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_expires_at" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_password_history_user_id" ON "password_history"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_setting_key_key" ON "app_settings"("setting_key");

-- CreateIndex
CREATE INDEX "idx_app_settings_group" ON "app_settings"("setting_group");

-- AddForeignKey
ALTER TABLE "drug_trade_names" ADD CONSTRAINT "drug_trade_names_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_names" ADD CONSTRAINT "protocol_names_cancer_site_id_fkey" FOREIGN KEY ("cancer_site_id") REFERENCES "cancer_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_regimens" ADD CONSTRAINT "protocol_regimens_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocol_names"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_regimens" ADD CONSTRAINT "protocol_regimens_regimen_id_fkey" FOREIGN KEY ("regimen_id") REFERENCES "regimens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regimen_drugs" ADD CONSTRAINT "regimen_drugs_regimen_id_fkey" FOREIGN KEY ("regimen_id") REFERENCES "regimens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regimen_drugs" ADD CONSTRAINT "regimen_drugs_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_stages" ADD CONSTRAINT "protocol_stages_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocol_names"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_stages" ADD CONSTRAINT "protocol_stages_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "cancer_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancer_site_stages" ADD CONSTRAINT "cancer_site_stages_cancer_site_id_fkey" FOREIGN KEY ("cancer_site_id") REFERENCES "cancer_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancer_site_stages" ADD CONSTRAINT "cancer_site_stages_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "cancer_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
