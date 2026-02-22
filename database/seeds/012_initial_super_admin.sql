-- 012: Initial SUPER_ADMIN user
-- Default credentials: admin@sso-cancer.local / Admin@1234
-- Password hash: bcrypt('Admin@1234', 12 rounds)

INSERT INTO users (email, password_hash, full_name, full_name_thai, role, department, position, is_active, created_at, updated_at)
VALUES (
  'admin@sso-cancer.local',
  '$2b$12$K.6eWmSVx0.nwQrfB6pTPOH5FgEJq3lonUAajfaQv3IDMWEuDBYDu',
  'System Administrator',
  'ผู้ดูแลระบบ',
  'SUPER_ADMIN',
  'IT Department',
  'System Administrator',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
