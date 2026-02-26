-- Hospital + HIS integration settings
INSERT INTO app_settings (setting_key, setting_value, description, setting_group) VALUES
  ('hospital_id', '', 'รหัส Hospital ID ในระบบ (FK → hospitals.id)', 'hospital'),
  ('his_api_base_url', '', 'Base URL ของ HIS API เช่น http://192.168.1.100:8080/api', 'hospital'),
  ('his_api_key', '', 'API Key สำหรับเชื่อมต่อ HIS', 'hospital'),
  ('his_api_timeout', '30000', 'Timeout สำหรับเรียก HIS API (มิลลิวินาที)', 'hospital')
ON CONFLICT (setting_key) DO NOTHING;
