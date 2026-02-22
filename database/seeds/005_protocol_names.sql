-- 005: Protocol Names (โปรโตคอล) — treatment protocols

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0111', 'Protocol 1 เคมีบำบัดที่ใช้รักษาผู้ป่วยมะเร็งเต้านมระยะแรก', 'Protocol 1: Chemotherapy for early-stage breast cancer', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '01'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0112', 'Protocol 2 เคมีบำบัดที่ใช้รักษาผู้ป่วยมะเร็งเต้านมระยะแพร่กระจาย', 'Protocol 2: Chemotherapy for metastatic breast cancer', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '01'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0113', 'Protocol 3 ฮอร์โมนรักษาผู้ป่วยมะเร็งเต้านมระยะแรก', 'Protocol 3: Hormonal therapy for early-stage breast cancer', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '01'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0114', 'Protocol 4 ฮอร์โมนรักษามะเร็งเต้านม ระยะแพร่กระจาย', 'Protocol 4: Hormonal therapy for metastatic breast cancer', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '01'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C011P', 'การใช้ยา Ribociclib และ Palbociclib รักษามะเร็งเต้านม ตามหลักเกณฑ์ที่สปส.กำหนด', 'Ribociclib and Palbociclib for breast cancer per SSO criteria', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '01'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C012N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '01'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C012R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '01'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C012S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '01'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0211', 'Protocol 1: Concurrent chemoradiation', 'Protocol 1: Concurrent chemoradiation', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '02'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0212', 'Protocol 2: Neoadjuvant chemotherapy', 'Protocol 2: Neoadjuvant chemotherapy', 'treatment', 'neoadjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '02'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0213', 'Protocol 3: First-line chemotherapy for Advanced / Recurrent cervical cancer', 'Protocol 3: First-line chemotherapy for advanced/recurrent cervical cancer', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '02'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0214', 'Protocol 4: Second-line chemotherapy for Advanced / Recurrent cervical cancer', 'Protocol 4: Second-line chemotherapy for advanced/recurrent cervical cancer', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '02'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C022N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '02'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C022R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '02'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C022S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '02'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0311', 'Protocol 1: Chemotherapy in EOC, Borderline Epithelial Ovarian Tumors & Carcinosarcoma - Primary/Adjuvant/Neoadjuvant', 'Protocol 1: Chemotherapy in EOC/Borderline/Carcinosarcoma - Primary/Adjuvant/Neoadjuvant', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '03'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0312', 'Protocol 2: Chemotherapy in EOC, Borderline Epithelial Ovarian Tumors & Carcinosarcoma - Second-line', 'Protocol 2: Chemotherapy in EOC/Borderline/Carcinosarcoma - Second-line', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '03'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0313', 'Protocol 3: Chemotherapy in Malignant Ovarian Germ Cell Tumors & Malignant Sex Cord-Stromal Tumors - First-line/Adjuvant', 'Protocol 3: Chemotherapy in germ cell/sex cord-stromal tumors - First-line/Adjuvant', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '03'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0314', 'Protocol 4: Chemotherapy in Malignant Ovarian Germ Cell Tumors & Malignant Sex Cord-Stromal Tumors - Second-line', 'Protocol 4: Chemotherapy in germ cell/sex cord-stromal tumors - Second-line', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '03'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0315', 'Protocol 8: Palliative care drug in Ovarian Cancer', 'Protocol 8: Palliative care drug in ovarian cancer', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '03'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C032N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '03'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C032R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '03'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C032S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '03'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0411', 'Protocol 1: Chemotherapy and Hormone Therapy in Endometrial Carcinoma - High-risk/Advanced/Recurrence', 'Protocol 1: Chemo/Hormone in endometrial carcinoma - high-risk/advanced/recurrence', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '04'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0412', 'Protocol 2.1: Chemotherapy and Hormone Therapy in Uterine Sarcoma - Chemotherapy Regimens', 'Protocol 2.1: Chemo/Hormone in uterine sarcoma - chemotherapy regimens', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '04'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0413', 'Protocol 2.2: Chemotherapy and Hormone Therapy in Uterine Sarcoma - Hormone Therapy (ESS only)', 'Protocol 2.2: Hormone therapy in uterine sarcoma (ESS only)', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '04'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C042N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '04'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C042R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '04'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C042S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '04'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0511', 'Protocol 1.1 การให้ยาเคมีบำบัดร่วมกับรังสีรักษาเสริมหลังการผ่าตัด (postoperative concurrent chemoradiotherapy)', 'Protocol 1.1: Postoperative concurrent chemoradiotherapy for SCC of H&N', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0512', 'Protocol 1.2 การให้ยาเคมีบำบัดร่วมกับรังสีรักษาในผู้ป่วยที่ไม่ได้รับการผ่าตัด (definitive concurrent chemoradiotherapy)', 'Protocol 1.2: Definitive concurrent chemoradiotherapy for SCC of H&N', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0513', 'Protocol 2 การให้ยาเคมีบำบัดก่อนการรักษา (induction chemotherapy)', 'Protocol 2: Induction chemotherapy for SCC of H&N', 'treatment', 'neoadjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0514', 'Protocol 3 การให้ยาเคมีบำบัดในผู้ป่วยมะเร็งศีรษะและลำคอ recurrent/metastatic (ยกเว้น nasopharyngeal)', 'Protocol 3: Chemotherapy for recurrent/metastatic non-nasopharyngeal H&N SCC', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0515', 'Protocol 4 การให้ยาเคมีบำบัดร่วมกับรังสีรักษา (CCRT) ในผู้ป่วยมะเร็งหลังโพรงจมูก', 'Protocol 4: Concurrent chemoradiotherapy for nasopharyngeal carcinoma', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0516', 'Protocol 5 การให้ยาเคมีบำบัดก่อนการให้รังสีรักษา (induction chemotherapy) ในมะเร็งหลังโพรงจมูก', 'Protocol 5: Induction chemotherapy for nasopharyngeal carcinoma', 'treatment', 'neoadjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0517', 'Protocol 6 การให้ยาเคมีบำบัดเสริมหลังการให้ CCRT (adjuvant chemotherapy) ในมะเร็งหลังโพรงจมูก', 'Protocol 6: Adjuvant chemotherapy after CCRT for nasopharyngeal carcinoma', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0518', 'Protocol 7 การให้ยาเคมีบำบัดในมะเร็งหลังโพรงจมูกระยะแพร่กระจาย หรือกลับเป็นซ้ำ', 'Protocol 7: Chemotherapy for metastatic/recurrent nasopharyngeal carcinoma', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0519', 'Protocol 8 การให้ยาเคมีบำบัดในผู้ป่วยมะเร็งต่อมน้ำลาย (salivary gland cancers) ระยะแพร่กระจาย', 'Protocol 8: Chemotherapy for metastatic/recurrent salivary gland cancers', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C052N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C052R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C052S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '05'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0611', 'Protocol 1: การรักษาเสริมภายหลังการผ่าตัด (Adjuvant chemotherapy)', 'Protocol 1: Adjuvant chemotherapy for NSCLC', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0612', 'Protocol 2: การรักษาเคมีบำบัดร่วมกับการฉายรังสี สำหรับมะเร็งปอด Stage II-III NSCLC', 'Protocol 2: Concurrent chemoradiation for stage II (inoperable) and stage III NSCLC', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0613', 'Protocol 3: การรักษาเคมีบำบัดนำหน้าการผ่าตัด (neoadjuvant) ในมะเร็งปอด potential resectable stage IIIA', 'Protocol 3: Neoadjuvant chemotherapy for potential resectable stage IIIA NSCLC', 'treatment', 'neoadjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0614', 'Protocol 4: เคมีบำบัดมะเร็งปอด NSCLC ระยะแพร่กระจาย IIIB-C และ IV (First line)', 'Protocol 4: First-line chemotherapy for advanced NSCLC stage IIIB-C and IV', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0615', 'Protocol 5: เคมีบำบัดมะเร็งปอด NSCLC ระยะแพร่กระจาย IIIB-C และ IV (Second line)', 'Protocol 5: Second-line chemotherapy for advanced NSCLC stage IIIB-C and IV', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0616', 'Protocol 6: การรักษาด้วยยามุ่งเป้า มะเร็งปอด NSCLC ที่มี EGFR mutation', 'Protocol 6: EGFR-targeted therapy for advanced NSCLC with EGFR mutation', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0618', 'Protocol 1 (SCLC): การรักษาเสริม หรือใช้ร่วมกับรังสีรักษาใน SCLC ระยะไม่ลุกลาม (Limited stage)', 'Protocol 1 (SCLC): Adjuvant or concurrent CRT for limited-stage SCLC', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0619', 'Protocol 2 (SCLC): เคมีบำบัดขนานแรก (First line) สำหรับ SCLC ระยะลุกลาม (Extensive stage)', 'Protocol 2 (SCLC): First-line chemotherapy for extensive-stage SCLC', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0620', 'Protocol 3 (SCLC): เคมีบำบัด Second line สำหรับ SCLC ระยะลุกลาม ที่ล้มเหลวจากสูตรยาขนานแรก', 'Protocol 3 (SCLC): Second-line chemotherapy for extensive-stage SCLC', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C062N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C062R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C062S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '06'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0711', 'Protocol 1: Adjuvant Chemotherapy มะเร็งลำไส้ใหญ่ระยะเริ่มต้นหลังการผ่าตัด', 'Protocol 1: Adjuvant chemotherapy for early-stage colon cancer after surgery', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0712', 'Protocol 2: Concurrent chemoradiation มะเร็งลำไส้ตรงระยะแรก ก่อนหรือหลังการผ่าตัดร่วมกับรังสีรักษา', 'Protocol 2: Concurrent chemoradiation for early rectal cancer', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0713', 'Protocol 3: Adjuvant or Neoadjuvant Chemotherapy มะเร็งลำไส้ตรงระยะแรก กรณีผู้ป่วยได้รับการฉายรังสี', 'Protocol 3: Adjuvant/Neoadjuvant chemo for rectal cancer with radiation', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0714', 'Protocol 4: Chemotherapy มะเร็งลำไส้ใหญ่ระยะ IV', 'Protocol 4: Chemotherapy for stage IV colon cancer', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0715', 'Protocol 5: Chemoradiotherapy มะเร็งทวารหนักระยะ locoregional ร่วมกับรังสีรักษา', 'Protocol 5: Chemoradiotherapy for locoregional anal cancer', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0716', 'Protocol 6: Palliative Chemotherapy (First line) มะเร็งทวารหนักระยะ V', 'Protocol 6: First-line palliative chemotherapy for anal cancer', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0717', 'Protocol 7: สูตรยาเคมีบำบัดที่ใช้ระหว่างการทำ HIPEC มะเร็งไส้ติ่ง', 'Protocol 7: HIPEC chemotherapy for appendiceal cancer', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0718', 'Protocol 8: Adjuvant Chemotherapy มะเร็งไส้ติ่ง', 'Protocol 8: Adjuvant chemotherapy for appendiceal cancer', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0719', 'Protocol 9: Chemotherapy มะเร็งไส้ติ่งระยะที่ 4', 'Protocol 9: Chemotherapy for stage 4 appendiceal cancer', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C072N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C072R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C072S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '07'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0811', 'Protocol 1: การให้ยาเคมีบำบัดโรคมะเร็งหลอดอาหารร่วมกับรังสีรักษา (concurrent chemoradiation)', 'Protocol 1: Concurrent chemoradiation for esophageal cancer', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '08'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0812', 'Protocol 2: การให้ยาเคมีบำบัดร่วมกับรังสีรักษาในกรณีที่ผ่าตัดไม่ได้ (Definitive concurrent chemoradiation)', 'Protocol 2: Definitive concurrent chemoradiation for unresectable esophageal cancer', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '08'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0813', 'Protocol 3.1: เคมีบำบัดมะเร็งหลอดอาหารชนิด SCC ระยะ IV หรือโรคกำเริบ', 'Protocol 3.1: Chemotherapy for stage IV or recurrent esophageal SCC', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '08'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0814', 'Protocol 3.2: เคมีบำบัดมะเร็งหลอดอาหารชนิด Adenocarcinoma ระยะ IV หรือโรคกำเริบ', 'Protocol 3.2: Chemotherapy for stage IV or recurrent esophageal adenocarcinoma', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '08'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C082N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '08'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C082R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '08'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C082S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '08'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0911', 'Protocol 1.1: Adjuvant chemotherapy ภายหลังการผ่าตัด D2 resection', 'Protocol 1.1: Adjuvant chemotherapy after D2 resection', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '09'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0912', 'Protocol 1.2: Adjuvant chemoradiotherapy ภายหลังการผ่าตัดน้อยกว่า D2 resection', 'Protocol 1.2: Adjuvant chemoradiotherapy after less than D2 resection', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '09'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0913', 'Protocol 1.3: Adjuvant chemotherapy อย่างเดียว ภายหลังการผ่าตัดน้อยกว่า D2', 'Protocol 1.3: Adjuvant chemotherapy alone after less than D2 resection', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '09'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0914', 'Protocol 1.4: Perioperative chemotherapy มะเร็งกระเพาะอาหาร', 'Protocol 1.4: Perioperative chemotherapy for gastric cancer', 'treatment', 'perioperative', true
FROM cancer_sites cs WHERE cs.site_code = '09'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0915', 'Protocol 2: เคมีบำบัดสูตรแรกในผู้ป่วยมะเร็งกระเพาะอาหารระยะแพร่กระจาย', 'Protocol 2: First-line chemotherapy for metastatic gastric cancer', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '09'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C0916', 'Protocol 3: เคมีบำบัดสูตรสอง ในผู้ป่วยมะเร็งกระเพาะอาหารระยะแพร่กระจาย', 'Protocol 3: Second-line chemotherapy for metastatic gastric cancer', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '09'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C092N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '09'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C092R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '09'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C092S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '09'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1011', 'Protocol 1: Adjuvant Chemotherapy ผู้ป่วยมะเร็งท่อน้ำดีและถุงน้ำดีที่ผ่าตัดได้', 'Protocol 1: Adjuvant chemotherapy for resectable cholangiocarcinoma/gallbladder cancer', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '10'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1012', 'Protocol 2: Chemoradiotherapy in hepatobiliary tract cancers', 'Protocol 2: Chemoradiotherapy for hepatobiliary tract cancers', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '10'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1013', 'Protocol 3: สูตรเคมีบำบัดรักษามะเร็งท่อน้ำดีและถุงน้ำดีระยะลุกลามที่ไม่สามารถผ่าตัดได้หรือระยะแพร่กระจาย', 'Protocol 3: Chemotherapy for unresectable/metastatic cholangiocarcinoma/gallbladder cancer', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '10'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1014', 'Protocol 4.1: Adjuvant chemotherapy for resectable pancreatic cancer', 'Protocol 4.1: Adjuvant chemotherapy for resectable pancreatic cancer', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '10'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1015', 'Protocol 4.2: Chemoradiotherapy สำหรับมะเร็งตับอ่อน', 'Protocol 4.2: Chemoradiotherapy for pancreatic cancer', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '10'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1016', 'Protocol 4.3: การรักษามะเร็งตับอ่อนระยะท้าย (advanced pancreatic cancer)', 'Protocol 4.3: Treatment for advanced pancreatic cancer', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '10'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1017', 'การรักษาด้วยยาในผู้ป่วยมะเร็งตับระยะสุดท้าย', 'Drug treatment for end-stage hepatocellular carcinoma', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '10'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C102N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '10'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C102R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '10'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C102S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '10'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1111', 'Protocol 1: การรักษาเสริมก่อนการผ่าตัด (Neoadjuvant chemotherapy)', 'Protocol 1: Neoadjuvant chemotherapy for bladder cancer', 'treatment', 'neoadjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '11'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1112', 'Protocol 2: การรักษาเสริมภายหลังการผ่าตัด (Adjuvant chemotherapy)', 'Protocol 2: Adjuvant chemotherapy for bladder cancer', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '11'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1113', 'Protocol 3: Concurrent chemoradiation', 'Protocol 3: Concurrent chemoradiation for bladder cancer', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '11'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1114', 'Protocol 4.1: เคมีบำบัดในระยะแพร่กระจายหรือกลับเป็นซ้ำ', 'Protocol 4.1: Chemotherapy for metastatic or recurrent bladder cancer', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '11'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1115', 'Protocol 5: Intravesical Adjuvant Chemotherapy and Immunotherapy', 'Protocol 5: Intravesical adjuvant chemotherapy and immunotherapy', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '11'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C112N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '11'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C112R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '11'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C112S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '11'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1211', 'Protocol 1: การใช้ยา LHRH agonist ร่วมกับการฉายรังสีแบบ definitive radiotherapy', 'Protocol 1: LHRH agonist with definitive radiotherapy', 'treatment', 'concurrent_crt', true
FROM cancer_sites cs WHERE cs.site_code = '12'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1212', 'Protocol 2: ฮอร์โมนรักษามะเร็งต่อมลูกหมากระยะแพร่กระจายภายหลัง salvage radiotherapy', 'Protocol 2: Hormone therapy for metastatic prostate cancer after salvage RT', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '12'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1213', 'Protocol 3: ฮอร์โมนรักษามะเร็งต่อมลูกหมากระยะแพร่กระจาย', 'Protocol 3: Hormone therapy for metastatic prostate cancer', 'treatment', 'palliative', true
FROM cancer_sites cs WHERE cs.site_code = '12'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1214', 'Protocol 4: เคมีบำบัดรักษาใน metastatic Castration sensitive prostate cancer (m1CSPC) กลุ่ม high volume', 'Protocol 4: Chemotherapy for m1CSPC high volume', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '12'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1215', 'Protocol 5: เคมีบำบัดรักษาใน metastatic castration resistant prostate cancer (m1CRPC)', 'Protocol 5: Chemotherapy for mCRPC', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '12'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C122N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '12'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C122R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '12'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C122S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '12'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1311', 'Hyper-CVAD therapy (1,3,5,7) alternating with high-dose MTX and ara-C (2,4,6,8)', 'Hyper-CVAD alternating with high-dose MTX/Ara-C for adult ALL', 'treatment', 'induction', true
FROM cancer_sites cs WHERE cs.site_code = '13'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1312', 'GMALL protocol', 'GMALL protocol for adult ALL', 'treatment', 'induction', true
FROM cancer_sites cs WHERE cs.site_code = '13'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1313', 'Adapted TPOG', 'Adapted TPOG protocol for adult ALL', 'treatment', 'induction', true
FROM cancer_sites cs WHERE cs.site_code = '13'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1314', 'Supportive care', 'Supportive care for adult ALL', 'treatment', 'supportive', true
FROM cancer_sites cs WHERE cs.site_code = '13'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C132N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '13'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C132R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '13'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C132S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '13'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1412', 'Induction therapy', 'Induction therapy for adult AML', 'treatment', 'induction', true
FROM cancer_sites cs WHERE cs.site_code = '14'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1413', 'Post-remission therapy', 'Post-remission therapy for adult AML', 'treatment', 'consolidation', true
FROM cancer_sites cs WHERE cs.site_code = '14'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1414', 'Salvage induction therapy for relapsed AML', 'Salvage induction therapy for relapsed AML', 'treatment', 'salvage', true
FROM cancer_sites cs WHERE cs.site_code = '14'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C142N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '14'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C142S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '14'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1511', 'Induction therapy', 'Induction therapy for APL', 'treatment', 'induction', true
FROM cancer_sites cs WHERE cs.site_code = '15'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1513', 'Consolidation therapy: High risk group และอายุน้อยกว่า 65 ปี', 'Consolidation therapy: High risk group, age < 65', 'treatment', 'consolidation', true
FROM cancer_sites cs WHERE cs.site_code = '15'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1514', 'Consolidation therapy: low risk group และผู้ป่วย high risk ที่มีอายุมากกว่า 65 ปี', 'Consolidation therapy: Low risk group or high risk age > 65', 'treatment', 'consolidation', true
FROM cancer_sites cs WHERE cs.site_code = '15'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1515', 'Maintenance', 'Maintenance therapy for APL', 'treatment', 'maintenance', true
FROM cancer_sites cs WHERE cs.site_code = '15'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1516', 'การรักษาเมื่อโรคกลับเป็นซ้ำครั้งแรก (first relapse)', 'Treatment for first relapse of APL', 'treatment', 'salvage', true
FROM cancer_sites cs WHERE cs.site_code = '15'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C152N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '15'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C152S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '15'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1611', 'สำหรับ lymphoid blast crisis: Hyper-CVAD ร่วมกับ TKI', 'Hyper-CVAD with TKI for lymphoid blast crisis CML', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '16'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1612', 'สำหรับ myeloid blast crisis โดยพิจารณาให้ร่วมกับ TKI', 'Chemotherapy with TKI for myeloid blast crisis CML', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '16'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C162N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '16'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C162S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '16'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1711', 'Protocol เพื่อการเบิกจ่ายชดเชยค่ารักษาผู้ป่วยมะเร็งต่อมน้ำเหลือง', 'Lymphoma treatment reimbursement protocol', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '17'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C172N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '17'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C172R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '17'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C172S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '17'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1812', 'Induction regimens สำหรับผู้ป่วย transplant-candidate myeloma', 'Induction regimens for transplant-candidate myeloma', 'treatment', 'induction', true
FROM cancer_sites cs WHERE cs.site_code = '18'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1813', 'Induction regimens สำหรับ non-transplant candidate myeloma', 'Induction regimens for non-transplant candidate myeloma', 'treatment', 'induction', true
FROM cancer_sites cs WHERE cs.site_code = '18'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1814', 'Induction regimens ในผู้ป่วย relapsed/refractory myeloma', 'Induction regimens for relapsed/refractory myeloma', 'treatment', 'salvage', true
FROM cancer_sites cs WHERE cs.site_code = '18'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1815', 'Supportive treatment for multiple myeloma', 'Supportive treatment for multiple myeloma', 'treatment', 'supportive', true
FROM cancer_sites cs WHERE cs.site_code = '18'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1816', 'Protocol เพื่อการเบิกจ่ายชดเชยค่ารักษาผู้ป่วย MDS', 'MDS treatment reimbursement protocol', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '18'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C182N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '18'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C182R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '18'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C182S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '18'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1911', 'Protocol 1: เคมีบำบัดในผู้ป่วย Osteosarcoma (neo)adjuvant chemotherapy', 'Protocol 1: (Neo)adjuvant chemotherapy for osteosarcoma', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1912', 'Protocol 2: เคมีบำบัดในผู้ป่วย Undifferentiated pleomorphic sarcoma of bone (neo)adjuvant', 'Protocol 2: (Neo)adjuvant chemo for undifferentiated bone sarcoma', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1913', 'Protocol 3: เคมีบำบัดขนานแรกในมะเร็งกระดูก intermediate/high-grade unresectable/metastatic', 'Protocol 3: First-line chemo for unresectable/metastatic bone cancer', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1914', 'Protocol 4: เคมีบำบัดขนานที่ 2 หลังได้รับ anthracycline-based ในมะเร็งกระดูก', 'Protocol 4: Second-line chemo for bone cancer after anthracycline', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1915', 'Protocol 5: เคมีบำบัดในกรณีโรคที่สามารถผ่าตัดได้หมด (Ewing sarcoma)', 'Protocol 5: (Neo)adjuvant chemo for resectable Ewing sarcoma', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1916', 'Protocol 6.1: เคมีบำบัดขนานแรก VDC (VAC)/IE ในโรคที่ไม่สามารถผ่าตัดได้หมด', 'Protocol 6.1: First-line VDC/IE for unresectable Ewing sarcoma', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1917', 'Protocol 6.2: เคมีบำบัดขนานแรก non-IE regimen ในโรคที่ไม่สามารถผ่าตัดได้หมด', 'Protocol 6.2: First-line non-IE regimen for unresectable Ewing sarcoma', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1918', 'Protocol 7: เคมีบำบัดที่เคยได้รับ anthracycline-based มาก่อน หรือ IE dose สุดท้ายนานกว่า 1 ปี', 'Protocol 7: Chemo after prior anthracycline or IE > 1 year ago', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C1919', 'Protocol 8: เคมีบำบัดขนานที่สองกรณีเคยได้รับสูตร IE มาก่อน', 'Protocol 8: Second-line chemo after prior IE regimen', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C192N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C192R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C192S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '19'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C2011', 'Protocol 1: เคมีบำบัด Soft tissue sarcoma ระยะที่ไม่มีการแพร่กระจาย (adjuvant/neoadjuvant)', 'Protocol 1: Adjuvant/neoadjuvant chemo for non-metastatic STS', 'treatment', 'adjuvant', true
FROM cancer_sites cs WHERE cs.site_code = '20'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C2012', 'Protocol 2: เคมีบำบัดขนานแรก STS ระยะแพร่กระจายหรือผ่าตัดไม่ได้', 'Protocol 2: First-line chemo for metastatic/unresectable STS', 'treatment', 'first_line', true
FROM cancer_sites cs WHERE cs.site_code = '20'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C2013', 'Protocol 3: เคมีบำบัดและยาขนานที่สอง STS ระยะแพร่กระจายหรือผ่าตัดไม่ได้', 'Protocol 3: Second-line chemo for metastatic/unresectable STS', 'treatment', 'second_line', true
FROM cancer_sites cs WHERE cs.site_code = '20'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C2014', 'Protocol 4: เคมีบำบัดขนานที่สาม STS ระยะแพร่กระจายหรือผ่าตัดไม่ได้', 'Protocol 4: Third-line chemo for metastatic/unresectable STS', 'treatment', 'third_line', true
FROM cancer_sites cs WHERE cs.site_code = '20'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C202N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '20'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C202R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '20'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C202S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '20'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C212N', 'การรักษาแบบ Non-Protocol', 'Non-Protocol treatment', 'non_protocol', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '21'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C212R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '21'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C212S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '21'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C8831', 'การรักษามะเร็งด้วยการผ่าตัด ที่ไม่มีการใช้ยาเคมีบำบัด', 'Surgical cancer treatment without chemotherapy', 'surgery', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '88'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C992R', 'รังสีรักษา', 'Radiation therapy', 'radiation', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '99'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C992S', 'การติดตามอาการ หัตถการเพื่อเตรียมร่างกายก่อนรักษาโรคมะเร็ง และการตรวจอื่นๆ', 'Follow-up, pre-treatment procedures, and other investigations', 'follow_up', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '99'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C9931', 'การรักษาผู้ป่วยนอก ค่ายาเคมีบำบัด และหรือฮอร์โมน', 'Outpatient chemo/hormone treatment for other cancers', 'treatment', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '99'
ON CONFLICT (protocol_code) DO NOTHING;

INSERT INTO protocol_names (cancer_site_id, protocol_code, name_thai, name_english, protocol_type, treatment_intent, is_active)
SELECT cs.id, 'C9932', 'การรักษาผู้ป่วยใน จ่ายตาม DRG', 'Inpatient treatment by DRG for other cancers', 'treatment', NULL, true
FROM cancer_sites cs WHERE cs.site_code = '99'
ON CONFLICT (protocol_code) DO NOTHING;

