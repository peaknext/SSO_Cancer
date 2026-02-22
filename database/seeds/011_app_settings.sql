-- 011: Default Application Settings
-- Seeds the app_settings table with initial configuration values

INSERT INTO app_settings (setting_key, setting_value, description, setting_group, is_active, created_at, updated_at)
VALUES
  ('session_max_concurrent', '5', 'Maximum concurrent sessions per user', 'auth', true, NOW(), NOW()),
  ('session_access_token_ttl', '900', 'Access token TTL in seconds (15 minutes)', 'auth', true, NOW(), NOW()),
  ('session_refresh_token_ttl', '604800', 'Refresh token TTL in seconds (7 days)', 'auth', true, NOW(), NOW()),
  ('password_min_length', '8', 'Minimum password length', 'auth', true, NOW(), NOW()),
  ('password_history_count', '5', 'Number of previous passwords to check for reuse', 'auth', true, NOW(), NOW()),
  ('login_max_attempts', '5', 'Max failed login attempts before lockout', 'auth', true, NOW(), NOW()),
  ('login_lockout_duration', '900', 'Account lockout duration in seconds (15 minutes)', 'auth', true, NOW(), NOW()),
  ('app_name', 'SSO Cancer Care', 'Application display name', 'display', true, NOW(), NOW()),
  ('app_name_thai', 'ระบบจัดการโปรโตคอลรักษามะเร็ง สปส.', 'Thai application name', 'display', true, NOW(), NOW()),
  ('items_per_page', '25', 'Default pagination size', 'display', true, NOW(), NOW()),
  ('default_language', 'th', 'Default UI language', 'display', true, NOW(), NOW()),
  ('audit_log_retention_days', '90', 'Auto-delete audit logs older than this many days (0 = never)', 'system', true, NOW(), NOW())
ON CONFLICT (setting_key) DO NOTHING;
