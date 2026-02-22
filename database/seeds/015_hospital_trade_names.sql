-- ============================================================
-- 015: Hospital-specific Thai trade names / local generic brands
-- Maps common hospital medication names to the drugs table
-- ============================================================

-- Paclitaxel (id=25) — Taxol already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (25, 'INTAXEL', 'INTAXEL', 'injection', '300mg/50ml vial', true),
  (25, 'INTAXL30', 'INTAXEL 30', 'injection', '30mg/5ml vial', true)
ON CONFLICT DO NOTHING;

-- Carboplatin (id=9) — Paraplatin already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (9, 'KEMOCARB', 'KEMOCARB', 'injection', '450mg/45ml vial', true),
  (9, 'KEMCRB15', 'KEMOCARB 150', 'injection', '150mg/15ml vial', true)
ON CONFLICT DO NOTHING;

-- Cisplatin (id=8) — Platinol already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (8, 'KEMOPLAT', 'KEMOPLAT', 'injection', '50mg/50ml vial', true),
  (8, 'KEMOP10', 'KEMOPLAT 10', 'injection', '10mg/10ml vial', true)
ON CONFLICT DO NOTHING;

-- Gemcitabine (id=15) — Gemzar already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (15, 'GEMITA', 'GEMITA', 'injection', '1000mg vial', true),
  (15, 'GEMIT200', 'GEMITA200', 'injection', '200mg vial', true)
ON CONFLICT DO NOTHING;

-- Docetaxel (id=26) — Taxotere already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (26, 'DOXATEL', 'DOXATEL', 'injection', '80mg/2ml vial', true),
  (26, 'DOXATL20', 'DOXATEL 20', 'injection', '20mg/0.5ml vial', true)
ON CONFLICT DO NOTHING;

-- Doxorubicin (id=20)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (20, 'ADRIM', 'ADRIM', 'injection', '50mg vial', true),
  (20, 'ADRIM10', 'ADRIM 10', 'injection', '10mg vial', true)
ON CONFLICT DO NOTHING;

-- Cyclophosphamide (id=1) — Endoxan already exists (check case)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (1, 'CYCLOXAN', 'CYCLOXAN', 'injection', '500mg vial', true),
  (1, 'ENDOXAN', 'ENDOXAN', 'injection', '500mg vial', true)
ON CONFLICT DO NOTHING;

-- Vincristine (id=27) — Oncovin already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (27, 'VCS', 'V.C.S.', 'injection', '1mg/ml vial', true),
  (27, 'VCSINJ', 'V.C.S. INJECTION', 'injection', '1mg/ml vial', true)
ON CONFLICT DO NOTHING;

-- Rituximab (id=48) — Rituxan already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (48, 'ACELLBIA', 'ACELLBIA', 'injection', '500mg/50ml vial', true),
  (48, 'TRUXIMA', 'TRUXIMA', 'injection', '500mg/50ml vial', true)
ON CONFLICT DO NOTHING;

-- Trastuzumab (id=47) — Herceptin already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (47, 'HERZUMA', 'HERZUMA', 'injection', '420mg vial', true),
  (47, 'TRAZIMRA', 'TRAZIMERA', 'injection', '420mg vial', true),
  (47, 'TRAST44', 'TRASTUZUMAB 440MG INJ', 'injection', '440mg vial', true)
ON CONFLICT DO NOTHING;

-- Fluorouracil (id=11) — Efudex already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (11, '5FU', '5-FLUOROURACIL', 'injection', '500mg/10ml vial', true)
ON CONFLICT DO NOTHING;

-- Methotrexate (id=13) — Emthexate already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (13, 'BIOTREX', 'BIOTREXATE', 'injection', '50mg vial', true),
  (13, 'ZEXATE50', 'ZEXATE-50', 'injection', '50mg vial', true)
ON CONFLICT DO NOTHING;

-- Folinic acid / Leucovorin (id=60)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (60, 'RESCUVLN', 'RESCUVOLIN', 'injection', '50mg vial', true)
ON CONFLICT DO NOTHING;

-- Oxaliplatin (id=10) — Eloxatin already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (10, 'OXALIP', 'OXALIP INJECTION', 'injection', '100mg vial', true)
ON CONFLICT DO NOTHING;

-- Ondansetron (id=87) — supportive care
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (87, 'ONSIA', 'ONSIA', 'injection', '4mg/2ml amp', true),
  (87, 'ONSIA8', 'ONSIA 8', 'tablet', '8mg tablet', true)
ON CONFLICT DO NOTHING;

-- Dexamethasone (id=81)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (81, 'DEXASONE', 'DEXASONE', 'tablet', '4mg tablet', true),
  (81, 'DEXAINJ', 'DEXAMETHASONE SODIUM PHOSPHATE INJECTION 4 mg/ml', 'injection', '4mg/ml amp', true)
ON CONFLICT DO NOTHING;

-- Bortezomib (id=77)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (77, 'BORTERO', 'BORTERO', 'injection', '3.5mg vial', true),
  (77, 'TEVAZOM', 'TEVAZOMIB', 'injection', '3.5mg vial', true)
