import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolConfig } from 'pg';
import { PrismaService } from '../../prisma/prisma.service';
import { IHisClient } from './his-client.interface';
import {
  HisPatientSearchResult,
  HisPatientData,
  HisAdmissionData,
  HisVisit,
  HisDiagnosis,
  HisBillingItem,
  HisMedication,
  HisAdmission,
  HisProcedure,
  extractDiagnosesFromArray,
} from './types/his-api.types';
import { decryptValue } from '../../common/utils/crypto.util';

interface HisDbSettings {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

@Injectable()
export class HisDbClient implements IHisClient, OnModuleDestroy {
  private readonly logger = new Logger(HisDbClient.name);
  private pool: Pool | null = null;
  private poolSettingsHash = '';
  private settingsCache: HisDbSettings | null = null;
  private settingsCacheTime = 0;
  private static readonly CACHE_TTL_MS = 60_000;
  /** Cached set of optional ipt columns that exist in this HOSxP installation */
  private iptColumnsCache: Set<string> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  // ─── Settings & Pool ────────────────────────────────────────────────────────

  private async getSettings(): Promise<HisDbSettings> {
    const now = Date.now();
    if (this.settingsCache && now - this.settingsCacheTime < HisDbClient.CACHE_TTL_MS) {
      return this.settingsCache;
    }

    const rows = await this.prisma.appSetting.findMany({
      where: {
        settingKey: {
          in: [
            'his_db_host',
            'his_db_port',
            'his_db_name',
            'his_db_user',
            'his_db_password',
            'his_db_ssl',
          ],
        },
        isActive: true,
      },
    });

    const map = new Map(rows.map((r) => [r.settingKey, r.settingValue]));
    const rawPassword = map.get('his_db_password') || '';

    this.settingsCache = {
      host: map.get('his_db_host') || '',
      port: parseInt(map.get('his_db_port') || '5432', 10),
      database: map.get('his_db_name') || '',
      user: map.get('his_db_user') || '',
      password: rawPassword ? decryptValue(rawPassword) : '',
      ssl: map.get('his_db_ssl') === 'true',
    };
    this.settingsCacheTime = now;

    return this.settingsCache;
  }

  private async getPool(): Promise<Pool> {
    const settings = await this.getSettings();

    if (!settings.host || !settings.database) {
      throw new Error(
        'HOSxP DB ยังไม่ได้ตั้งค่า — กรุณาตั้งค่า his_db_host และ his_db_name ในหน้า Settings',
      );
    }

    // Recreate pool if settings changed
    const hash = `${settings.host}:${settings.port}/${settings.database}@${settings.user}`;
    if (this.pool && hash === this.poolSettingsHash) {
      return this.pool;
    }

    // Settings changed — destroy old pool and create new one
    if (this.pool) {
      this.logger.log('HOSxP DB settings changed — recreating pool');
      await this.pool.end().catch(() => {});
      this.pool = null;
    }

    const poolConfig: PoolConfig = {
      host: settings.host,
      port: settings.port,
      database: settings.database,
      user: settings.user,
      password: settings.password,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 30_000,
      ssl: settings.ssl ? { rejectUnauthorized: false } : undefined,
    };

    this.pool = new Pool(poolConfig);
    this.poolSettingsHash = hash;
    this.pool.on('error', (err) => {
      this.logger.error('HOSxP pool error:', err.message);
    });

    return this.pool;
  }

  /** Reset pool when settings change */
  async resetPool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.settingsCache = null;
    this.settingsCacheTime = 0;
    this.iptColumnsCache = null;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** HOSxP stores HN as 9-digit with leading zeros; our system strips zeros */
  private padHn(hn: string): string {
    return hn.padStart(9, '0');
  }

  /** Strip leading zeros from HOSxP HN */
  private stripHn(hn: string): string {
    return hn.replace(/^0+/, '') || '0';
  }

