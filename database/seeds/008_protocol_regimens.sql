-- 008: Protocol Regimens — protocol to regimen mappings

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0111' AND r.regimen_code = 'AC'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0111' AND r.regimen_code = 'AC-T'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0111' AND r.regimen_code = 'CMF'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0111' AND r.regimen_code = 'FAC'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0111' AND r.regimen_code = 'TAC'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0111' AND r.regimen_code = 'TC'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0112' AND r.regimen_code = 'CAPE-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, 'HER2+ patients'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0112' AND r.regimen_code = 'PACLI-TRAS'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C011P' AND r.regimen_code = 'PALBO-FUL'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C011P' AND r.regimen_code = 'PALBO-LET'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C011P' AND r.regimen_code = 'RIBO-FUL'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C011P' AND r.regimen_code = 'RIBO-LET'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, 'Weekly cisplatin 40 mg/m2'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0211' AND r.regimen_code = 'CIS-RT'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0213' AND r.regimen_code = 'CARBO-PACLI-GYN'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0213' AND r.regimen_code = 'CIS-5FU'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0311' AND r.regimen_code = 'CARBO-PACLI-GYN'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0313' AND r.regimen_code = 'BEP'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0511' AND r.regimen_code = 'CIS-RT'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0512' AND r.regimen_code = 'CIS-RT'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0513' AND r.regimen_code = 'TPF'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0515' AND r.regimen_code = 'CIS-RT'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0611' AND r.regimen_code = 'CARBO-PACLI'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0611' AND r.regimen_code = 'CIS-ETO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0611' AND r.regimen_code = 'GEM-CIS'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0614' AND r.regimen_code = 'CARBO-PACLI'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0614' AND r.regimen_code = 'GEM-CARBO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0614' AND r.regimen_code = 'GEM-CIS'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 2, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0615' AND r.regimen_code = 'DOCE-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0618' AND r.regimen_code = 'CARBO-ETO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0618' AND r.regimen_code = 'CIS-ETO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0619' AND r.regimen_code = 'CARBO-ETO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0619' AND r.regimen_code = 'CIS-ETO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0711' AND r.regimen_code = '5FU-LV'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0711' AND r.regimen_code = 'CAPE-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0711' AND r.regimen_code = 'mFOLFOX6'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0711' AND r.regimen_code = 'XELOX'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0714' AND r.regimen_code = 'FOLFIRI'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0714' AND r.regimen_code = 'FOLFOX4'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0714' AND r.regimen_code = 'mFOLFOX6'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0714' AND r.regimen_code = 'XELOX'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, 'With concurrent radiation'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0715' AND r.regimen_code = 'CIS-5FU'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0717' AND r.regimen_code = 'HIPEC-MMC'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0915' AND r.regimen_code = 'CIS-5FU'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C0915' AND r.regimen_code = 'XELOX-GAST'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1013' AND r.regimen_code = 'GEM-CIS'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1113' AND r.regimen_code = 'CIS-RT'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1211' AND r.regimen_code = 'LHRH-AGONIST'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1214' AND r.regimen_code = 'DOCE-PRED'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1215' AND r.regimen_code = 'DOCE-PRED'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1311' AND r.regimen_code = 'HYPER-CVAD'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1412' AND r.regimen_code = '7-PLUS-3'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1511' AND r.regimen_code = 'ATRA'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, 'With TKI'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1611' AND r.regimen_code = 'HYPER-CVAD'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, 'Hodgkin lymphoma'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1711' AND r.regimen_code = 'ABVD'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, false, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1711' AND r.regimen_code = 'CHOP'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, 'CD20+ B-cell lymphoma'
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1711' AND r.regimen_code = 'R-CHOP'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1915' AND r.regimen_code = 'VDC-IE'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C1916' AND r.regimen_code = 'VDC-IE'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C2011' AND r.regimen_code = 'DOXO-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

INSERT INTO protocol_regimens (protocol_id, regimen_id, line_of_therapy, is_preferred, notes)
SELECT pn.id, r.id, 1, true, NULL
FROM protocol_names pn, regimens r WHERE pn.protocol_code = 'C2012' AND r.regimen_code = 'DOXO-MONO'
ON CONFLICT (protocol_id, regimen_id) DO NOTHING;

