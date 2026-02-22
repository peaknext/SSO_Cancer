-- 012: Initial Super Admin user
-- Exported from database: 2 rows

INSERT INTO users (id, email, password_hash, full_name, full_name_thai, role, department, position, phone_number, is_active, created_at, updated_at)
VALUES
  (1, 'admin@sso-cancer.local', '$2b$12$K.6eWmSVx0.nwQrfB6pTPOH5FgEJq3lonUAajfaQv3IDMWEuDBYDu', 'System Administrator', 'ผู้ดูแลระบบ', 'SUPER_ADMIN', 'IT Department', 'System Administrator', NULL, true, '2026-02-21T19:20:06.644Z', '2026-02-22T09:55:09.975Z'),
  (6, 'kpromsensa@moph.go.th', '$2b$12$.5jWcuhaewJ8IZhgdwJTMeJ7iRN8zCcj/qIVKxaB3OfYm5I3xviNS', 'Kiattisak Promsensa', 'นพ.เกียรติศักดิ์ พรหมเสนสา', 'EDITOR', 'Radiology', 'แพทย์', NULL, true, '2026-02-22T04:24:03.575Z', '2026-02-22T06:37:03.992Z')
ON CONFLICT (email) DO NOTHING;

-- Reset sequence
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