  /**
   * Detect which optional columns exist in the ipt table.
   * HOSxP installations vary — some lack admtype, admsource, etc.
   */
  private async getIptColumns(pool: Pool): Promise<Set<string>> {
    if (this.iptColumnsCache) return this.iptColumnsCache;
    try {
      const { rows } = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'ipt' AND column_name IN ('admtype', 'admsource')`,
      );
      this.iptColumnsCache = new Set(rows.map((r: any) => r.column_name));
    } catch {
      this.iptColumnsCache = new Set();
    }
    return this.iptColumnsCache;
  }

  // ─── IHisClient Implementation ─────────────────────────────────────────────

  async isConfigured(): Promise<boolean> {
    const settings = await this.getSettings();
    return !!settings.host && !!settings.database;
  }

  async searchPatient(query: string, type?: string): Promise<HisPatientSearchResult[]> {
    const pool = await this.getPool();

    let whereClause: string;
    let param: string;

    if (type === 'citizen_id') {
      whereClause = 'p.cid = $1';
      param = query;
    } else {
      whereClause = 'p.hn = $1';
      param = this.padHn(query);
    }

    const sql = `
      SELECT
        p.hn,
        p.cid AS "citizenId",
        CONCAT(COALESCE(p.pname,''), COALESCE(p.fname,''), ' ', COALESCE(p.lname,'')) AS "fullName",
        p.pname AS "titleName",
        CASE p.sex WHEN '1' THEN 'M' WHEN '2' THEN 'F' ELSE p.sex END AS gender,
        TO_CHAR(p.birthday, 'YYYY-MM-DD') AS "dateOfBirth",
        COALESCE(p.mobile_phone_number, p.hometel) AS "phoneNumber",
        p.marrystatus AS "maritalStatus",
        p.nationality,
        p.chwpart AS province,
        p.amppart AS district
      FROM patient p
      WHERE ${whereClause}
      LIMIT 10
    `;

    const { rows } = await pool.query(sql, [param]);
    return rows.map((r: any) => ({
      ...r,
      hn: this.stripHn(r.hn || ''),
    }));
  }

  async fetchPatientWithVisits(
    query: string,
    type: 'hn' | 'citizen_id',
    from?: string,
    to?: string,
  ): Promise<HisPatientData> {
    const hn = await this.resolveHn(query, type);

    const pool = await this.getPool();
    const paddedHn = this.padHn(hn);

    // 1. Patient info
    const patientResult = await pool.query(
      `SELECT
        p.hn,
        p.cid AS "citizenId",
        CONCAT(COALESCE(p.pname,''), COALESCE(p.fname,''), ' ', COALESCE(p.lname,'')) AS "fullName",
        p.pname AS "titleName",
        CASE p.sex WHEN '1' THEN 'M' WHEN '2' THEN 'F' ELSE p.sex END AS gender,
        TO_CHAR(p.birthday, 'YYYY-MM-DD') AS "dateOfBirth",
        COALESCE(p.mobile_phone_number, p.hometel) AS "phoneNumber",
        p.marrystatus AS "maritalStatus",
        p.nationality,
        p.chwpart AS province,
        p.amppart AS district
      FROM patient p WHERE p.hn = $1`,
      [paddedHn],
    );

    if (patientResult.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลผู้ป่วยใน HIS');
    }

    const patient: HisPatientSearchResult = {
      ...patientResult.rows[0],
      hn: this.stripHn(patientResult.rows[0].hn || ''),
    };

    // 2. OPD Visits
    const visitsSql = `
      SELECT o.vn, TO_CHAR(o.vstdate, 'YYYY-MM-DD') AS "visitDate",
        CASE WHEN o.vsttime IS NOT NULL
          THEN TO_CHAR(o.vstdate, 'YYYY-MM-DD') || 'T' || o.vsttime::text
          ELSE NULL END AS "serviceStartTime",
        d.licenseno AS "physicianLicenseNo",
        o.cur_dep AS "clinicCode",
        TRIM(o.ovstost) AS "dischargeType",
        o.an,
        TRIM(o.pttype) AS pttype
      FROM ovst o
      LEFT JOIN doctor d ON d.code = o.doctor
      WHERE o.hn = $1
        AND ($2::date IS NULL OR o.vstdate >= $2::date)
        AND ($3::date IS NULL OR o.vstdate <= $3::date)
      ORDER BY o.vstdate DESC
    `;

    const visitsResult = await pool.query(visitsSql, [paddedHn, from || null, to || null]);
    const vns = visitsResult.rows.map((r: any) => r.vn).filter(Boolean);

    if (vns.length === 0) {
      return { patient, visits: [] };
    }

    // 3. Batch queries: diagnoses, billing, HPI
    const [diagRows, billingRows, hpiRows] = await Promise.all([
      this.batchDiagnoses(pool, vns),
      this.batchBillingItems(pool, vns, 'vn'),
      this.batchHpi(pool, vns),
    ]);

    // Group by VN
    const diagByVn = this.groupBy(diagRows, 'vn');
    const billingByVn = this.groupBy(billingRows, 'vn');
    const hpiByVn = this.groupBy(hpiRows, 'vn');

    // 4. Assemble visits
    const visits: HisVisit[] = visitsResult.rows.map((row: any) => {
      const vn = row.vn;
      const diagnoses: HisDiagnosis[] = (diagByVn[vn] || []).map((d: any) => ({
        diagCode: d.diagCode?.trim() || '',
        diagType: d.diagType?.trim() || '',
        diagTerm: d.diagTerm || undefined,
        doctorLicense: d.doctorLicense || undefined,
      }));

      const { primaryDiagnosis, secondaryDiagnoses } = extractDiagnosesFromArray(diagnoses);

      const allBilling = billingByVn[vn] || [];
      const billingItems = this.mapBillingItems(allBilling);
      const medications = this.extractMedications(allBilling);

      const hpi = hpiByVn[vn]?.[0];

      return {
        vn,
        visitDate: row.visitDate,
        serviceStartTime: row.serviceStartTime || undefined,
        physicianLicenseNo: row.physicianLicenseNo || undefined,
        clinicCode: row.clinicCode || undefined,
        pttype: row.pttype || undefined,
        dischargeType: row.dischargeType || undefined,
        primaryDiagnosis: primaryDiagnosis || '',
        secondaryDiagnoses: secondaryDiagnoses || undefined,
        hpi: hpi?.hpi || undefined,
        doctorNotes: hpi?.doctorNotes || undefined,
        diagnoses,
        medications,
        billingItems,
      };
    });

    return { patient, visits };
  }

  async fetchPatientWithAdmissions(
    query: string,
    type: 'hn' | 'citizen_id',
    from?: string,
    to?: string,
  ): Promise<HisAdmissionData> {
    const hn = await this.resolveHn(query, type);

    const pool = await this.getPool();
    const paddedHn = this.padHn(hn);

    // 1. Patient info
    const patientResult = await pool.query(
      `SELECT
        p.hn,
        p.cid AS "citizenId",
        CONCAT(COALESCE(p.pname,''), COALESCE(p.fname,''), ' ', COALESCE(p.lname,'')) AS "fullName",
        p.pname AS "titleName",
        CASE p.sex WHEN '1' THEN 'M' WHEN '2' THEN 'F' ELSE p.sex END AS gender,
        TO_CHAR(p.birthday, 'YYYY-MM-DD') AS "dateOfBirth",
        COALESCE(p.mobile_phone_number, p.hometel) AS "phoneNumber",
        p.marrystatus AS "maritalStatus",
        p.nationality,
        p.chwpart AS province,
        p.amppart AS district
      FROM patient p WHERE p.hn = $1`,
      [paddedHn],
    );

    if (patientResult.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลผู้ป่วยใน HIS');
    }

    const patient: HisPatientSearchResult = {
      ...patientResult.rows[0],
      hn: this.stripHn(patientResult.rows[0].hn || ''),
    };

    // 2. Admissions — detect optional columns first
    const iptCols = await this.getIptColumns(pool);
    const optionalSelects = [
      iptCols.has('admtype') ? `TRIM(i.admtype) AS "admissionType"` : `NULL AS "admissionType"`,
      iptCols.has('admsource') ? `TRIM(i.admsource) AS "admissionSource"` : `NULL AS "admissionSource"`,
    ].join(',\n        ');

    const admissionsSql = `
      SELECT i.an, i.hn, i.vn,
        TO_CHAR(i.regdate, 'YYYY-MM-DD') AS "admitDate",
        i.regtime::text AS "admitTime",
        TO_CHAR(i.dchdate, 'YYYY-MM-DD') AS "dischargeDate",
        i.dchtime::text AS "dischargeTime",
        TRIM(i.dchtype) AS "dischargeType",
        TRIM(i.dchstts) AS "dischargeStatus",
        i.ward,
        i.spclty AS department,
        d.licenseno AS "attendingDoctorLicense",
        i.drg,
        i.rw::numeric AS rw,
        i.adjrw::numeric AS "adjRw",
        ${optionalSelects}
      FROM ipt i
      LEFT JOIN doctor d ON d.code = i.admdoctor
      WHERE i.hn = $1
        AND ($2::date IS NULL OR i.regdate >= $2::date)
        AND ($3::date IS NULL OR i.regdate <= $3::date)
      ORDER BY i.regdate DESC
    `;

    const admissionsResult = await pool.query(admissionsSql, [paddedHn, from || null, to || null]);
    const ans = admissionsResult.rows.map((r: any) => r.an).filter(Boolean);

    if (ans.length === 0) {
      return { patient, admissions: [] };
    }

    // 3. Batch queries: IPD diagnoses, procedures, billing
    const [ipdDiagRows, ipdProcRows, ipdBillingRows] = await Promise.all([
      this.batchIpdDiagnoses(pool, ans),
      this.batchIpdProcedures(pool, ans),
      this.batchBillingItems(pool, ans, 'an'),
    ]);

    const diagByAn = this.groupBy(ipdDiagRows, 'an');
    const procByAn = this.groupBy(ipdProcRows, 'an');
    const billingByAn = this.groupBy(ipdBillingRows, 'an');

    // 4. Assemble admissions
    const admissions: HisAdmission[] = admissionsResult.rows.map((row: any) => {
      const an = row.an;

      const diagnoses: HisDiagnosis[] = (diagByAn[an] || []).map((d: any) => ({
        diagCode: d.diagCode?.trim() || '',
        diagType: d.diagType?.trim() || '',
        diagTerm: d.diagTerm || undefined,
        doctorLicense: d.doctorLicense || undefined,
      }));

      const procedures: HisProcedure[] = (procByAn[an] || []).map((p: any) => ({
        procedureCode: p.procedureCode?.trim() || '',
        codeSys: 'ICD9CM',
        procedureTerm: undefined,
        doctorLicense: p.doctorLicense || undefined,
        startDate: p.opdate || undefined,
      }));

      const allBilling = billingByAn[an] || [];
      const billingItems = this.mapBillingItems(allBilling);

      // Calculate LOS
      let lengthOfStay: number | undefined;
      if (row.admitDate && row.dischargeDate) {
        const admit = new Date(row.admitDate);
        const discharge = new Date(row.dischargeDate);
        lengthOfStay = Math.round(
          (discharge.getTime() - admit.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      return {
        an: an?.trim() || '',
        hn: this.stripHn(row.hn || ''),
        admitDate: row.admitDate || '',
        admitTime: row.admitTime || null,
        dischargeDate: row.dischargeDate || null,
        dischargeTime: row.dischargeTime || null,
        dischargeType: row.dischargeType || null,
        dischargeStatus: row.dischargeStatus || null,
        ward: row.ward || null,
        department: row.department || null,
        attendingDoctorLicense: row.attendingDoctorLicense || null,
        drg: row.drg || null,
        rw: row.rw ? Number(row.rw) : undefined,
        adjRw: row.adjRw ? Number(row.adjRw) : undefined,
        admissionType: row.admissionType || null,
        admissionSource: row.admissionSource || null,
        lengthOfStay,
        diagnoses,
        procedures,
        billingItems,
      };
    });

    return { patient, admissions };
  }

  async advancedSearchPatients(body: {
    from: string;
    to: string;
    icdPrefixes?: string[];
    secondaryDiagnosisCodes?: string[];
    drugKeywords?: string[];
  }): Promise<HisPatientSearchResult[]> {
    const pool = await this.getPool();

    // Build ICD LIKE patterns: 'C' → 'C%', 'D0' → 'D0%', 'Z51' → 'Z51%'
    const icdPatterns = [
      ...(body.icdPrefixes || []).map((p) => `${p}%`),
      ...(body.secondaryDiagnosisCodes || []).map((c) => c),
    ];

    const params: any[] = [body.from, body.to];

    // Build optional filter clauses (shared by OPD + IPD halves)
    let icdFilter = '';
    if (icdPatterns.length > 0) {
      params.push(icdPatterns);
      icdFilter = ` AND diag.icd10 LIKE ANY($${params.length})`;
    }

    let drugFilterOpd = '';
    let drugFilterIpd = '';
    if (body.drugKeywords && body.drugKeywords.length > 0) {
      const drugLikePatterns = body.drugKeywords.map((kw) => `%${kw}%`);
      params.push(drugLikePatterns);
      const drugParamIdx = params.length;
      drugFilterOpd = `
        AND EXISTS (
          SELECT 1 FROM opitemrece oi
          INNER JOIN drugitems di ON di.icode = oi.icode
          WHERE oi.vn = o.vn
            AND di.generic_name ILIKE ANY($${drugParamIdx})
        )`;
      drugFilterIpd = `
        AND EXISTS (
          SELECT 1 FROM opitemrece oi
          INNER JOIN drugitems di ON di.icode = oi.icode
          WHERE oi.an = i.an
            AND di.generic_name ILIKE ANY($${drugParamIdx})
        )`;
    }

    // UNION OPD (ovst) + IPD (ipt) to find patients across both visit types
    const sql = `
      WITH matching_visits AS (
        -- OPD visits
        SELECT o.hn, o.vn AS visit_key
        FROM ovst o
        INNER JOIN ovstdiag diag ON diag.vn = o.vn
        WHERE o.vstdate BETWEEN $1::date AND $2::date
          ${icdFilter}
          ${drugFilterOpd}

        UNION ALL

        -- IPD admissions
        SELECT i.hn, i.an AS visit_key
        FROM ipt i
        INNER JOIN iptdiag diag ON diag.an = i.an
        WHERE i.regdate BETWEEN $1::date AND $2::date
          ${icdFilter}
          ${drugFilterIpd}
      )
      SELECT p.hn,
        p.cid AS "citizenId",
        CONCAT(COALESCE(p.pname,''), COALESCE(p.fname,''), ' ', COALESCE(p.lname,'')) AS "fullName",
        CASE p.sex WHEN '1' THEN 'M' WHEN '2' THEN 'F' END AS gender,
        TO_CHAR(p.birthday, 'YYYY-MM-DD') AS "dateOfBirth",
        COUNT(DISTINCT mv.visit_key)::int AS "matchingVisitCount"
      FROM matching_visits mv
      INNER JOIN patient p ON p.hn = mv.hn
      GROUP BY p.hn, p.cid, p.pname, p.fname, p.lname, p.sex, p.birthday
      ORDER BY "matchingVisitCount" DESC
      LIMIT 500
    `;

    const { rows } = await pool.query(sql, params);
    return rows.map((r: any) => ({
      ...r,
      hn: this.stripHn(r.hn || ''),
    }));
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      const settings = await this.getSettings();
      if (!settings.host || !settings.database) {
        return { ok: false, message: 'HOSxP DB ยังไม่ได้ตั้งค่า' };
      }

      const pool = await this.getPool();
      const result = await pool.query('SELECT 1 AS ok');

      if (result.rows.length > 0) {
        return { ok: true, message: `เชื่อมต่อ HOSxP DB สำเร็จ (${settings.host}:${settings.port}/${settings.database})` };
      }
      return { ok: false, message: 'HOSxP DB query returned no results' };
    } catch (err: any) {
      return { ok: false, message: `ไม่สามารถเชื่อมต่อ HOSxP DB: ${err.message}` };
    }
  }

  // ─── Batch Queries ──────────────────────────────────────────────────────────

  /** OPD diagnoses batch by VN[] */
  private async batchDiagnoses(pool: Pool, vns: string[]): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT od.vn, od.icd10 AS "diagCode", TRIM(od.diagtype) AS "diagType",
        i.tname AS "diagTerm", d.licenseno AS "doctorLicense"
      FROM ovstdiag od
      LEFT JOIN icd101 i ON i.code = od.icd10
      LEFT JOIN doctor d ON d.code = od.doctor
      WHERE od.vn = ANY($1)
      ORDER BY od.vn, od.diagtype`,
      [vns],
    );
    return rows;
  }

