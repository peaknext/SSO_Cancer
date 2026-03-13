-- HOSxP Development Database Schema
-- Minimal tables matching real HOSxP PostgreSQL structure for local development.
-- Run: psql -U postgres -f scripts/hosxp-dev-schema.sql
--
-- Usage:
--   1. Create database: CREATE DATABASE hosxp_dev;
--   2. Connect: \c hosxp_dev
--   3. Run this file to create tables
--   4. Run hosxp-dev-seed.sql to insert test data

-- ═══════════════════════════════════════════════════════════════════════════════
-- Reference / Master tables
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS doctor (
  code varchar(15) NOT NULL PRIMARY KEY,
  licenseno varchar(50),
  name varchar(100),
  fname varchar(100),
  lname varchar(100)
);

CREATE TABLE IF NOT EXISTS ward (
  ward varchar(4) NOT NULL PRIMARY KEY,
  name varchar(100)
);

CREATE TABLE IF NOT EXISTS pttype (
  pttype char(2) NOT NULL PRIMARY KEY,
  name varchar(100)
);

CREATE TABLE IF NOT EXISTS income (
  income char(2) NOT NULL PRIMARY KEY,
  name varchar(200),
  std_group varchar(10)
);

CREATE TABLE IF NOT EXISTS icd101 (
  code varchar(9) NOT NULL PRIMARY KEY,
  tname varchar(500),
  ename varchar(500)
);

CREATE TABLE IF NOT EXISTS kskdepartment (
  depcode char(3) NOT NULL PRIMARY KEY,
  department varchar(200)
);

CREATE TABLE IF NOT EXISTS spclty (
  spclty char(2) NOT NULL PRIMARY KEY,
  name varchar(200)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Patient Registration (REG)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS patient (
  hn varchar(9) NOT NULL PRIMARY KEY,
  cid varchar(13),
  pname varchar(25),
  fname varchar(100),
  lname varchar(100),
  sex char(1),
  birthday date,
  mobile_phone_number varchar(50),
  hometel varchar(50),
  marrystatus char(1),
  nationality char(3),
  chwpart char(2),
  amppart char(2),
  addrpart varchar(200),
  mession varchar(200),
  email varchar(100)
);

CREATE INDEX IF NOT EXISTS idx_patient_cid ON patient(cid);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Outpatient (OPD)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ovst (
  vn varchar(13) NOT NULL PRIMARY KEY,
  hn varchar(9),
  vstdate date,
  vsttime time,
  doctor varchar(7),
  cur_dep char(3),
  ovstist char(2),
  ovstost varchar(4),
  an varchar(9),
  pttype char(2),
  spclty char(2)
);

CREATE INDEX IF NOT EXISTS idx_ovst_hn ON ovst(hn);
CREATE INDEX IF NOT EXISTS idx_ovst_vstdate ON ovst(vstdate);
CREATE INDEX IF NOT EXISTS idx_ovst_an ON ovst(an);

CREATE TABLE IF NOT EXISTS ovstdiag (
  ovst_diag_id serial PRIMARY KEY,
  vn varchar(13),
  icd10 varchar(9),
  diagtype char(2),
  doctor varchar(6),
  hos_guid varchar(50)
);

CREATE INDEX IF NOT EXISTS idx_ovstdiag_vn ON ovstdiag(vn);
CREATE INDEX IF NOT EXISTS idx_ovstdiag_icd10 ON ovstdiag(icd10);

CREATE TABLE IF NOT EXISTS opdscreen (
  hos_guid varchar(50) PRIMARY KEY,
  vn varchar(13),
  cc text,
  pe text,
  bw numeric,
  pulse integer,
  bps integer,
  bpd integer,
  temperature numeric
);

CREATE INDEX IF NOT EXISTS idx_opdscreen_vn ON opdscreen(vn);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Inpatient (IPD)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ipt (
  an varchar(9) NOT NULL PRIMARY KEY,
  hn varchar(9),
  vn varchar(13),
  regdate date,
  regtime time,
  dchdate date,
  dchtime time,
  dchtype char(2),
  dchstts char(2),
  ward varchar(4),
  spclty char(2),
  pttype char(2),
  admdoctor varchar(7),
  drg varchar(5),
  rw numeric,
  adjrw numeric
);

CREATE INDEX IF NOT EXISTS idx_ipt_hn ON ipt(hn);
CREATE INDEX IF NOT EXISTS idx_ipt_regdate ON ipt(regdate);

CREATE TABLE IF NOT EXISTS iptdiag (
  id serial PRIMARY KEY,
  an varchar(9),
  icd10 varchar(9),
  diagtype char(2),
  doctor varchar(7),
  hos_guid varchar(50)
);

CREATE INDEX IF NOT EXISTS idx_iptdiag_an ON iptdiag(an);

CREATE TABLE IF NOT EXISTS iptoprt (
  id serial PRIMARY KEY,
  an varchar(9),
  icd9 varchar(9),
  icode varchar(7),
  doctor varchar(7),
  opdate date,
  hos_guid varchar(50)
);

CREATE INDEX IF NOT EXISTS idx_iptoprt_an ON iptoprt(an);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Pharmacy / Drug items (REF)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS drugitems (
  icode varchar(7) NOT NULL PRIMARY KEY,
  name varchar(100),
  generic_name varchar(250),
  strength varchar(50),
  dosageform varchar(100),
  sks_drug_code varchar(50),
  sks_dfs_text varchar(500),
  sks_reimb_price numeric,
  tmt_tp_code varchar(30),
  income char(2),
  did integer
);

CREATE INDEX IF NOT EXISTS idx_drugitems_sks ON drugitems(sks_drug_code);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Billing (BIL)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS opitemrece (
  hositemrece_id serial PRIMARY KEY,
  vn varchar(13),
  an varchar(9),
  icode char(7),
  qty integer,
  unitprice numeric,
  sum_price numeric,
  discount numeric,
  drugusage text,
  idr varchar(200),
  iperday integer,
  iperdose numeric,
  item_type char(1),
  income char(2),
  rxdate date,
  hos_guid varchar(50)
);

CREATE INDEX IF NOT EXISTS idx_opitemrece_vn ON opitemrece(vn);
CREATE INDEX IF NOT EXISTS idx_opitemrece_an ON opitemrece(an);
CREATE INDEX IF NOT EXISTS idx_opitemrece_icode ON opitemrece(icode);
