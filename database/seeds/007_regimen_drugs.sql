-- 007: Regimen Drugs (ยาในสูตร) — drug compositions of regimens

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '100-200 mg/m2', 'IV CI', 'Day 1-7', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = '7-PLUS-3' AND d.generic_name = 'cytarabine'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '12 mg/m2', 'IV', 'Day 1-3', false, 'Or Daunorubicin 60-90 mg/m2'
FROM regimens r, drugs d WHERE r.regimen_code = '7-PLUS-3' AND d.generic_name = 'idarubicin hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '10 U/m2', 'IV', 'Day 1, 15', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'ABVD' AND d.generic_name = 'bleomycin sulfate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '375 mg/m2', 'IV', 'Day 1, 15', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'ABVD' AND d.generic_name = 'dacarbazine'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '25 mg/m2', 'IV', 'Day 1, 15', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'ABVD' AND d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '6 mg/m2', 'IV', 'Day 1, 15', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'ABVD' AND d.generic_name = 'vinblastine sulfate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '600 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'AC' AND d.generic_name = 'cyclophosphamide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '60 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'AC' AND d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '45 mg/m2/day', 'PO', 'Daily until CR', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'ATRA' AND d.generic_name = 'tretinoin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '30 U', 'IV', 'Day 1, 8, 15', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'BEP' AND d.generic_name = 'bleomycin sulfate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '20 mg/m2', 'IV', 'Day 1-5', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'BEP' AND d.generic_name = 'cisplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '100 mg/m2', 'IV', 'Day 1-5', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'BEP' AND d.generic_name = 'etoposide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1000-1250 mg/m2 BID', 'PO', 'Day 1-14', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CAPE-MONO' AND d.generic_name = 'capecitabine'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, 'AUC 5', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CARBO-ETO' AND d.generic_name = 'carboplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '100 mg/m2', 'IV', 'Day 1-3', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CARBO-ETO' AND d.generic_name = 'etoposide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, 'AUC 5-6', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CARBO-PACLI' AND d.generic_name = 'carboplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '175-200 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CARBO-PACLI' AND d.generic_name = 'paclitaxel'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, 'AUC 5-6', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CARBO-PACLI-GYN' AND d.generic_name = 'carboplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '175 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CARBO-PACLI-GYN' AND d.generic_name = 'paclitaxel'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '750 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CHOP' AND d.generic_name = 'cyclophosphamide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '50 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CHOP' AND d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '100 mg', 'PO', 'Day 1-5', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CHOP' AND d.generic_name = 'prednisolone'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1.4 mg/m2 (max 2 mg)', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CHOP' AND d.generic_name = 'vincristine sulfate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '100 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CIS-5FU' AND d.generic_name = 'cisplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1000 mg/m2', 'IV CI', 'Day 1-4', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CIS-5FU' AND d.generic_name = 'fluorouracil'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '75-80 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CIS-ETO' AND d.generic_name = 'cisplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '100 mg/m2', 'IV', 'Day 1-3', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CIS-ETO' AND d.generic_name = 'etoposide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '40 mg/m2 weekly or 100 mg/m2 q3w', 'IV', 'Weekly', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CIS-RT' AND d.generic_name = 'cisplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '100 mg/m2', 'PO', 'Day 1-14', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CMF' AND d.generic_name = 'cyclophosphamide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '600 mg/m2', 'IV', 'Day 1, 8', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CMF' AND d.generic_name = 'fluorouracil'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '40 mg/m2', 'IV', 'Day 1, 8', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'CMF' AND d.generic_name = 'methotrexate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '75 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'DOCE-MONO' AND d.generic_name = 'docetaxel'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '75 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'DOCE-PRED' AND d.generic_name = 'docetaxel'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '5 mg BID', 'PO', 'Daily', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'DOCE-PRED' AND d.generic_name = 'prednisolone'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '75 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'DOXO-MONO' AND d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '500 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'FAC' AND d.generic_name = 'cyclophosphamide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '50 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'FAC' AND d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '500 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'FAC' AND d.generic_name = 'fluorouracil'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '400 mg/m2 bolus + 2400 mg/m2 CI 46h', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'FOLFIRI' AND d.generic_name = 'fluorouracil'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '400 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'FOLFIRI' AND d.generic_name = 'folinic acid'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '180 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'FOLFIRI' AND d.generic_name = 'irinotecan hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '400 mg/m2 bolus + 600 mg/m2 CI', 'IV', 'Day 1, 2', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'FOLFOX4' AND d.generic_name = 'fluorouracil'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '200 mg/m2', 'IV', 'Day 1, 2', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'FOLFOX4' AND d.generic_name = 'folinic acid'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '85 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'FOLFOX4' AND d.generic_name = 'oxaliplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, 'AUC 5', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'GEM-CARBO' AND d.generic_name = 'carboplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1000 mg/m2', 'IV', 'Day 1, 8', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'GEM-CARBO' AND d.generic_name = 'gemcitabine'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '75 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'GEM-CIS' AND d.generic_name = 'cisplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1000-1250 mg/m2', 'IV', 'Day 1, 8', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'GEM-CIS' AND d.generic_name = 'gemcitabine'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, 'Per protocol', 'IP', 'Intraop', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'HIPEC-MMC' AND d.generic_name = 'mitomycin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '300 mg/m2', 'IV', 'Day 1-3 (q12h)', false, 'Courses 1,3,5,7'
FROM regimens r, drugs d WHERE r.regimen_code = 'HYPER-CVAD' AND d.generic_name = 'cyclophosphamide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '3 g/m2', 'IV', 'Day 2-3 (q12h)', false, 'Courses 2,4,6,8 - high dose Ara-C'
FROM regimens r, drugs d WHERE r.regimen_code = 'HYPER-CVAD' AND d.generic_name = 'cytarabine'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '50 mg/m2', 'IV CI', 'Day 4', false, 'Courses 1,3,5,7'
FROM regimens r, drugs d WHERE r.regimen_code = 'HYPER-CVAD' AND d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1 g/m2', 'IV', 'Day 1', false, 'Courses 2,4,6,8 - high dose'
FROM regimens r, drugs d WHERE r.regimen_code = 'HYPER-CVAD' AND d.generic_name = 'methotrexate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '2 mg', 'IV', 'Day 4, 11', false, 'Courses 1,3,5,7'
FROM regimens r, drugs d WHERE r.regimen_code = 'HYPER-CVAD' AND d.generic_name = 'vincristine sulfate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '400-600 mg', 'PO', 'Daily', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'IMATINIB-CML' AND d.generic_name = 'imatinib'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '11.25-22.5 mg', 'SC/IM', 'q3m or q6m', false, 'Or Triptorelin'
FROM regimens r, drugs d WHERE r.regimen_code = 'LHRH-AGONIST' AND d.generic_name = 'leuprorelin acetate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '400 mg/m2 bolus + 2400 mg/m2 CI 46h', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'mFOLFOX6' AND d.generic_name = 'fluorouracil'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '400 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'mFOLFOX6' AND d.generic_name = 'folinic acid'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '85 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'mFOLFOX6' AND d.generic_name = 'oxaliplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '500 mg', 'IM', 'Day 1, 15 (C1), Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'PALBO-FUL' AND d.generic_name = 'fulvestrant'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '125 mg', 'PO', 'Day 1-21', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'PALBO-FUL' AND d.generic_name = 'palbociclib'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '2.5 mg', 'PO', 'Daily', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'PALBO-LET' AND d.generic_name = 'letrozole'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '125 mg', 'PO', 'Day 1-21', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'PALBO-LET' AND d.generic_name = 'palbociclib'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '750 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'R-CHOP' AND d.generic_name = 'cyclophosphamide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '50 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'R-CHOP' AND d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '100 mg', 'PO', 'Day 1-5', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'R-CHOP' AND d.generic_name = 'prednisolone'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '375 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'R-CHOP' AND d.generic_name = 'rituximab'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1.4 mg/m2 (max 2 mg)', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'R-CHOP' AND d.generic_name = 'vincristine sulfate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '2.5 mg', 'PO', 'Daily', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'RIBO-LET' AND d.generic_name = 'letrozole'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '600 mg', 'PO', 'Day 1-21', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'RIBO-LET' AND d.generic_name = 'ribociclib'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '500 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'TAC' AND d.generic_name = 'cyclophosphamide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '75 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'TAC' AND d.generic_name = 'docetaxel'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '50 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'TAC' AND d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '600 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'TC' AND d.generic_name = 'cyclophosphamide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '75 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'TC' AND d.generic_name = 'docetaxel'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '75 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'TPF' AND d.generic_name = 'cisplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '75 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'TPF' AND d.generic_name = 'docetaxel'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '750 mg/m2', 'IV CI', 'Day 1-5', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'TPF' AND d.generic_name = 'fluorouracil'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1200 mg/m2', 'IV', 'Day 1 (VDC)', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'VDC-IE' AND d.generic_name = 'cyclophosphamide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '75 mg/m2', 'IV', 'Day 1 (VDC)', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'VDC-IE' AND d.generic_name = 'doxorubicin hydrochloride'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '100 mg/m2', 'IV', 'Day 1-5 (IE)', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'VDC-IE' AND d.generic_name = 'etoposide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1800 mg/m2', 'IV', 'Day 1-5 (IE)', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'VDC-IE' AND d.generic_name = 'ifosfamide'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1.5 mg/m2 (max 2 mg)', 'IV', 'Day 1 (VDC)', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'VDC-IE' AND d.generic_name = 'vincristine sulfate'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '1000 mg/m2 BID', 'PO', 'Day 1-14', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'XELOX' AND d.generic_name = 'capecitabine'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

INSERT INTO regimen_drugs (regimen_id, drug_id, dose_per_cycle, route, day_schedule, is_optional, notes)
SELECT r.id, d.id, '130 mg/m2', 'IV', 'Day 1', false, NULL
FROM regimens r, drugs d WHERE r.regimen_code = 'XELOX' AND d.generic_name = 'oxaliplatin'
ON CONFLICT (regimen_id, drug_id, day_schedule) DO NOTHING;

