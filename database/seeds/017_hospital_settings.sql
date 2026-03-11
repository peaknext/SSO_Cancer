-- Hospital + HIS integration settings
INSERT INTO app_settings (setting_key, setting_value, description, setting_group) VALUES
  ('hospital_id', '', 'รหัส Hospital ID ในระบบ (FK → hospitals.id)', 'hospital'),
  ('his_api_base_url', '', 'Base URL ของ HIS API เช่น http://192.168.1.100:8080/api', 'hospital'),
  ('his_api_key', '', 'API Key สำหรับเชื่อมต่อ HIS', 'hospital'),
  ('his_api_timeout', '30000', 'Timeout สำหรับเรียก HIS API (มิลลิวินาที)', 'hospital')
ON CONFLICT (setting_key) DO NOTHING;

-- HIS nightly auto-scan settings
INSERT INTO app_settings (setting_key, setting_value, description, setting_group) VALUES
  ('his_nightly_scan_enabled', 'false', 'เปิด/ปิด การสแกนหา Visit ใหม่จาก HIS อัตโนมัติทุกคืน 01.00 น.', 'hospital'),
  ('his_nightly_scan_last_result', '', 'ผลการสแกนล่าสุด (system-managed JSON — ห้ามแก้ด้วยมือ)', 'hospital'),
  ('his_scan_filter_cancer_diag', 'true', 'สแกนอัตโนมัติ: นำเข้าเฉพาะ visit ที่วินิจฉัยมะเร็ง (ICD-10: C, D0)', 'hospital'),
  ('his_scan_filter_z510', 'false', 'สแกนอัตโนมัติ: นำเข้าเฉพาะ visit ที่มี Z510 (ฉายรังสี)', 'hospital'),
  ('his_scan_filter_z511', 'false', 'สแกนอัตโนมัติ: นำเข้าเฉพาะ visit ที่มี Z511 (เคมีบำบัด)', 'hospital'),
  ('his_scan_filter_cancer_site_ids', '[]', 'สแกนอัตโนมัติ: รายการ cancer site IDs (JSON array) — ถ้าว่าง = มะเร็งทุกตำแหน่ง', 'hospital'),
  ('his_scan_filter_has_medications', 'false', 'สแกนอัตโนมัติ: นำเข้าเฉพาะ visit ที่มีรายการยา', 'hospital')
ON CONFLICT (setting_key) DO NOTHING;

-- SSOP export settings
INSERT INTO app_settings (setting_key, setting_value, description, setting_group) VALUES
  ('ssop_care_account', '1', 'รหัสแนวบริหารจัดการ OPServices.CareAccount (1=รพ.หลัก, 9=รพ.เฉพาะทางมะเร็ง)', 'ssop'),
  ('ssop_session_no_start', '1', 'หมายเลขงวดเริ่มต้น SSOP Export — ถ้ามี batch ก่อนหน้าที่สูงกว่า จะใช้ค่าที่สูงกว่าเสมอ', 'ssop')
ON CONFLICT (setting_key) DO NOTHING;
