-- 011: Application Settings
-- Exported from database: 21 rows

INSERT INTO app_settings (setting_key, setting_value, description, setting_group, is_active, created_at, updated_at)
VALUES
  ('session_max_concurrent', '5', 'Maximum concurrent sessions per user', 'auth', true, '2026-02-21T19:20:06.642Z', '2026-02-21T19:20:06.642Z'),
  ('session_access_token_ttl', '900', 'Access token TTL in seconds (15 minutes)', 'auth', true, '2026-02-21T19:20:06.642Z', '2026-02-21T19:20:06.642Z'),
  ('session_refresh_token_ttl', '604800', 'Refresh token TTL in seconds (7 days)', 'auth', true, '2026-02-21T19:20:06.642Z', '2026-02-21T19:20:06.642Z'),
  ('password_min_length', '8', 'Minimum password length', 'auth', true, '2026-02-21T19:20:06.642Z', '2026-02-21T19:20:06.642Z'),
  ('password_history_count', '5', 'Number of previous passwords to check for reuse', 'auth', true, '2026-02-21T19:20:06.642Z', '2026-02-21T19:20:06.642Z'),
  ('login_max_attempts', '5', 'Max failed login attempts before lockout', 'auth', true, '2026-02-21T19:20:06.642Z', '2026-02-21T19:20:06.642Z'),
  ('login_lockout_duration', '900', 'Account lockout duration in seconds (15 minutes)', 'auth', true, '2026-02-21T19:20:06.642Z', '2026-02-21T19:20:06.642Z'),
  ('app_name', 'SSO Cancer Care', 'Application display name', 'display', true, '2026-02-21T19:20:06.642Z', '2026-02-21T19:20:06.642Z'),
  ('app_name_thai', 'ระบบจัดการโปรโตคอลรักษามะเร็ง สปส.', 'Thai application name', 'display', true, '2026-02-21T19:20:06.642Z', '2026-02-21T19:20:06.642Z'),
  ('items_per_page', '50', 'Default pagination size', 'display', true, '2026-02-21T19:20:06.642Z', '2026-02-22T04:04:24.671Z'),
  ('default_language', 'th', 'Default UI language', 'display', true, '2026-02-21T19:20:06.642Z', '2026-02-21T19:20:06.642Z'),
  ('ai_enabled', 'true', 'เปิด/ปิดระบบ AI Suggestion', 'ai', true, '2026-02-22T14:25:17.830Z', '2026-02-22T07:43:17.581Z'),
  ('ai_provider', 'claude', 'AI Provider ที่ใช้งาน (gemini, claude, openai)', 'ai', true, '2026-02-22T14:25:17.830Z', '2026-02-22T07:53:50.129Z'),
  ('ai_gemini_api_key', '', 'Google Gemini API Key', 'ai', true, '2026-02-22T14:25:17.830Z', '2026-02-22T14:25:17.830Z'),
  ('ai_gemini_model', 'gemini-2.0-flash', 'Gemini model', 'ai', true, '2026-02-22T14:25:17.830Z', '2026-02-22T14:25:17.830Z'),
  ('ai_claude_api_key', '', 'Anthropic Claude API Key', 'ai', true, '2026-02-22T14:25:17.830Z', '2026-02-22T14:25:17.830Z'),
  ('ai_claude_model', 'claude-sonnet-4-20250514', 'Claude model', 'ai', true, '2026-02-22T14:25:17.830Z', '2026-02-22T14:25:17.830Z'),
  ('ai_openai_api_key', '', 'OpenAI API Key', 'ai', true, '2026-02-22T14:25:17.830Z', '2026-02-22T14:25:17.830Z'),
  ('ai_openai_model', 'gpt-4o', 'OpenAI model', 'ai', true, '2026-02-22T14:25:17.830Z', '2026-02-22T14:25:17.830Z'),
  ('ai_max_tokens', '2048', 'Max response tokens', 'ai', true, '2026-02-22T14:25:17.830Z', '2026-02-22T14:25:17.830Z'),
  ('ai_temperature', '0.3', 'Temperature (0.0-1.0)', 'ai', true, '2026-02-22T14:25:17.830Z', '2026-02-22T14:25:17.830Z')
ON CONFLICT (setting_key) DO NOTHING;

