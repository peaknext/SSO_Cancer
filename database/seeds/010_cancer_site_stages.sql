-- 010: Cancer Site Stages — valid stage combinations per cancer site

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '01' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '01' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '01' AND cst.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '01' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '01' AND cst.stage_code = 'NEOADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '01' AND cst.stage_code = 'PALLIATIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '01' AND cst.stage_code = 'RECURRENT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '02' AND cst.stage_code = 'ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '02' AND cst.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '02' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '02' AND cst.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '02' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '02' AND cst.stage_code = 'NEOADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '02' AND cst.stage_code = 'RECURRENT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '03' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '03' AND cst.stage_code = 'ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '03' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '03' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '03' AND cst.stage_code = 'NEOADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '03' AND cst.stage_code = 'PALLIATIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '03' AND cst.stage_code = 'RECURRENT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '04' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '04' AND cst.stage_code = 'ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '04' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '04' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '04' AND cst.stage_code = 'RECURRENT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '05' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '05' AND cst.stage_code = 'ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '05' AND cst.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '05' AND cst.stage_code = 'DEFINITIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '05' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '05' AND cst.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '05' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '05' AND cst.stage_code = 'NEOADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '05' AND cst.stage_code = 'RECURRENT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'EXTENSIVE_STAGE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'LIMITED_STAGE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'NEOADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'STAGE_II'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'STAGE_III'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'STAGE_IIIA'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'STAGE_IIIB_C'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '06' AND cst.stage_code = 'STAGE_IV'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '07' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '07' AND cst.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '07' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '07' AND cst.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '07' AND cst.stage_code = 'LOCOREGIONAL'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '07' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '07' AND cst.stage_code = 'NEOADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '07' AND cst.stage_code = 'PALLIATIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '07' AND cst.stage_code = 'STAGE_IV'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '08' AND cst.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '08' AND cst.stage_code = 'DEFINITIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '08' AND cst.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '08' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '08' AND cst.stage_code = 'PALLIATIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '08' AND cst.stage_code = 'RECURRENT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '08' AND cst.stage_code = 'STAGE_IV'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '09' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '09' AND cst.stage_code = 'ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '09' AND cst.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '09' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '09' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '09' AND cst.stage_code = 'PALLIATIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '09' AND cst.stage_code = 'PERIOPERATIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '10' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '10' AND cst.stage_code = 'ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '10' AND cst.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '10' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '10' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '10' AND cst.stage_code = 'PALLIATIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '11' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '11' AND cst.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '11' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '11' AND cst.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '11' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '11' AND cst.stage_code = 'NEOADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '11' AND cst.stage_code = 'RECURRENT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '12' AND cst.stage_code = 'CONCURRENT_CRT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '12' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '12' AND cst.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '12' AND cst.stage_code = 'M1CRPC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '12' AND cst.stage_code = 'M1CSPC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '12' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '13' AND cst.stage_code = 'CONSOLIDATION'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '13' AND cst.stage_code = 'INDUCTION'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '13' AND cst.stage_code = 'MAINTENANCE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '13' AND cst.stage_code = 'REFRACTORY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '13' AND cst.stage_code = 'RELAPSED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '14' AND cst.stage_code = 'CONSOLIDATION'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '14' AND cst.stage_code = 'INDUCTION'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '14' AND cst.stage_code = 'REFRACTORY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '14' AND cst.stage_code = 'RELAPSED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '15' AND cst.stage_code = 'CONSOLIDATION'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '15' AND cst.stage_code = 'INDUCTION'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '15' AND cst.stage_code = 'MAINTENANCE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '15' AND cst.stage_code = 'RELAPSED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '16' AND cst.stage_code = 'BLAST_CRISIS'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '16' AND cst.stage_code = 'REFRACTORY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '16' AND cst.stage_code = 'RELAPSED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '17' AND cst.stage_code = 'ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '17' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '17' AND cst.stage_code = 'PALLIATIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '17' AND cst.stage_code = 'REFRACTORY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '17' AND cst.stage_code = 'RELAPSED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '18' AND cst.stage_code = 'CONSOLIDATION'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '18' AND cst.stage_code = 'INDUCTION'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '18' AND cst.stage_code = 'MAINTENANCE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '18' AND cst.stage_code = 'PALLIATIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '18' AND cst.stage_code = 'REFRACTORY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '18' AND cst.stage_code = 'RELAPSED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '19' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '19' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '19' AND cst.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '19' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '19' AND cst.stage_code = 'NEOADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '20' AND cst.stage_code = 'ADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '20' AND cst.stage_code = 'EARLY'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '20' AND cst.stage_code = 'LOCALLY_ADVANCED'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '20' AND cst.stage_code = 'METASTATIC'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '20' AND cst.stage_code = 'NEOADJUVANT'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

INSERT INTO cancer_site_stages (cancer_site_id, stage_id)
SELECT cs.id, cst.id
FROM cancer_sites cs, cancer_stages cst WHERE cs.site_code = '20' AND cst.stage_code = 'PALLIATIVE'
ON CONFLICT (cancer_site_id, stage_id) DO NOTHING;

