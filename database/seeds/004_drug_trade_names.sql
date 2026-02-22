-- 004: Drug Trade Names (รหัสยา SSO) — SSO drug codes with pricing

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '234092', 'Zyloric', 'tablet', '100 mg', 'tablet', '1.75', true
FROM drugs d WHERE d.generic_name = 'allopurinol'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '235275', 'Zyloric', 'film coated tab', '100 mg', 'tablet', '1.75', true
FROM drugs d WHERE d.generic_name = 'allopurinol'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '200443', 'Arimidex', 'film-coated tablet', '1 mg', 'tablet', '19.5', true
FROM drugs d WHERE d.generic_name = 'anastrozole'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '750327', 'Trisenox', 'solution for injection', '100 mg/100 mL', 'mL', NULL, true
FROM drugs d WHERE d.generic_name = 'arsenic trioxide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '520397', 'Elspar', 'powder for solution for injection', '10000 iu', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'asparaginase'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '520402', 'Elspar', 'powder for solution for injection', '10000 iu', 'vial', '4769', true
FROM drugs d WHERE d.generic_name = 'asparaginase'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '149185', 'Thymoglobulin', 'powder for solution for injection', '25 mg', 'vial', '6535', true
FROM drugs d WHERE d.generic_name = 'ATG'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '200644', 'ImmuCyst', 'powder for solution for injection', '81 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'BCG vaccine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201601', 'ImmuCyst', 'powder and solvent for suspension for injection', '81 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'BCG vaccine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '210972', 'ImmuCyst', 'powder and solvent for suspension for injection', '81 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'BCG vaccine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '210986', 'ImmuCyst', 'powder for solution for injection', '81 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'BCG vaccine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '200721', 'Casodex', 'film-coated tablet', '50 mg', 'tablet', '70', true
FROM drugs d WHERE d.generic_name = 'bicalutamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '200732', 'Casodex', 'tablet', '50 mg', 'tablet', NULL, true
FROM drugs d WHERE d.generic_name = 'bicalutamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '200778', 'Bleocin', 'powder for solution for injection', '15 mg', 'vial', '45.5', true
FROM drugs d WHERE d.generic_name = 'bleomycin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '211107', 'Bleocin', 'powder for solution for injection', '15 mg', 'vial', '45.5', true
FROM drugs d WHERE d.generic_name = 'bleomycin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '200784', 'Blenoxane', 'powder for solution for injection', '15 unit', 'vial', '1046', true
FROM drugs d WHERE d.generic_name = 'bleomycin sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '211111', 'Blenoxane', 'powder for solution for injection', '15 unit', 'vial', '1046', true
FROM drugs d WHERE d.generic_name = 'bleomycin sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '200869', 'Myleran', 'film-coated tablet', '2 mg', 'tablet', '10', true
FROM drugs d WHERE d.generic_name = 'busulfan'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '200876', 'Myleran', 'tablet', '2 mg', 'tablet', '10', true
FROM drugs d WHERE d.generic_name = 'busulfan'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201087', 'Xeloda', 'film-coated tablet', '150 mg', 'tablet', '40.5', true
FROM drugs d WHERE d.generic_name = 'capecitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201104', 'Xeloda', 'film-coated tablet', '500 mg', 'tablet', '36', true
FROM drugs d WHERE d.generic_name = 'capecitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201191', 'Paraplatin', 'powder for solution for infusion', '150 mg', 'vial', '442', true
FROM drugs d WHERE d.generic_name = 'carboplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201232', 'Paraplatin', 'concentrate for solution for infusion', '450 mg/45 mL', 'vial', '872', true
FROM drugs d WHERE d.generic_name = 'carboplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '211520', 'Paraplatin', 'powder for solution for infusion', '150 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'carboplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '211565', 'Paraplatin', 'concentrate for solution for infusion', '600 mg/60 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'carboplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '211577', 'Paraplatin', 'powder for solution for infusion', '50 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'carboplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '213484', 'Paraplatin', 'concentrate for solution for infusion', '450 mg/45 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'carboplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '904947', 'Paraplatin', 'concentrate for solution for infusion', '50 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'carboplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '952216', 'Paraplatin', 'concentrate for solution for infusion', '150 mg/15 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'carboplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '952228', 'Paraplatin', 'concentrate for solution for infusion', '150 mg/15 mL', 'vial', '442', true
FROM drugs d WHERE d.generic_name = 'carboplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201266', 'BiCNU', 'powder for solution for injection', '100 mg', 'vial', '33959', true
FROM drugs d WHERE d.generic_name = 'carmustine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '211596', 'BiCNU', 'powder for solution for injection', '100 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'carmustine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '965074', 'BiCNU', 'powder and solvent for solution for injection', '100 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'carmustine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '965088', 'BiCNU', 'powder and solvent for solution for injection', '100 mg', 'vial', '33959', true
FROM drugs d WHERE d.generic_name = 'carmustine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201330', 'Leukeran', 'film-coated tablet', '2 mg', 'tablet', '17', true
FROM drugs d WHERE d.generic_name = 'chlorambucil'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201348', 'Leukeran', 'tablet', '2 mg', 'tablet', '17', true
FROM drugs d WHERE d.generic_name = 'chlorambucil'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201714', 'Platinol', 'solution for infusion', '100 mg/100 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201722', 'Platinol', 'concentrate for solution for infusion', '50 mg/100 mL', 'vial', '288', true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201746', 'Platinol', 'powder for solution for infusion', '10 mg', 'vial', '109', true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201779', 'Platinol', 'powder for solution for infusion', '50 mg', 'vial', '303', true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212039', 'Platinol', 'solution for infusion', '100 mg/100 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212056', 'Platinol', 'powder for solution for infusion', '10 mg', 'vial', '298', true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212087', 'Platinol', 'powder for solution for infusion', '50 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '213575', 'Platinol', 'concentrate for solution for infusion', '50 mg/100 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '947686', 'Platinol', 'concentrate for solution for infusion', '10 mg/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '947693', 'Platinol', 'concentrate for solution for infusion', '10 mg/10 mL', 'vial', '104', true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '947733', 'Platinol', 'concentrate for solution for infusion', '50 mg/50 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '947746', 'Platinol', 'concentrate for solution for infusion', '50 mg/50 mL', 'vial', '380', true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '948151', 'Platinol', 'concentrate for solution for infusion', '10 mg/20 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '948167', 'Platinol', 'concentrate for solution for infusion', '10 mg/20 mL', 'vial', '109', true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '948200', 'Platinol', 'concentrate for solution for infusion', '25 mg/50 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cisplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201820', 'Endoxan', 'powder for solution for injection', '1 g', 'vial', '497', true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201831', 'Endoxan', 'powder for solution for injection', '100 mg', 'vial', '241', true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201849', 'Endoxan', 'powder for solution for injection', '200 mg', 'vial', '105', true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201854', 'Endoxan', 'film-coated tablet', '50 mg', 'tablet', '6', true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201865', 'Endoxan', 'coated tablet', '50 mg', 'tablet', '6', true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201877', 'Endoxan', 'tablet', '50 mg', 'tablet', '6', true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201883', 'Endoxan', 'powder for solution for injection', '500 mg', 'vial', '274', true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212136', 'Endoxan', 'powder for solution for injection', '1 g', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212143', 'Endoxan', 'powder for solution for injection', '100 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212158', 'Endoxan', 'powder for solution for injection', '200 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212191', 'Endoxan', 'powder for solution for injection', '500 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cyclophosphamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202032', 'Cytosar', 'powder for solution for injection/infusion', '100 mg', 'vial', '133', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202045', 'Cytosar', 'solution for injection/infusion', '1 g/10 mL', 'vial', '794', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202066', 'Cytosar', 'solution for injection/infusion', '2 g/20 mL', 'vial', '1931', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202078', 'Cytosar', 'powder for solution for injection/infusion', '500 mg', 'vial', '565', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202084', 'Cytosar', 'solution for injection/infusion', '500 mg/10 mL', 'vial', '565', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '203210', 'Cytosar', 'solution for injection/infusion', '100 mg/1 mL', 'vial', '133', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212311', 'Cytosar', 'solution for injection/infusion', '100 mg/1 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212348', 'Cytosar', 'powder for solution for injection/infusion', '100 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212376', 'Cytosar', 'solution for injection/infusion', '2 g/20 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212382', 'Cytosar', 'powder for solution for injection/infusion', '500 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212395', 'Cytosar', 'solution for injection/infusion', '500 mg/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '213510', 'Cytosar', 'solution for injection/infusion', '1 g/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '652929', 'Cytosar', 'solution for injection/infusion', '500 mg/25 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '652938', 'Cytosar', 'solution for injection/infusion', '500 mg/25 mL', 'vial', '159', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '653248', 'Cytosar', 'solution for injection/infusion', '1 g/20 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '653253', 'Cytosar', 'solution for injection/infusion', '1 g/20 mL', 'vial', '794', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '667225', 'Cytosar', 'solution for injection/infusion', '100 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '667239', 'Cytosar', 'solution for injection/infusion', '100 mg/5 mL', 'vial', '159', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '688457', 'Cytosar', 'powder for solution for injection/infusion', '2 g', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '688461', 'Cytosar', 'powder for solution for injection/infusion', '2 g', 'vial', '1931', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '948114', 'Cytosar', 'solution for injection/infusion', '500 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '948122', 'Cytosar', 'solution for injection/infusion', '500 mg/5 mL', 'vial', '595', true
FROM drugs d WHERE d.generic_name = 'cytarabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '1000473', 'DTIC-Dome', 'powder for solution for injection/infusion', '200 mg', 'vial', '2669', true
FROM drugs d WHERE d.generic_name = 'dacarbazine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202130', 'DTIC-Dome', 'powder for solution for infusion', '500 mg', 'vial', '6909', true
FROM drugs d WHERE d.generic_name = 'dacarbazine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212416', 'DTIC-Dome', 'powder for solution for infusion', '1 g', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'dacarbazine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212437', 'DTIC-Dome', 'powder for solution for injection/infusion', '200 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'dacarbazine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '656467', 'DTIC-Dome', 'powder for solution for injection/infusion', '100 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'dacarbazine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '656479', 'DTIC-Dome', 'powder for solution for injection/infusion', '100 mg', 'vial', '1430', true
FROM drugs d WHERE d.generic_name = 'dacarbazine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '656507', 'DTIC-Dome', 'powder for solution for infusion', '500 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'dacarbazine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212471', 'Cosmegen', 'powder for solution for injection', '500 mcg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'dactinomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '824027', 'Cosmegen', 'powder for solution for injection', '500 mcg', 'vial', '4097', true
FROM drugs d WHERE d.generic_name = 'dactinomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202239', 'Sprycel', 'film-coated tablet', '50 mg', 'tablet', NULL, true
FROM drugs d WHERE d.generic_name = 'dasatinib'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202241', 'Sprycel', 'film-coated tablet', '70 mg', 'tablet', NULL, true
FROM drugs d WHERE d.generic_name = 'dasatinib'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '667633', 'Taxotere', 'concentrate for solution for infusion', '20 mg/1 mL', 'vial', '606', true
FROM drugs d WHERE d.generic_name = 'docetaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '947808', 'Taxotere', 'concentrate for solution for infusion', '80 mg/4 mL', 'vial', '2320', true
FROM drugs d WHERE d.generic_name = 'docetaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '201981', 'Adriamycin', 'concentrate for solution for infusion', '10 mg/5 mL', 'vial', '127', true
FROM drugs d WHERE d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202009', 'Adriamycin', 'powder for solution for infusion', '10 mg', 'vial', '127', true
FROM drugs d WHERE d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202944', 'Adriamycin', 'concentrate for solution for infusion', '50 mg/25 mL', 'vial', '319', true
FROM drugs d WHERE d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '202971', 'Adriamycin', 'powder for solution for infusion', '50 mg', 'vial', '319', true
FROM drugs d WHERE d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '212798', 'Adriamycin', 'concentrate for solution for infusion', '10 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '213095', 'Adriamycin', 'powder for solution for infusion', '10 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '213259', 'Adriamycin', 'concentrate for solution for infusion', '50 mg/25 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '213263', 'Adriamycin', 'concentrate for solution for infusion', '20 mg/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '213285', 'Adriamycin', 'powder for solution for infusion', '50 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '203473', 'VePesid', 'capsule soft', '25 mg', 'capsule', '149', true
FROM drugs d WHERE d.generic_name = 'etoposide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '203487', 'VePesid', 'capsule soft', '50 mg', 'capsule', '319', true
FROM drugs d WHERE d.generic_name = 'etoposide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '203494', 'VePesid', 'concentrate for solution for infusion', '100 mg/5 mL', 'vial', '209', true
FROM drugs d WHERE d.generic_name = 'etoposide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '213762', 'VePesid', 'concentrate for solution for infusion', '200 mg/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'etoposide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '213791', 'VePesid', 'concentrate for solution for infusion', '100 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'etoposide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '213801', 'VePesid', 'concentrate for solution for infusion', '50 mg/2.5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'etoposide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '1020884', 'Neupogen', 'solution for injection/infusion', '480 mcg/1.6 mL', 'prefilled syringe', '720', true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '203965', 'Neupogen', 'solution for injection/infusion', '480 mcg/1.6 mL', 'vial', '824', true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '214283', 'Neupogen', 'solution for injection/infusion', '480 mcg/1.6 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '214296', 'Neupogen', 'solution for injection/infusion', '75 mcg/0.3 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '668089', 'Neupogen', 'solution for injection/infusion', '300 mcg/1 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '668091', 'Neupogen', 'solution for injection/infusion', '300 mcg/1 mL', 'vial', '442', true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '878402', 'Neupogen', 'solution for injection/infusion', '300 mcg/1.2 mL', 'ampoule', NULL, true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '878418', 'Neupogen', 'solution for injection/infusion', '300 mcg/1.2 mL', 'ampoule', '442', true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '959320', 'Neupogen', 'solution for injection/infusion', '300 mcg/1 mL', 'prefilled syringe', '500', true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '959331', 'Neupogen', 'solution for injection/infusion', '300 mcg/0.5 mL', 'prefilled syringe', NULL, true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '959349', 'Neupogen', 'solution for injection/infusion', '300 mcg/0.5 mL', 'prefilled syringe', '500', true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '959354', 'Neupogen', 'solution for injection/infusion', '480 mcg/0.5 mL', 'prefilled syringe', NULL, true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '959365', 'Neupogen', 'solution for injection/infusion', '480 mcg/0.5 mL', 'prefilled syringe', '720', true
FROM drugs d WHERE d.generic_name = 'filgrastim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '204033', 'Fludara', 'powder for solution for injection/infusion', '50 mg', 'vial', '5093', true
FROM drugs d WHERE d.generic_name = 'fludarabine phosphate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '214334', 'Fludara', 'powder for solution for injection/infusion', '50 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'fludarabine phosphate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '199724', 'Adrucil', 'solution for injection/infusion', '1 g/20 mL', 'vial', '145', true
FROM drugs d WHERE d.generic_name = 'fluorouracil'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '210051', 'Adrucil', 'solution for injection/infusion', '1 g/20 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'fluorouracil'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '210108', 'Adrucil', 'solution for injection/infusion', '5 g/100 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'fluorouracil'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216544', 'Adrucil', 'solution for injection/infusion', '250 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'fluorouracil'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '562682', 'Adrucil', 'solution for injection/infusion', '250 mg/5 mL', 'vial', '61', true
FROM drugs d WHERE d.generic_name = 'fluorouracil'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '965438', 'Adrucil', 'solution for injection/infusion', '500 mg/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'fluorouracil'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '965440', 'Adrucil', 'solution for injection/infusion', '500 mg/10 mL', 'vial', '73', true
FROM drugs d WHERE d.generic_name = 'fluorouracil'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '204080', 'Eulexin', 'tablet', '250 mg', 'tablet', '60', true
FROM drugs d WHERE d.generic_name = 'flutamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '564341', 'Leucovorin', 'solution for injection', '50 mg/5 mL', 'vial', '131', true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '564387', 'Leucovorin', 'solution for injection', '50 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '564445', 'Leucovorin', 'solution for injection', '100 mg/10 mL', 'vial', '528', true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '564506', 'Leucovorin', 'solution for injection', '50 mg/4 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '564510', 'Leucovorin', 'solution for injection', '50 mg/4 mL', 'vial', '131', true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '684464', 'Leucovorin', 'tablet', '15 mg', 'tablet', '12.5', true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '720142', 'Leucovorin', 'powder for solution for injection', '15 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '842009', 'Leucovorin', 'solution for injection', '25 mg/1 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '904865', 'Leucovorin', 'capsule hard', '15 mg', 'capsule', '12.5', true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '904906', 'Leucovorin', 'solution for injection', '100 mg/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '905072', 'Leucovorin', 'solution for injection', '300 mg/30 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '905086', 'Leucovorin', 'solution for injection', '300 mg/30 mL', 'vial', '322', true
FROM drugs d WHERE d.generic_name = 'folinic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '1011727', 'Gemzar', 'powder for solution for infusion', '2 g', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '1265042', 'Gemzar', 'concentrate for solution for infusion', '1.4 g/36.8 mL', 'vial', '1827', true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '1265171', 'Gemzar', 'concentrate for solution for infusion', '200 mg/5.26 mL', 'vial', '362', true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '1265440', 'Gemzar', 'concentrate for solution for infusion', '1.4 g/36.8 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '1265455', 'Gemzar', 'concentrate for solution for infusion', '1 g/26.3 mL', 'vial', '664', true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '204226', 'Gemzar', 'powder for solution for infusion', '1.4 g', 'vial', '1827', true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '204235', 'Gemzar', 'concentrate for solution for infusion', '1 g/100 mL', 'vial', '664', true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '214525', 'Gemzar', 'powder for solution for infusion', '1.4 g', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '214539', 'Gemzar', 'concentrate for solution for infusion', '1 g/100 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '824846', 'Gemzar', 'powder for solution for infusion', '200 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '824851', 'Gemzar', 'powder for solution for infusion', '200 mg', 'vial', '362', true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '824880', 'Gemzar', 'powder for solution for infusion', '1 g', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '824898', 'Gemzar', 'powder for solution for infusion', '1 g', 'vial', '664', true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '872100', 'Gemzar', 'concentrate for solution for infusion', '200 mg/20 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '872144', 'Gemzar', 'concentrate for solution for infusion', '200 mg/20 mL', 'vial', '303', true
FROM drugs d WHERE d.generic_name = 'gemcitabine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '849295', 'Solu-Cortef', 'powder for solution for infusion', '100 mg', 'vial', '90', true
FROM drugs d WHERE d.generic_name = 'hydrocortisone'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '204773', 'Hydrea', 'capsule hard', '500 mg', 'capsule', '18', true
FROM drugs d WHERE d.generic_name = 'hydroxycarbamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '205113', 'Zavedos', 'solution for injection', '10 mg/10 mL', 'vial', '5807', true
FROM drugs d WHERE d.generic_name = 'idarubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '205132', 'Zavedos', 'powder for solution for injection', '10 mg', 'vial', '5807', true
FROM drugs d WHERE d.generic_name = 'idarubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '205166', 'Zavedos', 'powder for solution for injection', '5 mg', 'vial', '3526', true
FROM drugs d WHERE d.generic_name = 'idarubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '215379', 'Zavedos', 'solution for injection', '10 mg/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'idarubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '215398', 'Zavedos', 'powder for solution for injection', '10 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'idarubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '215426', 'Zavedos', 'powder for solution for injection', '5 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'idarubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '653731', 'Zavedos', 'solution for injection', '5 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'idarubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '667327', 'Zavedos', 'solution for injection', '5 mg/5 mL', 'vial', '3526', true
FROM drugs d WHERE d.generic_name = 'idarubicin hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '205178', 'Holoxan', 'concentrate for solution for infusion', '1 g/25 mL', 'vial', '1415', true
FROM drugs d WHERE d.generic_name = 'ifosfamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '205184', 'Holoxan', 'powder for concentrate for solution for infusion', '1 g', 'vial', '1415', true
FROM drugs d WHERE d.generic_name = 'ifosfamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '205197', 'Holoxan', 'powder for concentrate for solution for infusion', '500 mg', 'vial', '718', true
FROM drugs d WHERE d.generic_name = 'ifosfamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '215435', 'Holoxan', 'concentrate for solution for infusion', '1 g/25 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'ifosfamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '215442', 'Holoxan', 'powder for concentrate for solution for infusion', '1 g', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'ifosfamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '215457', 'Holoxan', 'powder for concentrate for solution for infusion', '500 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'ifosfamide'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '868245', 'Gleevec', 'film-coated tablet', '100 mg', 'tablet', NULL, true
FROM drugs d WHERE d.generic_name = 'imatinib'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '868284', 'Gleevec', 'tablet', '400 mg', 'tablet', NULL, true
FROM drugs d WHERE d.generic_name = 'imatinib'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '205761', 'Campto', 'concentrate for solution for infusion', '40 mg/2 mL', 'vial', '872', true
FROM drugs d WHERE d.generic_name = 'irinotecan hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '211928', 'Campto', 'concentrate for solution for infusion', '40 mg/2 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'irinotecan hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216027', 'Campto', 'concentrate for solution for infusion', '100 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'irinotecan hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '667304', 'Campto', 'concentrate for solution for infusion', '300 mg/15 mL', 'vial', '9745', true
FROM drugs d WHERE d.generic_name = 'irinotecan hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '804354', 'Campto', 'concentrate for solution for infusion', '100 mg/5 mL', 'vial', '1591', true
FROM drugs d WHERE d.generic_name = 'irinotecan hydrochloride'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '262631', 'Nizoral', 'tablet', '200 mg', 'tablet', '16', true
FROM drugs d WHERE d.generic_name = 'ketoconazole'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '353110', 'Nizoral', 'film-coated tablet', '200 mg', 'tablet', '16', true
FROM drugs d WHERE d.generic_name = 'ketoconazole'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206030', 'Granocyte', 'powder and solvent for solution for injection/infusion', '100 mcg', 'vial', '816', true
FROM drugs d WHERE d.generic_name = 'lenograstim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206048', 'Granocyte', 'powder and solvent for solution for injection/infusion', '250 mcg', 'vial', '1085', true
FROM drugs d WHERE d.generic_name = 'lenograstim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216299', 'Granocyte', 'powder and solvent for solution for injection/infusion', '100 mcg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'lenograstim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216309', 'Granocyte', 'powder and solvent for solution for injection/infusion', '250 mcg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'lenograstim'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206076', 'Femara', 'film-coated tablet', '2.5 mg', 'tablet', '22.75', true
FROM drugs d WHERE d.generic_name = 'letrozole'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '721820', 'Lucrin', 'powder and solvent for solution for injection', '22.5 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'leuprorelin acetate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '721831', 'Lucrin', 'powder and solvent for solution for injection', '22.5 mg', 'vial', '8112', true
FROM drugs d WHERE d.generic_name = 'leuprorelin acetate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '863023', 'Lucrin', 'powder and solvent for prolonged-release suspension for injection', '11.25 mg', 'prefilled syringe', NULL, true
FROM drugs d WHERE d.generic_name = 'leuprorelin acetate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '961497', 'Lucrin', 'powder and solvent for prolonged-release suspension for injection', '11.25 mg', 'prefilled syringe', '8182', true
FROM drugs d WHERE d.generic_name = 'leuprorelin acetate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206421', 'Megace', 'tablet', '160 mg', 'tablet', '97', true
FROM drugs d WHERE d.generic_name = 'megestrol acetate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206484', 'Alkeran', 'film-coated tablet', '2 mg', 'tablet', '20', true
FROM drugs d WHERE d.generic_name = 'melphalan'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206510', 'Puri-Nethol', 'tablet', '50 mg', 'tablet', NULL, true
FROM drugs d WHERE d.generic_name = 'mercaptopurine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '569041', 'Uromitexan', 'solution for injection', '400 mg/4 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'mesna'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '569056', 'Uromitexan', 'solution for injection', '400 mg/4 mL', 'ampoule', '116', true
FROM drugs d WHERE d.generic_name = 'mesna'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '203500', 'Emthexate', 'solution for injection', '50 mg/2 mL', 'vial', '138', true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206523', 'Emthexate', 'solution for injection', '500 mg/5 mL', 'vial', '5004', true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206568', 'Emthexate', 'tablet', '2.5 mg', 'tablet', '4', true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206581', 'Emthexate', 'solution for injection', '1 g/10 mL', 'vial', '1096', true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206612', 'Emthexate', 'solution for injection', '5 g/50 mL', 'vial', '4288', true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206620', 'Emthexate', 'solution for injection', '50 mg/5 mL', 'vial', '109', true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206631', 'Emthexate', 'solution for injection', '500 mg/20 mL', 'vial', '98', true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216782', 'Emthexate', 'solution for injection', '1 g/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216846', 'Emthexate', 'solution for injection', '5 g/50 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216879', 'Emthexate', 'solution for injection', '50 mg/2 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216880', 'Emthexate', 'solution for injection', '50 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216898', 'Emthexate', 'solution for injection', '500 mg/20 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216908', 'Emthexate', 'solution for injection', '500 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '862352', 'Emthexate', 'film-coated tablet', '2.5 mg', 'tablet', '4', true
FROM drugs d WHERE d.generic_name = 'methotrexate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '1181160', 'Mutamycin', 'solution for injection', '100 mcg/1 mL', 'prefilled syringe', NULL, true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206665', 'Mutamycin', 'powder for solution for injection/infusion', '10 mg', 'vial', '759', true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206677', 'Mutamycin', 'powder for solution for injection/infusion', '2 mg', 'vial', '264', true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206704', 'Mutamycin', 'powder for solution for injection/infusion', '20 mg', 'vial', '1903', true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216931', 'Mutamycin', 'powder for solution for injection/infusion', '2 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216965', 'Mutamycin', 'powder for solution for injection/infusion', '20 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '972638', 'Mutamycin', 'powder for solution for injection/infusion', '10 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '983653', 'Mutamycin', 'solution for injection', '20 mg/100 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '983669', 'Mutamycin', 'solution for injection', '20 mg/100 mL', 'vial', '85', true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '983703', 'Mutamycin', 'solution for injection', '40 mg/100 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '987801', 'Mutamycin', 'solution for injection', '28.6 mg/100 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'mitomycin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '203805', 'Novantrone', 'concentrate for solution for infusion', '20 mg/10 mL', 'vial', '7062', true
FROM drugs d WHERE d.generic_name = 'mitoxantrone'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '206715', 'Novantrone', 'concentrate for solution for infusion', '10 mg/5 mL', 'vial', '4329', true
FROM drugs d WHERE d.generic_name = 'mitoxantrone'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216977', 'Novantrone', 'concentrate for solution for infusion', '10 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'mitoxantrone'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '216996', 'Novantrone', 'concentrate for solution for infusion', '20 mg/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'mitoxantrone'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '148243', 'Tasigna', 'capsule hard', '200 mg', 'capsule', NULL, true
FROM drugs d WHERE d.generic_name = 'nilotinib'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '207602', 'Eloxatin', 'concentrate for solution for infusion', '50 mg/25 mL', 'vial', '811', true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '207625', 'Eloxatin', 'concentrate for solution for infusion', '50 mg/10 mL', 'vial', '811', true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '207639', 'Eloxatin', 'powder for solution for infusion', '50 mg', 'vial', '811', true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '217856', 'Eloxatin', 'concentrate for solution for infusion', '150 mg/30 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '217887', 'Eloxatin', 'concentrate for solution for infusion', '50 mg/25 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '217894', 'Eloxatin', 'powder for solution for infusion', '50 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '217904', 'Eloxatin', 'concentrate for solution for infusion', '50 mg/10 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '653282', 'Eloxatin', 'concentrate for solution for infusion', '100 mg/50 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '653295', 'Eloxatin', 'concentrate for solution for infusion', '200 mg/40 mL', 'vial', '4753', true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '665980', 'Eloxatin', 'concentrate for solution for infusion', '150 mg/30 mL', 'vial', '3368', true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '667772', 'Eloxatin', 'concentrate for solution for infusion', '100 mg/50 mL', 'vial', '1387', true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '868311', 'Eloxatin', 'concentrate for solution for infusion', '100 mg/20 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '878494', 'Eloxatin', 'powder for solution for infusion', '150 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '878500', 'Eloxatin', 'powder for solution for infusion', '150 mg', 'vial', '3298', true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '917252', 'Eloxatin', 'concentrate for solution for infusion', '100 mg/20 mL', 'vial', '1387', true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '962419', 'Eloxatin', 'powder for solution for infusion', '100 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '962426', 'Eloxatin', 'powder for solution for infusion', '100 mg', 'vial', '1387', true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '965660', 'Eloxatin', 'concentrate for solution for infusion', '200 mg/40 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'oxaliplatin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '207660', 'Taxol', 'concentrate for solution for infusion', '150 mg/25 mL', 'vial', '1923', true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '217915', 'Taxol', 'concentrate for solution for infusion', '180 mg/30 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '217927', 'Taxol', 'concentrate for solution for infusion', '210 mg/35 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '217936', 'Taxol', 'concentrate for solution for infusion', '150 mg/25 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '217943', 'Taxol', 'concentrate for solution for infusion', '250 mg/41.7 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '217958', 'Taxol', 'concentrate for solution for infusion', '260 mg/43.4 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '217962', 'Taxol', 'concentrate for solution for infusion', '30 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '653071', 'Taxol', 'concentrate for solution for infusion', '600 mg/100 mL', 'vial', '1473', true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '689020', 'Taxol', 'concentrate for solution for infusion', '300 mg/50 mL', 'vial', '1473', true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '775498', 'Taxol', 'concentrate for solution for infusion', '600 mg/100 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '775507', 'Taxol', 'concentrate for solution for infusion', '260 mg/43.4 mL', 'vial', '1320', true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '844108', 'Taxol', 'powder for solution for infusion', '100 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '844112', 'Taxol', 'powder for solution for infusion', '100 mg', 'vial', '11007', true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '844149', 'Taxol', 'powder for solution for infusion', '30 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '844154', 'Taxol', 'powder for solution for infusion', '30 mg', 'vial', '1194', true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '850346', 'Taxol', 'concentrate for solution for infusion', '300 mg/50 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '862254', 'Taxol', 'concentrate for solution for infusion', '100 mg/16.7 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '878559', 'Taxol', 'concentrate for solution for infusion', '30 mg/5 mL', 'vial', '1194', true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '917206', 'Taxol', 'concentrate for solution for infusion', '100 mg/16.7 mL', 'vial', '1373', true
FROM drugs d WHERE d.generic_name = 'paclitaxel'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '237007', 'Prednisolone', 'tablet', '5 mg', 'tablet', '1', true
FROM drugs d WHERE d.generic_name = 'prednisolone'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '371231', 'Prednisolone', 'capsule hard', '5 mg', 'capsule', '1', true
FROM drugs d WHERE d.generic_name = 'prednisolone'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '415767', 'Prednisolone', 'coated tablet', '5 mg', 'tablet', '1', true
FROM drugs d WHERE d.generic_name = 'prednisolone'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '416040', 'Prednisolone', 'film-coated tablet', '5 mg', 'tablet', '1', true
FROM drugs d WHERE d.generic_name = 'prednisolone'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '653160', 'MabThera', 'powder for solution for infusion', '500 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'rituximab'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '667928', 'MabThera', 'powder for solution for infusion', '100 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'rituximab'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209092', 'Nolvadex', 'film-coated tablet', '10 mg', 'tablet', '2.75', true
FROM drugs d WHERE d.generic_name = 'tamoxifen'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209102', 'Nolvadex', 'tablet', '10 mg', 'tablet', '2.75', true
FROM drugs d WHERE d.generic_name = 'tamoxifen'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209118', 'Nolvadex', 'film-coated tablet', '20 mg', 'tablet', '4.75', true
FROM drugs d WHERE d.generic_name = 'tamoxifen'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209125', 'Nolvadex', 'tablet', '20 mg', 'tablet', '4.75', true
FROM drugs d WHERE d.generic_name = 'tamoxifen'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '867478', 'Lanvis', 'tablet', '40 mg', 'tablet', '102', true
FROM drugs d WHERE d.generic_name = 'tioguanine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209564', 'Hycamtin', 'powder for solution for injection', '4 mg', 'vial', '15214', true
FROM drugs d WHERE d.generic_name = 'topotecan'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '219800', 'Hycamtin', 'powder for solution for injection', '4 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'topotecan'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209627', 'Herceptin', 'powder for concentrate for solution for infusion', '150 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'trastuzumab'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209636', 'Herceptin', 'powder and solvent for concentrate for solution for infusion', '440 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'trastuzumab'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '651504', 'Vesanoid', 'capsule soft', '10 mg', 'capsule', '107', true
FROM drugs d WHERE d.generic_name = 'tretinoin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209662', 'Diphereline', 'powder for solution for injection', '11.25 mg', 'vial', '8182', true
FROM drugs d WHERE d.generic_name = 'triptorelin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '219902', 'Diphereline', 'powder for solution for injection', '11.25 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'triptorelin'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209160', 'UFT', 'capsule hard', '100 mg', 'capsule', '98', true
FROM drugs d WHERE d.generic_name = 'UFT (tegafur-uracil)'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209875', 'Velbe', 'solution for injection', '10 mg', 'vial', '465', true
FROM drugs d WHERE d.generic_name = 'vinblastine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209881', 'Velbe', 'powder for solution for injection', '10 mg', 'vial', '465', true
FROM drugs d WHERE d.generic_name = 'vinblastine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '220118', 'Velbe', 'solution for injection', '10 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'vinblastine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '220125', 'Velbe', 'powder for solution for injection', '10 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'vinblastine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '1012085', 'Oncovin', 'solution for injection', '2 mg/2 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'vincristine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209899', 'Oncovin', 'solution for injection', '1 mg/1 mL', 'vial', '172', true
FROM drugs d WHERE d.generic_name = 'vincristine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209909', 'Oncovin', 'powder and solvent for solution for injection', '1 mg', 'vial', '172', true
FROM drugs d WHERE d.generic_name = 'vincristine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '209913', 'Oncovin', 'powder for solution for injection', '1 mg', 'vial', '172', true
FROM drugs d WHERE d.generic_name = 'vincristine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '220141', 'Oncovin', 'powder and solvent for solution for injection', '1 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'vincristine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '220156', 'Oncovin', 'powder for solution for injection', '1 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'vincristine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '220160', 'Oncovin', 'solution for injection', '10 mg', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'vincristine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '653194', 'Oncovin', 'solution for injection', '1 mg/1 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'vincristine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '653207', 'Oncovin', 'solution for injection', '2 mg/2 mL', 'vial', '243', true
FROM drugs d WHERE d.generic_name = 'vincristine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '670792', 'Oncovin', 'solution for injection', '1 mg/1 mL', 'vial', '172', true
FROM drugs d WHERE d.generic_name = 'vincristine sulfate'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '689096', 'Navelbine', 'concentrate for solution for infusion', '50 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'vinorelbine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '689106', 'Navelbine', 'concentrate for solution for infusion', '50 mg/5 mL', 'vial', '8800', true
FROM drugs d WHERE d.generic_name = 'vinorelbine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '791761', 'Navelbine', 'concentrate for solution for infusion', '10 mg/1 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'vinorelbine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '791774', 'Navelbine', 'concentrate for solution for infusion', '10 mg/1 mL', 'vial', '2239', true
FROM drugs d WHERE d.generic_name = 'vinorelbine'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '210033', 'Zometa', 'concentrate for solution for infusion', '4 mg/5 mL', 'vial', '1473', true
FROM drugs d WHERE d.generic_name = 'zoledronic acid'
ON CONFLICT (drug_code) DO NOTHING;

INSERT INTO drug_trade_names (drug_id, drug_code, trade_name, dosage_form, strength, unit, unit_price, is_active)
SELECT d.id, '862368', 'Zometa', 'concentrate for solution for infusion', '4 mg/5 mL', 'vial', NULL, true
FROM drugs d WHERE d.generic_name = 'zoledronic acid'
ON CONFLICT (drug_code) DO NOTHING;

