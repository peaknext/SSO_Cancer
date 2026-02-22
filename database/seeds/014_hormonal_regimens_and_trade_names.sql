-- 014: Hormonal therapy regimens, trade name aliases, and protocol links
-- Based on SSO Cancer Treatment Manual (CCUF drug list) and standard oncology protocols
--
-- Addresses:
--   1. C0113/C0114 have zero regimen links → add hormonal monotherapy regimens
--   2. Common Thai generic trade names missing (MAMOFEN, etc.) → add aliases
--   3. Fulvestrant has no trade names → add Faslodex from CCUF
--   4. LHRH-AGONIST regimen only linked to prostate → link to breast cancer too

-- ═══════════════════════════════════════════════════════════════
-- PART 1: New hormonal monotherapy regimens
-- ═══════════════════════════════════════════════════════════════

INSERT INTO regimens (regimen_code, regimen_name, description, cycle_days, max_cycles, regimen_type, is_active)
VALUES
  ('TAM-MONO', 'Tamoxifen monotherapy', 'Tamoxifen 20 mg PO daily; continuous for 5-10 years (adjuvant) or until progression (metastatic)', NULL, NULL, 'hormonal', true),
  ('LET-MONO', 'Letrozole monotherapy', 'Letrozole 2.5 mg PO daily; continuous (postmenopausal)', NULL, NULL, 'hormonal', true),
  ('ANA-MONO', 'Anastrozole monotherapy', 'Anastrozole 1 mg PO daily; continuous (postmenopausal)', NULL, NULL, 'hormonal', true),
  ('FUL-MONO', 'Fulvestrant monotherapy', 'Fulvestrant 500 mg IM on D1,15 (cycle 1), then D1 q4w', 28, NULL, 'hormonal', true),
  ('TAM-LHRH', 'Tamoxifen + LHRH agonist', 'Tamoxifen 20 mg PO daily + Leuprorelin/Triptorelin q3m (premenopausal ovarian suppression)', 84, NULL, 'hormonal', true),
  ('AI-LHRH', 'Aromatase Inhibitor + LHRH agonist', 'Letrozole 2.5 mg or Anastrozole 1 mg PO daily + Leuprorelin/Triptorelin q3m (premenopausal)', 84, NULL, 'hormonal', true),
  ('MEG-MONO', 'Megestrol acetate monotherapy', 'Megestrol acetate 160 mg PO daily', NULL, NULL, 'hormonal', true)
