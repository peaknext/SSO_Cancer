-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "prompt_hash" VARCHAR(64) NOT NULL,
    "request_payload" TEXT,
    "response_raw" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "confidence_score" DECIMAL(5,2),
    "protocol_id" INTEGER,
    "regimen_id" INTEGER,
    "tokens_used" INTEGER,
    "latency_ms" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    "error_message" TEXT,
    "requested_by_user_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ai_suggestions_visit" ON "ai_suggestions"("visit_id");

-- CreateIndex
CREATE INDEX "idx_ai_suggestions_cache" ON "ai_suggestions"("visit_id", "provider", "prompt_hash");

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "patient_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocol_names"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_regimen_id_fkey" FOREIGN KEY ("regimen_id") REFERENCES "regimens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
