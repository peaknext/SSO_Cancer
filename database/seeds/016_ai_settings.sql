-- 016: AI Provider Settings
-- Seeds the app_settings table with AI configuration values

INSERT INTO app_settings (setting_key, setting_value, description, setting_group, is_active, created_at, updated_at)
VALUES
  ('ai_enabled',         'false',                   'เปิด/ปิดระบบ AI Suggestion',                      'ai', true, NOW(), NOW()),
  ('ai_provider',        'gemini',                  'AI Provider ที่ใช้งาน (gemini, claude, openai)',    'ai', true, NOW(), NOW()),
  ('ai_gemini_api_key',  '',                        'Google Gemini API Key',                             'ai', true, NOW(), NOW()),
  ('ai_gemini_model',    'gemini-2.0-flash',        'Gemini model',                                     'ai', true, NOW(), NOW()),
  ('ai_claude_api_key',  '',                        'Anthropic Claude API Key',                          'ai', true, NOW(), NOW()),
  ('ai_claude_model',    'claude-sonnet-4-6',        'Claude model',                                    'ai', true, NOW(), NOW()),
  ('ai_openai_api_key',  '',                        'OpenAI API Key',                                    'ai', true, NOW(), NOW()),
  ('ai_openai_model',    'gpt-4o',                  'OpenAI model',                                      'ai', true, NOW(), NOW()),
  ('ai_max_tokens',      '2048',                    'Max response tokens',                               'ai', true, NOW(), NOW()),
  ('ai_temperature',     '0.3',                     'Temperature (0.0-1.0)',                             'ai', true, NOW(), NOW())
ON CONFLICT (setting_key) DO NOTHING;
