-- HOSxP Development Seed Data
-- Test cancer patients with OPD visits, IPD admissions, diagnoses, and billing items.
-- Run after hosxp-dev-schema.sql: psql -U postgres -d hosxp_dev -f scripts/hosxp-dev-seed.sql

-- ═══════════════════════════════════════════════════════════════════════════════
-- Reference Data
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO doctor (code, licenseno, name) VALUES
  ('0001', 'ว.12345', 'นพ.สมชาย รักษ์ดี'),
  ('0002', 'ว.23456', 'พญ.สมหญิง ใจดี'),
  ('0003', 'ว.34567', 'นพ.วิทย์ เวชกรรม')
ON CONFLICT DO NOTHING;

INSERT INTO ward (ward, name) VALUES
  ('0101', 'อายุรกรรมชาย'),
  ('0102', 'อายุรกรรมหญิง'),
  ('0201', 'ศัลยกรรม'),
  ('0301', 'สูตินรีเวชกรรม')
ON CONFLICT DO NOTHING;

INSERT INTO income (income, name, std_group) VALUES
  ('01', 'ค่าห้อง ค่าอาหาร', '1'),
  ('02', 'ค่าอวัยวะเทียม', '2'),
  ('03', 'ค่ายา', '3'),
  ('04', 'ค่าเวชภัณฑ์', '4'),
  ('05', 'ค่าบริการทางทันตกรรม', '5'),
  ('06', 'ค่าตรวจวินิจฉัย', '6'),
  ('07', 'ค่าตรวจรักษา', '7'),
  ('08', 'ค่าบริการโลหิต', '8'),
  ('09', 'ค่าอื่นๆ', '9'),
  ('10', 'ค่าบริการทางกายภาพ', '10'),
  ('11', 'ค่าบริการฝังเข็ม', '11')
ON CONFLICT DO NOTHING;

INSERT INTO spclty (spclty, name) VALUES
  ('01', 'อายุรกรรม'),
  ('02', 'ศัลยกรรม'),
  ('03', 'สูตินรีเวชกรรม'),
  ('04', 'กุมารเวชกรรม'),
  ('10', 'รังสีวิทยา')
ON CONFLICT DO NOTHING;

INSERT INTO kskdepartment (depcode, department) VALUES
  ('001', 'คลินิกอายุรกรรม'),
  ('002', 'คลินิกศัลยกรรม'),
  ('003', 'คลินิกมะเร็ง'),
  ('004', 'ห้องฉุกเฉิน')
ON CONFLICT DO NOTHING;

-- ICD-10 codes commonly used in cancer care
INSERT INTO icd101 (code, tname, ename) VALUES
  ('C11.9', 'มะเร็งหลังโพรงจมูก ไม่ระบุตำแหน่ง', 'Nasopharyngeal carcinoma, unspecified'),
  ('C50.9', 'มะเร็งเต้านม ไม่ระบุตำแหน่ง', 'Breast cancer, unspecified'),
  ('C34.9', 'มะเร็งปอด ไม่ระบุตำแหน่ง', 'Lung cancer, unspecified'),
  ('C18.9', 'มะเร็งลำไส้ใหญ่ ไม่ระบุตำแหน่ง', 'Colon cancer, unspecified'),
  ('C61', 'มะเร็งต่อมลูกหมาก', 'Prostate cancer'),
  ('Z51.1', 'เข้ารับเคมีบำบัด', 'Encounter for antineoplastic chemotherapy'),
  ('Z51.11', 'เข้ารับเคมีบำบัด', 'Encounter for antineoplastic chemotherapy'),
  ('Z51.0', 'เข้ารับรังสีรักษา', 'Encounter for antineoplastic radiation therapy'),
  ('D05.9', 'มะเร็งเต้านมระยะ in situ ไม่ระบุ', 'Carcinoma in situ of breast, unspecified'),
  ('E11.9', 'เบาหวานชนิดที่ 2', 'Type 2 diabetes mellitus'),
  ('I10', 'ความดันโลหิตสูง', 'Essential hypertension')
ON CONFLICT DO NOTHING;