ON CONFLICT DO NOTHING;

-- Bicalutamide (id=38)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (38, 'BICAL50', 'BICAL-50', 'tablet', '50mg tablet', true)
ON CONFLICT DO NOTHING;

-- Imatinib (id=44) — Glivec already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (44, 'GLIVEC', 'GLIVEC 100 MG', 'tablet', '100mg tablet', true),
  (44, 'IMAT100', 'IMATINIB TEVA 100', 'tablet', '100mg tablet', true)
ON CONFLICT DO NOTHING;

-- Palbociclib (id=54)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (54, 'IBRANCE', 'IBRANCE', 'capsule', '125mg capsule', true)
ON CONFLICT DO NOTHING;

-- Ribociclib (id=53)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (53, 'KISQALI', 'KISQALI', 'tablet', '200mg tablet', true)
ON CONFLICT DO NOTHING;

-- Atezolizumab (id=74)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (74, 'TECNTRQ', 'TECENTRIQ', 'injection', '1200mg vial', true)
ON CONFLICT DO NOTHING;

-- Osimertinib (id=88)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (88, 'TAGRISS', 'TAGRISSO', 'tablet', '80mg tablet', true)
ON CONFLICT DO NOTHING;

-- Pazopanib (id=89)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (89, 'VOTRIENT', 'VOTRIENT', 'tablet', '400mg tablet', true)
ON CONFLICT DO NOTHING;

-- Etoposide (id=22) — VePesid already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (22, 'ETOPOSD', 'ETOPOSIDE', 'injection', '100mg/5ml vial', true)
ON CONFLICT DO NOTHING;

-- Ifosfamide (id=2) — Holoxan already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (2, 'IFOSFA', 'IFOSFAMIDE', 'injection', '1000mg vial', true)
ON CONFLICT DO NOTHING;

-- Filgrastim (id=57) — Neupogen already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (57, 'NEUTMAX', 'NEUTROMAX', 'injection', '300mcg syringe', true)
ON CONFLICT DO NOTHING;

-- Zoledronic acid (id=62) — Zometa already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (62, 'ZOLENNI', 'ZOLENNIC', 'injection', '4mg/5ml vial', true)
ON CONFLICT DO NOTHING;

-- Abiraterone (id=70)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (70, 'ABIRSND', 'ABIRATERONE SANDOZ', 'tablet', '500mg tablet', true)
ON CONFLICT DO NOTHING;

-- Prednisolone (id=63)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (63, 'PREDTAB', 'PREDNISOLONE TABLETS 5 mg 500', 'tablet', '5mg tablet', true)
ON CONFLICT DO NOTHING;

-- Leuprorelin (id=41) — Lucrin already exists
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (41, 'ENANTON', 'ENANTONE L.P. 11.25 MG 1 prefilled syr', 'injection', '11.25mg syringe', true)
ON CONFLICT DO NOTHING;

-- BCG (id=67)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (67, 'BCGMED', 'BCG-MEDAC', 'injection', 'vial', true)
ON CONFLICT DO NOTHING;

-- Bleomycin (id=30)
-- No specific hospital alias needed

-- Mesna (id=59)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (59, 'MESNAINJ', 'MESNA', 'injection', '400mg/4ml amp', true)
ON CONFLICT DO NOTHING;

-- Vinorelbine (id=29)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (29, 'VERSAVO', 'VERSAVO', 'injection', '50mg/5ml vial', true)
ON CONFLICT DO NOTHING;

-- Acyclovir (id=71)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (71, 'VILERM', 'VILERM', 'tablet', '400mg tablet', true)
ON CONFLICT DO NOTHING;

-- Hydrocortisone (id=64)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (64, 'HCINJ', 'HYDROCORTISONE SODIUM SUCCINATE FOR INJECTION B.P. 100 MG.', 'injection', '100mg vial', true)
ON CONFLICT DO NOTHING;

-- Allopurinol (id=61)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (61, 'UXORIC', 'UXORIC', 'tablet', '300mg tablet', true),
  (61, 'ALLO100', 'ALLOPURINOL TABLETS 100 mg 500', 'tablet', '100mg tablet', true)
ON CONFLICT DO NOTHING;

-- Hydroxycarbamide (id=65)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (65, 'HIDIL', 'HIDIL', 'capsule', '500mg capsule', true)
ON CONFLICT DO NOTHING;

-- Sorafenib (id=96)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (96, 'SORAF', 'SORAFENIB', 'tablet', '200mg tablet', true)
ON CONFLICT DO NOTHING;

-- Sunitinib (id=97)
INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, is_active)
VALUES
  (97, 'SUNITNB', 'SUNITINIB', 'capsule', '50mg capsule', true)
ON CONFLICT DO NOTHING;

-- Epoetin alfa (filgrastim id=57 used for EPIAO — actually erythropoietin, not in DB)
-- EPIAO is erythropoietin — skip (not a chemo drug in our DB)

-- Morphine, Tramadol, etc — supportive care, skip
-- IV fluids (D-5-W, NSS, etc.) — skip
-- Non-chemo supportives (PEPFAMIN, LORA, SENOKOT, etc.) — skip
