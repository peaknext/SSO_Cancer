-- 001: Cancer Sites (ตำแหน่งมะเร็ง) — 23 anatomical locations

INSERT INTO cancer_sites (site_code, name_thai, name_english, sort_order, is_active)
VALUES
  ('01', 'โรคมะเร็งเต้านม', 'Breast Cancer', 1, true),
  ('02', 'โรคมะเร็งปากมดลูก', 'Cervical Cancer', 2, true),
  ('03', 'โรคมะเร็งรังไข่', 'Ovarian Cancer', 3, true),
  ('04', 'โรคมะเร็งมดลูก', 'Uterine/Endometrial Cancer', 4, true),
  ('05', 'โรคมะเร็งศีรษะและลำคอ', 'Head and Neck Cancer', 5, true),
  ('06', 'โรคมะเร็งปอด', 'Lung Cancer', 6, true),
  ('07', 'โรคมะเร็งลำไส้ใหญ่และลำไส้ตรง ทวารหนัก และไส้ติ่ง', 'Colorectal, Anal and Appendiceal Cancer', 7, true),
  ('08', 'โรคมะเร็งหลอดอาหาร', 'Esophageal Cancer', 8, true),
  ('09', 'โรคมะเร็งกระเพาะอาหาร', 'Gastric (Stomach) Cancer', 9, true),
  ('10', 'โรคมะเร็งตับ ท่อน้ำดี และมะเร็งตับอ่อน', 'Hepatobiliary and Pancreatic Cancer', 10, true),
  ('11', 'โรคมะเร็งกระเพาะปัสสาวะ และมะเร็งไต', 'Bladder and Kidney Cancer', 11, true),
  ('12', 'โรคมะเร็งต่อมลูกหมาก', 'Prostate Cancer', 12, true),
  ('13', 'โรคมะเร็งเม็ดเลือดขาวชนิดเฉียบพลันแบบลิมฟอยด์ในผู้ใหญ่', 'Adult Acute Lymphoblastic Leukemia (ALL)', 13, true),
  ('14', 'โรคมะเร็งเม็ดเลือดขาวชนิดเฉียบพลันแบบมัยอิลอยด์ในผู้ใหญ่', 'Adult Acute Myeloid Leukemia (AML)', 14, true),
  ('15', 'โรคมะเร็งเม็ดเลือดขาวชนิดเฉียบพลันในผู้ใหญ่', 'Adult Acute Leukemia (APL)', 15, true),
  ('16', 'โรคมะเร็งเม็ดเลือดขาวเรื้อรังชนิดมัยอิลอยด์ในผู้ใหญ่', 'Adult Chronic Myeloid Leukemia (CML)', 16, true),
  ('17', 'โรคมะเร็งต่อมน้ำเหลืองในผู้ใหญ่', 'Adult Lymphoma', 17, true),
  ('18', 'โรคมะเร็งเม็ดเลือดขาวมัยอิโลมา และภาวะโรค Myelodysplastic Syndrome', 'Multiple Myeloma and MDS', 18, true),
  ('19', 'โรคมะเร็งกระดูก', 'Bone Cancer', 19, true),
  ('20', 'โรคมะเร็งเนื้อเยื่ออ่อน', 'Soft Tissue Sarcoma', 20, true),
  ('21', 'โรคมะเร็งเด็ก', 'Pediatric Cancer', 21, true),
  ('88', 'การรักษาด้วยการผ่าตัด', 'Surgical Treatment', 88, true),
  ('99', 'โรคมะเร็งชนิดอื่นนอกเหนือจากโรคมะเร็ง 21 ชนิด', 'Other Cancer Types (No Protocol)', 99, true)
ON CONFLICT (site_code) DO NOTHING;