-- Drug items with SKS codes (matching real AIPN codes)
INSERT INTO drugitems (icode, name, generic_name, strength, dosageform, sks_drug_code, sks_dfs_text, sks_reimb_price, tmt_tp_code, income) VALUES
  ('1500001', 'Cisplatin 50mg inj', 'Cisplatin', '50 mg', 'injection', '1015980000000401C', 'CISPLATIN 50 MG INJECTION', 450.00, '101598', '03'),
  ('1500002', 'Carboplatin 150mg inj', 'Carboplatin', '150 mg', 'injection', '1002450000000401C', 'CARBOPLATIN 150 MG INJECTION', 1200.00, '100245', '03'),
  ('1500003', 'Paclitaxel 100mg inj', 'Paclitaxel', '100 mg/16.7 ml', 'injection', '1046020000000602C', 'PACLITAXEL 100 MG/16.7 ML INJECTION', 3500.00, '104602', '03'),
  ('1500004', 'Doxorubicin 50mg inj', 'Doxorubicin', '50 mg', 'injection', '1023280000000401C', 'DOXORUBICIN 50 MG INJECTION', 800.00, '102328', '03'),
  ('1500005', 'Cyclophosphamide 200mg tab', 'Cyclophosphamide', '200 mg', 'tablet', '1018870000000102C', 'CYCLOPHOSPHAMIDE 200 MG TABLET', 50.00, '101887', '03'),
  ('1500006', 'Fluorouracil 500mg inj', 'Fluorouracil', '500 mg', 'injection', '1029640000000401C', 'FLUOROURACIL 500 MG INJECTION', 120.00, '102964', '03'),
  ('1500007', 'Ondansetron 8mg inj', 'Ondansetron', '8 mg', 'injection', '1046930000000401C', 'ONDANSETRON 8 MG INJECTION', 65.00, '104693', '03'),
  ('1500008', 'Dexamethasone 4mg inj', 'Dexamethasone', '4 mg', 'injection', '1020920000000401C', 'DEXAMETHASONE 4 MG INJECTION', 15.00, '102092', '03'),
  ('1600001', 'ค่าให้เคมีบำบัด', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '07'),
  ('1600002', 'ค่า CBC', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '06'),
  ('1600003', 'ค่าตรวจ LFT', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '06')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Test Patients
-- ═══════════════════════════════════════════════════════════════════════════════

-- Patient 1: Breast cancer (C50.9) with chemo visits
INSERT INTO patient (hn, cid, pname, fname, lname, sex, birthday, mobile_phone_number, marrystatus, nationality, chwpart, amppart)
VALUES ('000857160', '1100100857160', 'นาง', 'สมศรี', 'รักษ์ดี', '2', '1970-05-15', '0891234567', '2', '099', '10', '01')
ON CONFLICT DO NOTHING;

-- Patient 2: NPC (C11.9) with chemo + radiation
INSERT INTO patient (hn, cid, pname, fname, lname, sex, birthday, mobile_phone_number, marrystatus, nationality, chwpart, amppart)
VALUES ('000123456', '1100200123456', 'นาย', 'สมชาย', 'ใจดี', '1', '1965-08-20', '0897654321', '2', '099', '47', '01')
ON CONFLICT DO NOTHING;

-- Patient 3: Colon cancer (C18.9) with IPD admission
INSERT INTO patient (hn, cid, pname, fname, lname, sex, birthday, mobile_phone_number, marrystatus, nationality, chwpart, amppart)
VALUES ('000234567', '1100300234567', 'นาย', 'วิชัย', 'มั่นคง', '1', '1958-03-10', '0812345678', '2', '099', '10', '03')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- OPD Visits for Patient 1 (HN 000857160) — Breast cancer chemo
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO ovst (vn, hn, vstdate, vsttime, doctor, cur_dep, ovstist, ovstost)
VALUES
  ('6801001000001', '000857160', '2025-11-15', '09:00:00', '0001', '003', '1', '1'),
  ('6801001000002', '000857160', '2025-12-10', '09:30:00', '0001', '003', '1', '1'),
  ('6801001000003', '000857160', '2026-01-08', '10:00:00', '0002', '003', '1', '1')
ON CONFLICT DO NOTHING;

-- Diagnoses for Patient 1 visits
INSERT INTO ovstdiag (vn, icd10, diagtype, doctor) VALUES
  ('6801001000001', 'C50.9', '1 ', '0001'),
  ('6801001000001', 'Z51.11', '2 ', '0001'),
  ('6801001000001', 'E11.9', '4 ', '0001'),
  ('6801001000002', 'C50.9', '1 ', '0001'),
  ('6801001000002', 'Z51.11', '2 ', '0001'),
  ('6801001000003', 'C50.9', '1 ', '0002'),
  ('6801001000003', 'Z51.11', '2 ', '0002')
