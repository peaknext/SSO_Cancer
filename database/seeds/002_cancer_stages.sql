-- 002: Cancer Stages — ระยะของโรคมะเร็ง
-- Exported from database: 28 rows

INSERT INTO cancer_stages (id, stage_code, name_thai, name_english, description, stage_group, sort_order, is_active, created_at, updated_at)
VALUES
  (1, 'EARLY', 'ระยะแรก', 'Early Stage', 'โรคมะเร็งระยะเริ่มต้น ยังไม่ลุกลาม', 'solid_tumor', 1, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (2, 'LOCALLY_ADVANCED', 'ระยะลุกลามเฉพาะที่', 'Locally Advanced', 'โรคลุกลามเฉพาะที่แต่ยังไม่แพร่กระจายไปอวัยวะอื่น', 'solid_tumor', 2, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (3, 'ADVANCED', 'ระยะลุกลาม', 'Advanced', 'โรคลุกลามรวมทั้งระยะแพร่กระจาย', 'solid_tumor', 3, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (4, 'METASTATIC', 'ระยะแพร่กระจาย', 'Metastatic', 'โรคแพร่กระจายไปยังอวัยวะอื่น', 'solid_tumor', 4, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (5, 'RECURRENT', 'กลับเป็นซ้ำ', 'Recurrent', 'โรคกลับเป็นซ้ำหลังการรักษา', 'solid_tumor', 5, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (6, 'LOCOREGIONAL', 'ระยะลุกลามเฉพาะที่และต่อมน้ำเหลือง', 'Locoregional', 'โรคลุกลามเฉพาะที่รวมต่อมน้ำเหลืองใกล้เคียง', 'solid_tumor', 6, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (7, 'STAGE_I', 'ระยะที่ 1', 'Stage I', NULL, 'tnm', 10, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (8, 'STAGE_II', 'ระยะที่ 2', 'Stage II', NULL, 'tnm', 11, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (9, 'STAGE_III', 'ระยะที่ 3', 'Stage III', NULL, 'tnm', 12, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (10, 'STAGE_IIIA', 'ระยะที่ 3A', 'Stage IIIA', NULL, 'tnm', 13, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (11, 'STAGE_IIIB_C', 'ระยะที่ 3B-C', 'Stage IIIB-C', NULL, 'tnm', 14, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (12, 'STAGE_IV', 'ระยะที่ 4', 'Stage IV', NULL, 'tnm', 15, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (13, 'LIMITED_STAGE', 'ระยะจำกัด (Limited)', 'Limited Stage', 'Small cell lung cancer ระยะไม่ลุกลาม', 'lung', 20, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (14, 'EXTENSIVE_STAGE', 'ระยะลุกลาม (Extensive)', 'Extensive Stage', 'Small cell lung cancer ระยะลุกลาม', 'lung', 21, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (15, 'M1CSPC', 'ระยะแพร่กระจายไวต่อฮอร์โมน', 'Metastatic Castration-Sensitive (mCSPC)', 'Metastatic castration-sensitive prostate cancer', 'prostate', 30, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (16, 'M1CRPC', 'ระยะแพร่กระจายดื้อต่อฮอร์โมน', 'Metastatic Castration-Resistant (mCRPC)', 'Metastatic castration-resistant prostate cancer', 'prostate', 31, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (17, 'INDUCTION', 'ระยะชักนำ', 'Induction Phase', 'ระยะการรักษาแรกเพื่อให้โรคสงบ', 'hematologic', 40, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (18, 'CONSOLIDATION', 'ระยะรวบรวม', 'Consolidation Phase', 'ระยะรักษาเพิ่มเติมหลังโรคสงบ', 'hematologic', 41, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (19, 'MAINTENANCE', 'ระยะคงสภาพ', 'Maintenance Phase', 'ระยะรักษาต่อเนื่องเพื่อป้องกันการกลับเป็นซ้ำ', 'hematologic', 42, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (20, 'RELAPSED', 'โรคกลับเป็นซ้ำ (Hematologic)', 'Relapsed', 'โรคกลับเป็นซ้ำหลังเคยสงบ', 'hematologic', 43, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (21, 'REFRACTORY', 'ดื้อต่อการรักษา', 'Refractory', 'โรคไม่ตอบสนองต่อการรักษา', 'hematologic', 44, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (22, 'BLAST_CRISIS', 'ระยะวิกฤต (Blast Crisis)', 'Blast Crisis', 'CML ระยะ blast crisis', 'hematologic', 45, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (23, 'ADJUVANT', 'เสริมหลังผ่าตัด', 'Adjuvant', 'การรักษาเสริมภายหลังการผ่าตัด', 'general', 50, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (24, 'NEOADJUVANT', 'ก่อนการผ่าตัด', 'Neoadjuvant', 'การรักษาก่อนการผ่าตัด', 'general', 51, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (25, 'PERIOPERATIVE', 'รอบการผ่าตัด', 'Perioperative', 'การรักษาก่อนและหลังผ่าตัด', 'general', 52, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (26, 'PALLIATIVE', 'ประคับประคอง', 'Palliative', 'การรักษาแบบประคับประคอง', 'general', 53, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (27, 'CONCURRENT_CRT', 'เคมีบำบัดร่วมกับรังสีรักษา', 'Concurrent Chemoradiation', 'การให้ยาเคมีบำบัดร่วมกับการฉายรังสี', 'general', 54, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z'),
  (28, 'DEFINITIVE', 'รักษาจำเพาะ', 'Definitive Treatment', 'การรักษาหลักโดยไม่ผ่าตัด', 'general', 55, true, '2026-02-21T19:20:06.087Z', '2026-02-21T19:20:06.087Z')
ON CONFLICT (stage_code) DO NOTHING;

-- Reset sequence
SELECT setval(pg_get_serial_sequence('cancer_stages', 'id'), COALESCE((SELECT MAX(id) FROM cancer_stages), 1));
