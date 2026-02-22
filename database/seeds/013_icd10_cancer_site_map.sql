-- 013: ICD-10 → CancerSite mapping (รหัส ICD-10 → ตำแหน่งมะเร็ง)
-- Maps ICD-10 prefixes to cancer_sites for automatic diagnosis resolution.
-- Matching logic: given ICD code "C509", try longest prefix first: C509 → C50 → C5 → C

INSERT INTO icd10_cancer_site_map (icd_prefix, cancer_site_id, description, is_active)
VALUES
  -- 01: Breast Cancer (โรคมะเร็งเต้านม)
  ('C50', (SELECT id FROM cancer_sites WHERE site_code = '01'), 'Malignant neoplasm of breast', true),
  ('D05', (SELECT id FROM cancer_sites WHERE site_code = '01'), 'Carcinoma in situ of breast', true),

  -- 02: Cervical Cancer (โรคมะเร็งปากมดลูก)
  ('C53', (SELECT id FROM cancer_sites WHERE site_code = '02'), 'Malignant neoplasm of cervix uteri', true),

  -- 03: Ovarian Cancer (โรคมะเร็งรังไข่)
  ('C56', (SELECT id FROM cancer_sites WHERE site_code = '03'), 'Malignant neoplasm of ovary', true),
  ('C570', (SELECT id FROM cancer_sites WHERE site_code = '03'), 'Malignant neoplasm of fallopian tube', true),
  ('C48', (SELECT id FROM cancer_sites WHERE site_code = '03'), 'Malignant neoplasm of peritoneum (primary peritoneal)', true),

  -- 04: Uterine/Endometrial Cancer (โรคมะเร็งมดลูก)
  ('C54', (SELECT id FROM cancer_sites WHERE site_code = '04'), 'Malignant neoplasm of corpus uteri', true),
  ('C55', (SELECT id FROM cancer_sites WHERE site_code = '04'), 'Malignant neoplasm of uterus, part unspecified', true),

  -- 05: Head and Neck Cancer (โรคมะเร็งศีรษะและลำคอ)
  ('C00', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of lip', true),
  ('C01', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of base of tongue', true),
  ('C02', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of other parts of tongue', true),
  ('C03', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of gum', true),
  ('C04', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of floor of mouth', true),
  ('C05', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of palate', true),
  ('C06', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of other parts of mouth', true),
  ('C07', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of parotid gland', true),
  ('C08', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of other major salivary glands', true),
  ('C09', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of tonsil', true),
  ('C10', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of oropharynx', true),
  ('C11', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of nasopharynx', true),
  ('C12', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of piriform sinus', true),
  ('C13', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of hypopharynx', true),
  ('C14', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of other sites lip, oral cavity, pharynx', true),
  ('C30', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of nasal cavity and middle ear', true),
  ('C31', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of accessory sinuses', true),
  ('C32', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of larynx', true),
  ('C73', (SELECT id FROM cancer_sites WHERE site_code = '05'), 'Malignant neoplasm of thyroid gland', true),

  -- 06: Lung Cancer (โรคมะเร็งปอด)
  ('C34', (SELECT id FROM cancer_sites WHERE site_code = '06'), 'Malignant neoplasm of bronchus and lung', true),
  ('C33', (SELECT id FROM cancer_sites WHERE site_code = '06'), 'Malignant neoplasm of trachea', true),
  ('C45', (SELECT id FROM cancer_sites WHERE site_code = '06'), 'Mesothelioma', true),

  -- 07: Colorectal, Anal and Appendiceal Cancer (โรคมะเร็งลำไส้ใหญ่และลำไส้ตรง)
  ('C18', (SELECT id FROM cancer_sites WHERE site_code = '07'), 'Malignant neoplasm of colon', true),
  ('C19', (SELECT id FROM cancer_sites WHERE site_code = '07'), 'Malignant neoplasm of rectosigmoid junction', true),
  ('C20', (SELECT id FROM cancer_sites WHERE site_code = '07'), 'Malignant neoplasm of rectum', true),
  ('C21', (SELECT id FROM cancer_sites WHERE site_code = '07'), 'Malignant neoplasm of anus and anal canal', true),
  ('C17', (SELECT id FROM cancer_sites WHERE site_code = '07'), 'Malignant neoplasm of small intestine', true),

  -- 08: Esophageal Cancer (โรคมะเร็งหลอดอาหาร)
  ('C15', (SELECT id FROM cancer_sites WHERE site_code = '08'), 'Malignant neoplasm of esophagus', true),

  -- 09: Gastric Cancer (โรคมะเร็งกระเพาะอาหาร)
  ('C16', (SELECT id FROM cancer_sites WHERE site_code = '09'), 'Malignant neoplasm of stomach', true),

  -- 10: Hepatobiliary and Pancreatic Cancer (โรคมะเร็งตับ ท่อน้ำดี และมะเร็งตับอ่อน)
  ('C22', (SELECT id FROM cancer_sites WHERE site_code = '10'), 'Malignant neoplasm of liver and intrahepatic bile ducts', true),
  ('C23', (SELECT id FROM cancer_sites WHERE site_code = '10'), 'Malignant neoplasm of gallbladder', true),
  ('C24', (SELECT id FROM cancer_sites WHERE site_code = '10'), 'Malignant neoplasm of other parts of biliary tract', true),
  ('C25', (SELECT id FROM cancer_sites WHERE site_code = '10'), 'Malignant neoplasm of pancreas', true),

  -- 11: Bladder and Kidney Cancer (โรคมะเร็งกระเพาะปัสสาวะ และมะเร็งไต)
  ('C64', (SELECT id FROM cancer_sites WHERE site_code = '11'), 'Malignant neoplasm of kidney, except renal pelvis', true),
  ('C65', (SELECT id FROM cancer_sites WHERE site_code = '11'), 'Malignant neoplasm of renal pelvis', true),
  ('C66', (SELECT id FROM cancer_sites WHERE site_code = '11'), 'Malignant neoplasm of ureter', true),
  ('C67', (SELECT id FROM cancer_sites WHERE site_code = '11'), 'Malignant neoplasm of bladder', true),
  ('C68', (SELECT id FROM cancer_sites WHERE site_code = '11'), 'Malignant neoplasm of other urinary organs', true),

  -- 12: Prostate Cancer (โรคมะเร็งต่อมลูกหมาก)
  ('C61', (SELECT id FROM cancer_sites WHERE site_code = '12'), 'Malignant neoplasm of prostate', true),

  -- 13: Adult ALL (โรคมะเร็งเม็ดเลือดขาวชนิดเฉียบพลันแบบลิมฟอยด์)
  ('C910', (SELECT id FROM cancer_sites WHERE site_code = '13'), 'Acute lymphoblastic leukaemia (ALL)', true),

  -- 14: Adult AML (โรคมะเร็งเม็ดเลือดขาวชนิดเฉียบพลันแบบมัยอิลอยด์)
  ('C920', (SELECT id FROM cancer_sites WHERE site_code = '14'), 'Acute myeloblastic leukaemia (AML)', true),
  ('C930', (SELECT id FROM cancer_sites WHERE site_code = '14'), 'Acute monocytic leukaemia', true),

  -- 15: Adult Acute Leukemia / APL
  ('C924', (SELECT id FROM cancer_sites WHERE site_code = '15'), 'Acute promyelocytic leukaemia (APL)', true),

  -- 16: Adult CML (โรคมะเร็งเม็ดเลือดขาวเรื้อรังชนิดมัยอิลอยด์)
  ('C921', (SELECT id FROM cancer_sites WHERE site_code = '16'), 'Chronic myeloid leukaemia (CML)', true),

  -- 17: Adult Lymphoma (โรคมะเร็งต่อมน้ำเหลือง)
  ('C81', (SELECT id FROM cancer_sites WHERE site_code = '17'), 'Hodgkin lymphoma', true),
  ('C82', (SELECT id FROM cancer_sites WHERE site_code = '17'), 'Follicular lymphoma', true),
  ('C83', (SELECT id FROM cancer_sites WHERE site_code = '17'), 'Non-follicular lymphoma (DLBCL, etc.)', true),
  ('C84', (SELECT id FROM cancer_sites WHERE site_code = '17'), 'Mature T/NK-cell lymphomas', true),
  ('C85', (SELECT id FROM cancer_sites WHERE site_code = '17'), 'Other and unspecified types of NHL', true),
  ('C86', (SELECT id FROM cancer_sites WHERE site_code = '17'), 'Other specified types of T/NK-cell lymphoma', true),

  -- 18: Multiple Myeloma and MDS
  ('C90', (SELECT id FROM cancer_sites WHERE site_code = '18'), 'Multiple myeloma and malignant plasma cell neoplasms', true),
  ('D46', (SELECT id FROM cancer_sites WHERE site_code = '18'), 'Myelodysplastic syndromes (MDS)', true),

  -- 19: Bone Cancer (โรคมะเร็งกระดูก)
  ('C40', (SELECT id FROM cancer_sites WHERE site_code = '19'), 'Malignant neoplasm of bone and articular cartilage of limbs', true),
  ('C41', (SELECT id FROM cancer_sites WHERE site_code = '19'), 'Malignant neoplasm of bone and articular cartilage, other sites', true),

  -- 20: Soft Tissue Sarcoma (โรคมะเร็งเนื้อเยื่ออ่อน)
  ('C49', (SELECT id FROM cancer_sites WHERE site_code = '20'), 'Malignant neoplasm of other connective and soft tissue', true),
  ('C46', (SELECT id FROM cancer_sites WHERE site_code = '20'), 'Kaposi sarcoma', true),

  -- 21: Pediatric Cancer (โรคมะเร็งเด็ก)
  ('C69', (SELECT id FROM cancer_sites WHERE site_code = '21'), 'Malignant neoplasm of eye (retinoblastoma)', true),
  ('C71', (SELECT id FROM cancer_sites WHERE site_code = '21'), 'Malignant neoplasm of brain (pediatric)', true),
  ('C74', (SELECT id FROM cancer_sites WHERE site_code = '21'), 'Malignant neoplasm of adrenal gland (neuroblastoma)', true),
  ('C64P', (SELECT id FROM cancer_sites WHERE site_code = '21'), 'Wilms tumor (pediatric renal)', true)

ON CONFLICT (icd_prefix) DO NOTHING;
