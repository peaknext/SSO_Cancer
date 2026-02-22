-- 009: Protocol Stages — protocol to stage applicability

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0111' AND cs.stage_code = 'ADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0111' AND cs.stage_code = 'EARLY'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0112' AND cs.stage_code = 'METASTATIC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0113' AND cs.stage_code = 'EARLY'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0114' AND cs.stage_code = 'METASTATIC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C011P' AND cs.stage_code = 'METASTATIC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0211' AND cs.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0211' AND cs.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0212' AND cs.stage_code = 'NEOADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0213' AND cs.stage_code = 'ADVANCED'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0213' AND cs.stage_code = 'RECURRENT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0214' AND cs.stage_code = 'ADVANCED'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0214' AND cs.stage_code = 'RECURRENT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0311' AND cs.stage_code = 'ADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0311' AND cs.stage_code = 'NEOADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0315' AND cs.stage_code = 'PALLIATIVE'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0511' AND cs.stage_code = 'ADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0512' AND cs.stage_code = 'DEFINITIVE'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0512' AND cs.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0513' AND cs.stage_code = 'NEOADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0514' AND cs.stage_code = 'METASTATIC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0514' AND cs.stage_code = 'RECURRENT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0515' AND cs.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0518' AND cs.stage_code = 'METASTATIC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0518' AND cs.stage_code = 'RECURRENT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0611' AND cs.stage_code = 'ADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0612' AND cs.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0612' AND cs.stage_code = 'STAGE_III'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0613' AND cs.stage_code = 'NEOADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0613' AND cs.stage_code = 'STAGE_IIIA'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0614' AND cs.stage_code = 'STAGE_IIIB_C'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0614' AND cs.stage_code = 'STAGE_IV'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0615' AND cs.stage_code = 'STAGE_IIIB_C'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0615' AND cs.stage_code = 'STAGE_IV'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0618' AND cs.stage_code = 'LIMITED_STAGE'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0619' AND cs.stage_code = 'EXTENSIVE_STAGE'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0620' AND cs.stage_code = 'EXTENSIVE_STAGE'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0711' AND cs.stage_code = 'ADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0711' AND cs.stage_code = 'EARLY'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0714' AND cs.stage_code = 'STAGE_IV'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0715' AND cs.stage_code = 'LOCOREGIONAL'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0716' AND cs.stage_code = 'PALLIATIVE'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0719' AND cs.stage_code = 'STAGE_IV'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0911' AND cs.stage_code = 'ADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0914' AND cs.stage_code = 'PERIOPERATIVE'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0915' AND cs.stage_code = 'METASTATIC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C0916' AND cs.stage_code = 'METASTATIC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1011' AND cs.stage_code = 'ADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1013' AND cs.stage_code = 'ADVANCED'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1013' AND cs.stage_code = 'METASTATIC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1016' AND cs.stage_code = 'ADVANCED'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1017' AND cs.stage_code = 'PALLIATIVE'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1111' AND cs.stage_code = 'NEOADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1112' AND cs.stage_code = 'ADJUVANT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1114' AND cs.stage_code = 'METASTATIC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1114' AND cs.stage_code = 'RECURRENT'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1214' AND cs.stage_code = 'M1CSPC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1215' AND cs.stage_code = 'M1CRPC'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1311' AND cs.stage_code = 'INDUCTION'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1412' AND cs.stage_code = 'INDUCTION'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1413' AND cs.stage_code = 'CONSOLIDATION'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1414' AND cs.stage_code = 'RELAPSED'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1511' AND cs.stage_code = 'INDUCTION'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1513' AND cs.stage_code = 'CONSOLIDATION'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1515' AND cs.stage_code = 'MAINTENANCE'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1516' AND cs.stage_code = 'RELAPSED'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1611' AND cs.stage_code = 'BLAST_CRISIS'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1612' AND cs.stage_code = 'BLAST_CRISIS'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1812' AND cs.stage_code = 'INDUCTION'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1813' AND cs.stage_code = 'INDUCTION'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1814' AND cs.stage_code = 'REFRACTORY'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

INSERT INTO protocol_stages (protocol_id, stage_id, notes)
SELECT pn.id, cs.id, NULL
FROM protocol_names pn, cancer_stages cs WHERE pn.protocol_code = 'C1814' AND cs.stage_code = 'RELAPSED'
ON CONFLICT (protocol_id, stage_id) DO NOTHING;

