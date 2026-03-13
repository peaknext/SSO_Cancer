-- 019: HOSxP Direct Database Connection Settings
-- Allows direct connection to HOSxP PostgreSQL slave for HIS data access

INSERT INTO app_settings (setting_key, setting_value, setting_group, description, is_active)
VALUES
  ('his_connection_mode', 'api', 'hospital', 'HIS connection mode: api (REST API) or direct_db (HOSxP PostgreSQL)', true),
  ('his_db_host', '', 'his_db', 'HOSxP database host (slave server IP)', true),
  ('his_db_port', '5432', 'his_db', 'HOSxP database port', true),
  ('his_db_name', '', 'his_db', 'HOSxP database name', true),
  ('his_db_user', '', 'his_db', 'HOSxP database username (read-only)', true),
  ('his_db_password', '', 'his_db', 'HOSxP database password (encrypted)', true),
  ('his_db_ssl', 'false', 'his_db', 'Use SSL for HOSxP database connection', true)
ON CONFLICT (setting_key) DO NOTHING;
