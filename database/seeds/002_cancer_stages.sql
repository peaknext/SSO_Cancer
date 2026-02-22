-- 002: Cancer Stages (ระยะโรค) — disease staging classifications

INSERT INTO cancer_stages (stage_code, name_thai, name_english, description, stage_group, sort_order, is_active)
VALUES
  ('EARLY', 'ระยะแรก', 'Early Stage', 'โรคมะเร็งระยะเริ่มต้น ยังไม่ลุกลาม', 'solid_tumor', 1, true),
  ('LOCALLY_ADVANCED', 'ระยะลุกลามเฉพาะที่', 'Locally Advanced', 'โรคลุกลามเฉพาะที่แต่ยังไม่แพร่กระจายไปอวัยวะอื่น', 'solid_tumor', 2, true),
  ('ADVANCED', 'ระยะลุกลาม', 'Advanced', 'โรคลุกลามรวมทั้งระยะแพร่กระจาย', 'solid_tumor', 3, true),
  ('METASTATIC', 'ระยะแพร่กระจาย', 'Metastatic', 'โรคแพร่กระจายไปยังอวัยวะอื่น', 'solid_tumor', 4, true),
  ('RECURRENT', 'กลับเป็นซ้ำ', 'Recurrent', 'โรคกลับเป็นซ้ำหลังการรักษา', 'solid_tumor', 5, true),
  ('LOCOREGIONAL', 'ระยะลุกลามเฉพาะที่และต่อมน้ำเหลือง', 'Locoregional', 'โรคลุกลามเฉพาะที่รวมต่อมน้ำเหลืองใกล้เคียง', 'solid_tumor', 6, true),
  ('STAGE_I', 'ระยะที่ 1', 'Stage I', NULL, 'tnm', 10, true),
  ('STAGE_II', 'ระยะที่ 2', 'Stage II', NULL, 'tnm', 11, true),
  ('STAGE_III', 'ระยะที่ 3', 'Stage III', NULL, 'tnm', 12, true),
  ('STAGE_IIIA', 'ระยะที่ 3A', 'Stage IIIA', NULL, 'tnm', 13, true),
  ('STAGE_IIIB_C', 'ระยะที่ 3B-C', 'Stage IIIB-C', NULL, 'tnm', 14, true),
  ('STAGE_IV', 'ระยะที่ 4', 'Stage IV', NULL, 'tnm', 15, true),
  ('LIMITED_STAGE', 'ระยะจำกัด (Limited)', 'Limited Stage', 'Small cell lung cancer ระยะไม่ลุกลาม', 'lung', 20, true),
  ('EXTENSIVE_STAGE', 'ระยะลุกลาม (Extensive)', 'Extensive Stage', 'Small cell lung cancer ระยะลุกลาม', 'lung', 21, true),
  ('M1CSPC', 'ระยะแพร่กระจายไวต่อฮอร์โมน', 'Metastatic Castration-Sensitive (mCSPC)', 'Metastatic castration-sensitive prostate cancer', 'prostate', 30, true),
  ('M1CRPC', 'ระยะแพร่กระจายดื้อต่อฮอร์โมน', 'Metastatic Castration-Resistant (mCRPC)', 'Metastatic castration-resistant prostate cancer', 'prostate', 31, true),
  ('INDUCTION', 'ระยะชักนำ', 'Induction Phase', 'ระยะการรักษาแรกเพื่อให้โรคสงบ', 'hematologic', 40, true),
  ('CONSOLIDATION', 'ระยะรวบรวม', 'Consolidation Phase', 'ระยะรักษาเพิ่มเติมหลังโรคสงบ', 'hematologic', 41, true),
  ('MAINTENANCE', 'ระยะคงสภาพ', 'Maintenance Phase', 'ระยะรักษาต่อเนื่องเพื่อป้องกันการกลับเป็นซ้ำ', 'hematologic', 42, true),
  ('RELAPSED', 'โรคกลับเป็นซ้ำ (Hematologic)', 'Relapsed', 'โรคกลับเป็นซ้ำหลังเคยสงบ', 'hematologic', 43, true),
  ('REFRACTORY', 'ดื้อต่อการรักษา', 'Refractory', 'โรคไม่ตอบสนองต่อการรักษา', 'hematologic', 44, true),
  ('BLAST_CRISIS', 'ระยะวิกฤต (Blast Crisis)', 'Blast Crisis', 'CML ระยะ blast crisis', 'hematologic', 45, true),
  ('ADJUVANT', 'เสริมหลังผ่าตัด', 'Adjuvant', 'การรักษาเสริมภายหลังการผ่าตัด', 'general', 50, true),
  ('NEOADJUVANT', 'ก่อนการผ่าตัด', 'Neoadjuvant', 'การรักษาก่อนการผ่าตัด', 'general', 51, true),
  ('PERIOPERATIVE', 'รอบการผ่าตัด', 'Perioperative', 'การรักษาก่อนและหลังผ่าตัด', 'general', 52, true),
  ('PALLIATIVE', 'ประคับประคอง', 'Palliative', 'การรักษาแบบประคับประคอง', 'general', 53, true),
  ('CONCURRENT_CRT', 'เคมีบำบัดร่วมกับรังสีรักษา', 'Concurrent Chemoradiation', 'การให้ยาเคมีบำบัดร่วมกับการฉายรังสี', 'general', 54, true),
  ('DEFINITIVE', 'รักษาจำเพาะ', 'Definitive Treatment', 'การรักษาหลักโดยไม่ผ่าตัด', 'general', 55, true)
ON CONFLICT (stage_code) DO NOTHING;