ON CONFLICT DO NOTHING;

-- HPI / PE for Patient 1
INSERT INTO opdscreen (hos_guid, vn, cc, pe) VALUES
  ('guid-opd-001', '6801001000001', 'มาตามนัดรับเคมีบำบัด ครั้งที่ 1 ไม่มีอาการผิดปกติ', 'GA: good, no acute distress. Vitals stable.'),
  ('guid-opd-002', '6801001000002', 'มาตามนัดรับเคมีบำบัด ครั้งที่ 2 คลื่นไส้เล็กน้อย', 'GA: mild nausea. Vitals stable. No fever.'),
  ('guid-opd-003', '6801001000003', 'มาตามนัดรับเคมีบำบัด ครั้งที่ 3', 'GA: good. Port-A-Cath site clean.')
ON CONFLICT DO NOTHING;

-- Billing items for Patient 1 (drugs + services)
INSERT INTO opitemrece (vn, icode, qty, unitprice, sum_price, discount, drugusage, idr, iperday, iperdose, item_type, income, rxdate) VALUES
  -- Visit 1: AC regimen (Doxorubicin + Cyclophosphamide)
  ('6801001000001', '1500004', 1, 800.00, 800.00, 0, 'IV drip in NS 250 ml', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2025-11-15'),
  ('6801001000001', '1500005', 3, 50.00, 150.00, 0, 'รับประทานวันละ 1 ครั้ง', 'รับประทาน', 1, 1, 'D', '03', '2025-11-15'),
  ('6801001000001', '1500007', 2, 65.00, 130.00, 0, 'IV before chemo', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2025-11-15'),
  ('6801001000001', '1500008', 2, 15.00, 30.00, 0, 'IV before chemo', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2025-11-15'),
  ('6801001000001', '1600001', 1, 500.00, 500.00, 0, NULL, NULL, NULL, NULL, 'S', '07', '2025-11-15'),
  ('6801001000001', '1600002', 1, 120.00, 120.00, 0, NULL, NULL, NULL, NULL, 'S', '06', '2025-11-15'),
  -- Visit 2: AC cycle 2
  ('6801001000002', '1500004', 1, 800.00, 800.00, 0, 'IV drip in NS 250 ml', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2025-12-10'),
  ('6801001000002', '1500005', 3, 50.00, 150.00, 0, 'รับประทานวันละ 1 ครั้ง', 'รับประทาน', 1, 1, 'D', '03', '2025-12-10'),
  ('6801001000002', '1500007', 2, 65.00, 130.00, 0, 'IV before chemo', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2025-12-10'),
  ('6801001000002', '1600001', 1, 500.00, 500.00, 0, NULL, NULL, NULL, NULL, 'S', '07', '2025-12-10'),
  -- Visit 3: Paclitaxel
  ('6801001000003', '1500003', 1, 3500.00, 3500.00, 0, 'IV drip in NS 500 ml over 3hr', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2026-01-08'),
  ('6801001000003', '1500007', 2, 65.00, 130.00, 0, 'IV before chemo', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2026-01-08'),
  ('6801001000003', '1500008', 3, 15.00, 45.00, 0, 'IV before chemo', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2026-01-08'),
  ('6801001000003', '1600001', 1, 500.00, 500.00, 0, NULL, NULL, NULL, NULL, 'S', '07', '2026-01-08')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- OPD Visits for Patient 2 (HN 000123456) — NPC chemo+radiation
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO ovst (vn, hn, vstdate, vsttime, doctor, cur_dep, ovstist, ovstost)
VALUES
  ('6802001000001', '000123456', '2025-10-01', '08:30:00', '0002', '003', '1', '1'),
  ('6802001000002', '000123456', '2025-10-02', '13:00:00', '0003', '003', '1', '1')
ON CONFLICT DO NOTHING;

INSERT INTO ovstdiag (vn, icd10, diagtype, doctor) VALUES
  ('6802001000001', 'C11.9', '1 ', '0002'),
  ('6802001000001', 'Z51.11', '2 ', '0002'),
  ('6802001000002', 'C11.9', '1 ', '0003'),
  ('6802001000002', 'Z51.0', '2 ', '0003')
ON CONFLICT DO NOTHING;

INSERT INTO opdscreen (hos_guid, vn, cc, pe) VALUES
  ('guid-opd-004', '6802001000001', 'Concurrent CRT cycle 1 — cisplatin + RT', 'GA: stable. Oral mucosa intact.'),
  ('guid-opd-005', '6802001000002', 'Radiation therapy session 5/33', 'GA: mild skin erythema over radiation field.')
ON CONFLICT DO NOTHING;

INSERT INTO opitemrece (vn, icode, qty, unitprice, sum_price, discount, drugusage, idr, iperday, iperdose, item_type, income, rxdate) VALUES
  ('6802001000001', '1500001', 1, 450.00, 450.00, 0, 'IV drip in NS 1000 ml', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2025-10-01'),
  ('6802001000001', '1500007', 2, 65.00, 130.00, 0, 'IV before chemo', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2025-10-01'),
  ('6802001000001', '1600001', 1, 500.00, 500.00, 0, NULL, NULL, NULL, NULL, 'S', '07', '2025-10-01'),
  ('6802001000002', '1600001', 1, 2000.00, 2000.00, 0, NULL, NULL, NULL, NULL, 'S', '07', '2025-10-02')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- IPD Admissions for Patient 3 (HN 000234567) — Colon cancer surgery + chemo
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO ipt (an, hn, vn, regdate, regtime, dchdate, dchtime, dchtype, dchstts, ward, spclty, pttype, admdoctor, drg, rw, adjrw)
VALUES
  ('680100001', '000234567', '6803001000001', '2025-12-01', '10:00:00', '2025-12-08', '11:00:00', '01', '02', '0201', '02', '74', '0002', '17001', 2.5, 2.3),
  ('680100002', '000234567', '6803001000002', '2026-01-15', '09:00:00', '2026-01-17', '14:00:00', '01', '01', '0101', '01', '74', '0001', '40580', 1.2, 1.1)
ON CONFLICT DO NOTHING;

-- OPD records linking to the admissions
INSERT INTO ovst (vn, hn, vstdate, vsttime, doctor, cur_dep, ovstist, ovstost, an)
VALUES
  ('6803001000001', '000234567', '2025-12-01', '10:00:00', '0002', '002', '1', '1', '680100001'),
  ('6803001000002', '000234567', '2026-01-15', '09:00:00', '0001', '001', '1', '1', '680100002')
ON CONFLICT DO NOTHING;

-- IPD Diagnoses
INSERT INTO iptdiag (an, icd10, diagtype, doctor) VALUES
  -- Admission 1: Surgery
  ('680100001', 'C18.9', '1 ', '0002'),
  ('680100001', 'I10', '2 ', '0002'),
  ('680100001', 'E11.9', '2 ', '0002'),
  -- Admission 2: Chemo
  ('680100002', 'C18.9', '1 ', '0001'),
  ('680100002', 'Z51.11', '2 ', '0001')
ON CONFLICT DO NOTHING;

-- IPD Procedures
INSERT INTO iptoprt (an, icd9, icode, doctor, opdate) VALUES
  ('680100001', '4573', NULL, '0002', '2025-12-02'),
  ('680100002', '9925', NULL, '0001', '2026-01-15')
ON CONFLICT DO NOTHING;

-- IPD Billing items
INSERT INTO opitemrece (an, icode, qty, unitprice, sum_price, discount, drugusage, idr, iperday, iperdose, item_type, income, rxdate) VALUES
  -- Admission 1: Surgery supplies + room
  ('680100001', '1600001', 1, 5000.00, 5000.00, 0, NULL, NULL, NULL, NULL, 'S', '07', '2025-12-02'),
  ('680100001', '1600002', 3, 120.00, 360.00, 0, NULL, NULL, NULL, NULL, 'S', '06', '2025-12-01'),
  -- Admission 2: Chemo drugs
  ('680100002', '1500006', 1, 120.00, 120.00, 0, 'IV drip', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2026-01-15'),
  ('680100002', '1500001', 1, 450.00, 450.00, 0, 'IV drip in NS 1000 ml', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2026-01-15'),
  ('680100002', '1500007', 2, 65.00, 130.00, 0, 'IV before chemo', 'ฉีดเข้าหลอดเลือดดำ', 1, 1, 'D', '03', '2026-01-15'),
  ('680100002', '1600001', 1, 500.00, 500.00, 0, NULL, NULL, NULL, NULL, 'S', '07', '2026-01-15')
ON CONFLICT DO NOTHING;
