-- 018: Ollama AI Provider Settings
INSERT INTO app_settings (setting_key, setting_value, description, setting_group, is_active, created_at, updated_at)
VALUES
  ('ai_ollama_api_key', '', 'Ollama API Key', 'ai', true, now(), now()),
  ('ai_ollama_model', 'llama3.2', 'Ollama model name', 'ai', true, now(), now()),
  ('ai_ollama_base_url', 'https://ollama.peaknext.cloud', 'Ollama base URL', 'ai', true, now(), now())
ON CONFLICT (setting_key) DO NOTHING;