  /** IPD diagnoses batch by AN[] */
  private async batchIpdDiagnoses(pool: Pool, ans: string[]): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT id.an, id.icd10 AS "diagCode", TRIM(id.diagtype) AS "diagType",
        i.tname AS "diagTerm", d.licenseno AS "doctorLicense"
      FROM iptdiag id
      LEFT JOIN icd101 i ON i.code = id.icd10
      LEFT JOIN doctor d ON d.code = id.doctor
      WHERE id.an = ANY($1)
      ORDER BY id.an, id.diagtype`,
      [ans],
    );
    return rows;
  }

  /** IPD procedures batch by AN[] */
  private async batchIpdProcedures(pool: Pool, ans: string[]): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT ip.an, ip.icd9 AS "procedureCode",
        TO_CHAR(ip.opdate, 'YYYY-MM-DD') AS opdate,
        d.licenseno AS "doctorLicense"
      FROM iptoprt ip
      LEFT JOIN doctor d ON d.code = ip.doctor
      WHERE ip.an = ANY($1)
      ORDER BY ip.an, ip.opdate`,
      [ans],
    );
    return rows;
  }

  /** Billing items batch by VN[] or AN[] */
  private async batchBillingItems(
    pool: Pool,
    keys: string[],
    keyColumn: 'vn' | 'an',
  ): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT oi.${keyColumn}, oi.icode AS "hospitalCode",
        di.sks_drug_code AS "sksDrugCode",
        di.sks_dfs_text AS "sksDfsText",
        di.sks_reimb_price::numeric AS "sksReimbPrice",
        di.tmt_tp_code AS "tmtCode",
        inc.std_group AS "stdGroup",
        oi.income AS "billingGroup",
        COALESCE(di.name, '') AS description,
        CONCAT_WS(' ', di.generic_name, di.strength, di.dosageform) AS "dfsText",
        oi.qty AS quantity,
        oi.unitprice::numeric AS "unitPrice",
        oi.sum_price::numeric AS "sumPrice",
        oi.discount::numeric AS discount,
        oi.drugusage AS "sigCode",
        oi.idr AS "sigText",
        oi.iperday,
        oi.iperdose::numeric AS iperdose,
        oi.item_type,
        di.income AS "drugIncome",
        di.generic_name AS "genericName",
        TO_CHAR(oi.rxdate, 'YYYY-MM-DD') AS "serviceDate"
      FROM opitemrece oi
      LEFT JOIN drugitems di ON di.icode = oi.icode
      LEFT JOIN income inc ON inc.income = oi.income
      WHERE oi.${keyColumn} = ANY($1)
      ORDER BY oi.${keyColumn}, oi.rxdate`,
      [keys],
    );
    return rows;
  }

  /** HPI/chief complaint batch by VN[] */
  private async batchHpi(pool: Pool, vns: string[]): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT os.vn, os.cc AS hpi, os.pe AS "doctorNotes"
      FROM opdscreen os
      WHERE os.vn = ANY($1)`,
      [vns],
    );
    return rows;
  }

  // ─── Mapping Helpers ────────────────────────────────────────────────────────

  /** Map raw billing rows to HisBillingItem[] */
  private mapBillingItems(rows: any[]): HisBillingItem[] {
    return rows.map((r) => ({
      hospitalCode: r.hospitalCode?.trim() || '',
      sksDrugCode: r.sksDrugCode?.trim() || undefined,
      sksDfsText: r.sksDfsText || undefined,
      sksReimbPrice: r.sksReimbPrice ? Number(r.sksReimbPrice) : undefined,
      tmtCode: r.tmtCode?.trim() || undefined,
      stdGroup: r.stdGroup?.trim() || undefined,
      billingGroup: r.billingGroup?.trim() || '',
      description: r.description || '',
      dfsText: r.dfsText?.trim() || undefined,
      quantity: r.quantity ? Number(r.quantity) : 0,
      unitPrice: r.unitPrice ? Number(r.unitPrice) : 0,
      claimUnitPrice: r.sumPrice ? Number(r.sumPrice) : undefined, // HOSxP sum_price = total (qty×price-discount), normalized later
      discount: r.discount ? Number(r.discount) : undefined,
      sigCode: r.sigCode?.trim() || undefined,
      sigText: r.sigText?.trim() || undefined,
      serviceDate: r.serviceDate || undefined,
    }));
  }

  /** Extract medications from billing items (income='03' or item_type='D') */
  private extractMedications(billingRows: any[]): HisMedication[] {
    return billingRows
      .filter(
        (r) =>
          r.drugIncome?.trim() === '03' ||
          r.billingGroup?.trim() === '03' ||
          r.item_type?.trim() === 'D',
      )
      .map((r) => ({
        hospitalCode: r.hospitalCode?.trim() || '',
        medicationName: r.genericName?.trim() || r.description || '',
        quantity: r.quantity ? String(r.quantity) : undefined,
        unit: undefined,
      }));
  }

  /** Resolve HN from query+type — if citizen_id, search patient first */
  private async resolveHn(query: string, type: 'hn' | 'citizen_id'): Promise<string> {
    if (type === 'citizen_id') {
      const patients = await this.searchPatient(query, 'citizen_id');
      if (!patients.length) {
        throw new Error('ไม่พบข้อมูลผู้ป่วยใน HIS');
      }
      return patients[0].hn;
    }
    return query;
  }

  /** Group array of objects by a key field */
  private groupBy<T extends Record<string, any>>(items: T[], key: string): Record<string, T[]> {
    const result: Record<string, T[]> = {};
    for (const item of items) {
      const k = item[key];
      if (k == null) continue;
      if (!result[k]) result[k] = [];
      result[k].push(item);
    }
    return result;
  }
}
