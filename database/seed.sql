-- =============================================================================
-- SSO Cancer Care — Combined Seed Script
-- Run all seed files in order of FK dependencies
-- Usage: psql -d sso_cancer -f database/seed.sql
-- =============================================================================

\echo '=== SSO Cancer Care Database Seeding ==='

\echo 'Seeding cancer_sites...'
\i database/seeds/001_cancer_sites.sql

\echo 'Seeding cancer_stages...'
\i database/seeds/002_cancer_stages.sql

\echo 'Seeding drugs...'
\i database/seeds/003_drugs.sql

\echo 'Seeding drug_trade_names...'
\i database/seeds/004_drug_trade_names.sql

\echo 'Seeding protocol_names...'
\i database/seeds/005_protocol_names.sql

\echo 'Seeding regimens...'
\i database/seeds/006_regimens.sql

\echo 'Seeding regimen_drugs...'
\i database/seeds/007_regimen_drugs.sql

\echo 'Seeding protocol_regimens...'
\i database/seeds/008_protocol_regimens.sql

\echo 'Seeding protocol_stages...'
\i database/seeds/009_protocol_stages.sql

\echo 'Seeding cancer_site_stages...'
\i database/seeds/010_cancer_site_stages.sql

\echo '=== Seeding Complete ==='

-- Show row counts
SELECT 'cancer_sites' AS table_name, count(*) AS rows FROM cancer_sites
UNION ALL SELECT 'cancer_stages', count(*) FROM cancer_stages
UNION ALL SELECT 'drugs', count(*) FROM drugs
UNION ALL SELECT 'drug_trade_names', count(*) FROM drug_trade_names
UNION ALL SELECT 'protocol_names', count(*) FROM protocol_names
UNION ALL SELECT 'regimens', count(*) FROM regimens
UNION ALL SELECT 'regimen_drugs', count(*) FROM regimen_drugs
UNION ALL SELECT 'protocol_regimens', count(*) FROM protocol_regimens
UNION ALL SELECT 'protocol_stages', count(*) FROM protocol_stages
UNION ALL SELECT 'cancer_site_stages', count(*) FROM cancer_site_stages
ORDER BY table_name;