ON CONFLICT (regimen_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- PART 2: Regimen-drug links for new hormonal regimens
-- ═══════════════════════════════════════════════════════════════

-- TAM-MONO → tamoxifen
INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '20 mg', 'PO', 'Daily', false, 'ต่อเนื่อง 5-10 ปี (adjuvant) หรือจนโรคดำเนินไป (metastatic)'
FROM regimens r, drugs d WHERE r.regimen_code = 'TAM-MONO' AND d.generic_name = 'tamoxifen'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

-- LET-MONO → letrozole
INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '2.5 mg', 'PO', 'Daily', false, 'Postmenopausal only'
FROM regimens r, drugs d WHERE r.regimen_code = 'LET-MONO' AND d.generic_name = 'letrozole'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

-- ANA-MONO → anastrozole
INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1 mg', 'PO', 'Daily', false, 'Postmenopausal only'
FROM regimens r, drugs d WHERE r.regimen_code = 'ANA-MONO' AND d.generic_name = 'anastrozole'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

-- FUL-MONO → fulvestrant
INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '500 mg', 'IM', 'Day 1, 15 (C1), then Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'FUL-MONO' AND d.generic_name = 'fulvestrant'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

-- TAM-LHRH → tamoxifen + leuprorelin
INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '20 mg', 'PO', 'Daily', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'TAM-LHRH' AND d.generic_name = 'tamoxifen'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '11.25 mg or 22.5 mg', 'SC/IM', 'q3m or q6m', false, 'หรือ Triptorelin'
FROM regimens r, drugs d WHERE r.regimen_code = 'TAM-LHRH' AND d.generic_name = 'leuprorelin acetate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

-- AI-LHRH → letrozole + leuprorelin (anastrozole as alternative noted)
INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '2.5 mg', 'PO', 'Daily', false, 'หรือ Anastrozole 1 mg'
FROM regimens r, drugs d WHERE r.regimen_code = 'AI-LHRH' AND d.generic_name = 'letrozole'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '11.25 mg or 22.5 mg', 'SC/IM', 'q3m or q6m', false, 'หรือ Triptorelin'
FROM regimens r, drugs d WHERE r.regimen_code = 'AI-LHRH' AND d.generic_name = 'leuprorelin acetate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

-- MEG-MONO → megestrol acetate
INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '160 mg', 'PO', 'Daily', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'MEG-MONO' AND d.generic_name = 'megestrol acetate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- PART 3: Protocol-Regimen links for C0113 and C0114
-- ═══════════════════════════════════════════════════════════════

-- C0113: Hormonal therapy for early-stage breast cancer (adjuvant)
-- Standard: Tamoxifen (premenopausal) or AI (postmenopausal) for 5-10 years
INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, 'First-line adjuvant ทั้ง pre/postmenopausal'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0113' AND r.regimen_code = 'TAM-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, 'Postmenopausal หรือ switch หลัง Tamoxifen 2-3 ปี'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0113' AND r.regimen_code = 'LET-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, 'Postmenopausal ทางเลือก AI'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0113' AND r.regimen_code = 'ANA-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, 'Premenopausal + ovarian suppression'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0113' AND r.regimen_code = 'TAM-LHRH'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, 'Premenopausal + ovarian suppression (AI arm)'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0113' AND r.regimen_code = 'AI-LHRH'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

-- C0114: Hormonal therapy for metastatic breast cancer (palliative)
-- Per SSO: AI or Tamoxifen as 1st-line; Fulvestrant as 2nd-line
INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, 'First-line metastatic (postmenopausal)'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0114' AND r.regimen_code = 'LET-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, 'First-line ทางเลือก AI'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0114' AND r.regimen_code = 'ANA-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, 'First-line (all menopausal status)'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0114' AND r.regimen_code = 'TAM-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 2, false, 'Second-line หลัง AI failure'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0114' AND r.regimen_code = 'FUL-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 2, false, 'Second-line'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0114' AND r.regimen_code = 'MEG-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, 'Premenopausal + ovarian suppression'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0114' AND r.regimen_code = 'TAM-LHRH'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

-- Also link LHRH-AGONIST (already exists) to breast cancer protocols for premenopausal patients
INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, NULL, false, 'Ovarian suppression สำหรับ premenopausal (ร่วมกับ Tamoxifen/AI)'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0113' AND r.regimen_code = 'LHRH-AGONIST'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, NULL, false, 'Ovarian suppression สำหรับ premenopausal'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0114' AND r.regimen_code = 'LHRH-AGONIST'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- PART 4: Trade name aliases for drug matching
-- Based on CCUF SSO drug code list from cancer_full.txt
-- Same SSO codes = same official product. Aliases use generated codes.
-- ═══════════════════════════════════════════════════════════════

-- Tamoxifen aliases (MAMOFEN is the most common Thai generic)
-- SSO CCUF entries: 209092 (10mg FCT), 209102 (10mg tab), 209118 (20mg FCT), 209125 (20mg tab)
-- These are all listed as "Nolvadex" in seed 004. Adding MAMOFEN as additional trade name alias.
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'TAM-GEN-10', 'MAMOFEN', 'film-coated tablet', '10 mg', 'tablet', '2.75', true
FROM drugs d WHERE d.generic_name = 'tamoxifen'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'TAM-GEN-20', 'MAMOFEN', 'film-coated tablet', '20 mg', 'tablet', '4.75', true
FROM drugs d WHERE d.generic_name = 'tamoxifen'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'TAMPLX10', 'TAMOPLEX', 'film-coated tablet', '10 mg', 'tablet', '2.75', true
FROM drugs d WHERE d.generic_name = 'tamoxifen'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'TAMPLX20', 'TAMOPLEX', 'film-coated tablet', '20 mg', 'tablet', '4.75', true
FROM drugs d WHERE d.generic_name = 'tamoxifen'
ON CONFLICT (drug_code) DO NOTHING;

-- Letrozole alias (Thai generics)
-- SSO CCUF: 206076 (2.5mg FCT) = Femara
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'LET-GEN-25', 'LETROLE', 'film-coated tablet', '2.5 mg', 'tablet', '22.75', true
FROM drugs d WHERE d.generic_name = 'letrozole'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'LETRZL25', 'LETROZOL', 'film-coated tablet', '2.5 mg', 'tablet', '22.75', true
FROM drugs d WHERE d.generic_name = 'letrozole'
ON CONFLICT (drug_code) DO NOTHING;

-- Anastrozole alias
-- SSO CCUF: 200443 (1mg FCT) = Arimidex
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'ANA-GEN-1', 'ANASTROL', 'film-coated tablet', '1 mg', 'tablet', '19.5', true
FROM drugs d WHERE d.generic_name = 'anastrozole'
ON CONFLICT (drug_code) DO NOTHING;

-- Capecitabine aliases
-- SSO CCUF: 201087 (150mg FCT), 201104 (500mg FCT) = Xeloda
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'CAPTE150', 'CAPETERO', 'film-coated tablet', '150 mg', 'tablet', NULL, true
FROM drugs d WHERE d.generic_name = 'capecitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'CAPTE500', 'CAPETERO', 'film-coated tablet', '500 mg', 'tablet', NULL, true
FROM drugs d WHERE d.generic_name = 'capecitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'CAPBI500', 'CAPEBINE', 'film-coated tablet', '500 mg', 'tablet', NULL, true
FROM drugs d WHERE d.generic_name = 'capecitabine'
ON CONFLICT (drug_code) DO NOTHING;

-- Fulvestrant trade name (missing entirely from seed 004)
-- SSO CCUF does not list fulvestrant separately, but Faslodex is the standard brand
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'FUL-250-1', 'Faslodex', 'solution for injection', '250 mg/5 mL', 'prefilled syringe', NULL, true
FROM drugs d WHERE d.generic_name = 'fulvestrant'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'FUL-250-2', 'Faslodex', 'solution for injection', '250 mg/5 mL', 'prefilled syringe', NULL, true
FROM drugs d WHERE d.generic_name = 'fulvestrant'
ON CONFLICT (drug_code) DO NOTHING;

-- Docetaxel aliases (only 2 entries in seed 004 vs 19 for Paclitaxel)
-- SSO CCUF: 667633 (20mg/1mL), 947808 (80mg/4mL)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'DOCTE20', 'DOCETERO', 'concentrate for solution for infusion', '20 mg/1 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'docetaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'DOCTE80', 'DOCETERO', 'concentrate for solution for infusion', '80 mg/4 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'docetaxel'
ON CONFLICT (drug_code) DO NOTHING;

-- Gemcitabine aliases (common Thai generics)
-- SSO CCUF has many entries (148-165). Adding generic alias.
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'GEMTE200', 'GEMTERO', 'powder for solution for infusion', '200 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, 'GEMTE1G', 'GEMTERO', 'powder for solution for infusion', '1 g', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;
