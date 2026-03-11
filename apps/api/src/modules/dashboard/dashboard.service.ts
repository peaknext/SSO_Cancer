import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    return this.withCache('overview', async () => {
      const [cancerSites, protocols, regimens, totalVisits, emptyRegimensCount] =
        await Promise.all([
          this.prisma.cancerSite.count({ where: { isActive: true } }),
          this.prisma.protocolName.count({ where: { isActive: true } }),
          this.prisma.regimen.count({ where: { isActive: true } }),
          this.prisma.patientVisit.count(),
          this.prisma.regimen.count({
            where: { isActive: true, regimenDrugs: { none: {} } },
          }),
        ]);

      let topCancerSite: {
        id: number;
        nameThai: string;
        nameEnglish: string;
        siteCode: string;
        visitCount: number;
        percentage: number;
      } | null = null;

      let visitDateRange: {
        minDate: string;
        maxDate: string;
      } | null = null;

      if (totalVisits > 0) {
        const [siteVisitCounts, minVisit, maxVisit] = await Promise.all([
          this.prisma.patientVisit.groupBy({
            by: ['resolvedSiteId'],
            _count: { id: true },
            where: { resolvedSiteId: { not: null } },
            orderBy: { _count: { id: 'desc' } },
            take: 1,
          }),
          this.prisma.patientVisit.findFirst({
            orderBy: { visitDate: 'asc' },
            select: { visitDate: true },
          }),
          this.prisma.patientVisit.findFirst({
            orderBy: { visitDate: 'desc' },
            select: { visitDate: true },
          }),
        ]);

        if (minVisit?.visitDate && maxVisit?.visitDate) {
          visitDateRange = {
            minDate: minVisit.visitDate.toISOString().split('T')[0],
            maxDate: maxVisit.visitDate.toISOString().split('T')[0],
          };
        }

        if (siteVisitCounts.length > 0) {
          const site = await this.prisma.cancerSite.findUnique({
            where: { id: siteVisitCounts[0].resolvedSiteId! },
            select: {
              id: true,
              nameThai: true,
              nameEnglish: true,
              siteCode: true,
            },
          });
          if (site) {
            topCancerSite = {
              ...site,
              visitCount: siteVisitCounts[0]._count.id,
              percentage:
                Math.round(
                  (siteVisitCounts[0]._count.id / totalVisits) * 1000,
                ) / 10,
            };
          }
        }
      }

      return {
        cancerSites,
        protocols,
        regimens,
        totalVisits,
        topCancerSite,
        visitDateRange,
        emptyRegimensCount,
      };
    });
  }

  async getVisitsBySite() {
    return this.withCache('visits-by-site', async () => {
      const grouped = await this.prisma.patientVisit.groupBy({
        by: ['resolvedSiteId'],
        _count: { id: true },
        where: { resolvedSiteId: { not: null } },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      if (grouped.length === 0) return [];

      const siteIds = grouped.map((g) => g.resolvedSiteId!);
      const sites = await this.prisma.cancerSite.findMany({
        where: { id: { in: siteIds } },
        select: {
          id: true,
          siteCode: true,
          nameThai: true,
          nameEnglish: true,
        },
      });

      const siteMap = new Map(sites.map((s) => [s.id, s]));

      return grouped
        .map((g) => {
          const site = siteMap.get(g.resolvedSiteId!);
          if (!site) return null;
          return {
            id: site.id,
            siteCode: site.siteCode,
            nameThai: site.nameThai,
            nameEnglish: site.nameEnglish,
            visitCount: g._count.id,
          };
        })
        .filter(Boolean);
    });
  }

  async getTopDrugsByVisits(category?: string) {
    const filter = category && category !== 'all' ? category : 'all';
    const cacheKey = `top-drugs-by-visits:${filter}`;

    return this.withCache(cacheKey, async () => {
      let drugIdFilter: number[] | null = null;

      if (filter === 'protocol') {
        const protocolDrugs = await this.prisma.regimenDrug.findMany({
          select: { drugId: true },
          distinct: ['drugId'],
        });
        drugIdFilter = protocolDrugs.map((r) => r.drugId);
      } else if (
        ['chemotherapy', 'hormonal', 'immunotherapy', 'targeted therapy'].includes(filter)
      ) {
        const categoryDrugs = await this.prisma.drug.findMany({
          where: { drugCategory: filter, isActive: true },
          select: { id: true },
        });
        drugIdFilter = categoryDrugs.map((d) => d.id);
      }

      const where: { resolvedDrugId: { not?: null; in?: number[] } } = {
        resolvedDrugId: { not: null },
      };
      if (drugIdFilter !== null) {
        if (drugIdFilter.length === 0) return [];
        where.resolvedDrugId = { in: drugIdFilter };
      }

      const grouped = await this.prisma.visitMedication.groupBy({
        by: ['resolvedDrugId'],
        _count: { id: true },
        where,
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      if (grouped.length === 0) return [];

      const drugIds = grouped.map((g) => g.resolvedDrugId!);
      const drugs = await this.prisma.drug.findMany({
        where: { id: { in: drugIds } },
        select: { id: true, genericName: true, drugCategory: true },
      });

      const drugMap = new Map(drugs.map((d) => [d.id, d]));

      return grouped
        .map((g) => {
          const drug = drugMap.get(g.resolvedDrugId!);
          if (!drug) return null;
          return {
            id: drug.id,
            genericName: drug.genericName,
            drugCategory: drug.drugCategory,
            visitCount: g._count.id,
          };
        })
        .filter(Boolean);
    });
  }

  async getConfirmationRate() {
    return this.withCache('confirmation-rate', async () => {
      const [totalVisits, confirmedVisits] = await Promise.all([
        this.prisma.patientVisit.count(),
        this.prisma.patientVisit.count({
          where: { confirmedProtocolId: { not: null } },
        }),
      ]);

      const unconfirmedVisits = totalVisits - confirmedVisits;
      const confirmationRate =
        totalVisits > 0
          ? Math.round((confirmedVisits / totalVisits) * 1000) / 10
          : 0;

      return {
        totalVisits,
        confirmedVisits,
        unconfirmedVisits,
        confirmationRate,
      };
    });
  }

  async getEmptyRegimens() {
    return this.withCache('empty-regimens', async () => {
      const regimens = await this.prisma.regimen.findMany({
        where: {
          isActive: true,
          regimenDrugs: { none: {} },
        },
        select: {
          id: true,
          regimenCode: true,
          regimenName: true,
          regimenType: true,
          _count: { select: { protocolRegimens: true } },
        },
        orderBy: { regimenCode: 'asc' },
      });

      return regimens.map((r) => ({
        id: r.id,
        regimenCode: r.regimenCode,
        regimenName: r.regimenName,
        regimenType: r.regimenType,
        protocolCount: r._count.protocolRegimens,
      }));
    });
  }

  async getProtocolsBySite() {
    return this.withCache('protocols-by-site', async () => {
      const sites = await this.prisma.cancerSite.findMany({
        where: { isActive: true },
        select: {
          id: true,
          siteCode: true,
          nameThai: true,
          nameEnglish: true,
          _count: { select: { protocols: true } },
        },
        orderBy: { sortOrder: 'asc' },
      });
      return sites.map((s) => ({
        id: s.id,
        siteCode: s.siteCode,
        nameThai: s.nameThai,
        nameEnglish: s.nameEnglish,
        protocolCount: s._count.protocols,
      }));
    });
  }

  async getProtocolsByType() {
    return this.withCache('protocols-by-type', async () => {
      const result = await this.prisma.protocolName.groupBy({
        by: ['protocolType'],
        _count: { id: true },
        where: { isActive: true },
      });
      return result.map((r) => ({
        protocolType: r.protocolType || 'Unspecified',
        count: r._count.id,
      }));
    });
  }

  async getDrugsByCategory() {
    return this.withCache('drugs-by-category', async () => {
      const result = await this.prisma.drug.groupBy({
        by: ['drugCategory'],
        _count: { id: true },
        where: { isActive: true },
      });
      return result.map((r) => ({
        drugCategory: r.drugCategory || 'Uncategorized',
        count: r._count.id,
      }));
    });
  }

  async getPriceCoverage() {
    return this.withCache('price-coverage', async () => {
      const categories = await this.prisma.drug.findMany({
        where: { isActive: true },
        select: {
          drugCategory: true,
          tradeNames: {
            where: { isActive: true },
            select: { unitPrice: true },
          },
        },
      });

      const categoryMap = new Map<
        string,
        { withPrice: number; withoutPrice: number }
      >();
      for (const drug of categories) {
        const cat = drug.drugCategory || 'Uncategorized';
        if (!categoryMap.has(cat))
          categoryMap.set(cat, { withPrice: 0, withoutPrice: 0 });
        const entry = categoryMap.get(cat)!;
        for (const tn of drug.tradeNames) {
          if (tn.unitPrice) entry.withPrice++;
          else entry.withoutPrice++;
        }
      }

      return Array.from(categoryMap.entries()).map(([category, counts]) => ({
        category,
        ...counts,
      }));
    });
  }

  async getAiStats() {
    return this.withCache('ai-stats', async () => {
      const [totalCalls, tokenAgg, topUsers] = await Promise.all([
        this.prisma.aiSuggestion.count(),
        this.prisma.aiSuggestion.aggregate({
          _sum: { tokensUsed: true },
        }),
        this.prisma.aiSuggestion.groupBy({
          by: ['requestedByUserId'],
          _count: { id: true },
          where: { requestedByUserId: { not: null } },
          orderBy: { _count: { id: 'desc' } },
          take: 1,
        }),
      ]);

      let topUser: {
        userId: number;
        fullName: string;
        callCount: number;
      } | null = null;

      if (topUsers.length > 0 && topUsers[0].requestedByUserId) {
        const user = await this.prisma.user.findUnique({
          where: { id: topUsers[0].requestedByUserId },
          select: { id: true, fullName: true },
        });
        if (user) {
          topUser = {
            userId: user.id,
            fullName: user.fullName,
            callCount: topUsers[0]._count.id,
          };
        }
      }

      return {
        totalCalls,
        totalTokens: tokenAgg._sum.tokensUsed ?? 0,
        topUser,
      };
    });
  }

  async getZ51BillingStats(dateFrom?: string, dateTo?: string) {
    const cacheKey =
      dateFrom || dateTo ? `z51-billing-stats-${dateFrom ?? ''}-${dateTo ?? ''}` : 'z51-billing-stats';
    return this.withCache(cacheKey, async () => {
      const params: string[] = [];
      const dateClauses: string[] = [];
      let idx = 1;
      if (dateFrom) {
        dateClauses.push(`AND pv.visit_date >= $${idx}::date`);
        params.push(dateFrom);
        idx++;
      }
      if (dateTo) {
        dateClauses.push(`AND pv.visit_date <= $${idx}::date`);
        params.push(dateTo);
      }
      const dateFilter = dateClauses.join(' ');
      const rows = await this.prisma.$queryRawUnsafe<
        [{
          totalZ51Visits: number;
          approvedZ51Visits: number;
          pendingZ51Visits: number;
          rejectedZ51Visits: number;
          billedZ51Visits: number;
        }]
      >(
        `
        WITH z51_visits AS (
          SELECT pv.id FROM patient_visits pv
          WHERE pv.secondary_diagnoses ILIKE '%Z51%'
          ${dateFilter}
        ),
        latest_claims AS (
          SELECT DISTINCT ON (vbc.visit_id)
            vbc.visit_id, vbc.status
          FROM visit_billing_claims vbc
          WHERE vbc.is_active = true AND vbc.visit_id IN (SELECT id FROM z51_visits)
          ORDER BY vbc.visit_id, vbc.round_number DESC
        )
        SELECT
          (SELECT COUNT(*) FROM z51_visits)::int AS "totalZ51Visits",
          COALESCE((SELECT COUNT(*) FROM latest_claims WHERE status = 'APPROVED'), 0)::int AS "approvedZ51Visits",
          COALESCE((SELECT COUNT(*) FROM latest_claims WHERE status = 'PENDING'), 0)::int AS "pendingZ51Visits",
          COALESCE((SELECT COUNT(*) FROM latest_claims WHERE status = 'REJECTED'), 0)::int AS "rejectedZ51Visits",
          (SELECT COUNT(*) FROM latest_claims)::int AS "billedZ51Visits"
        `,
        ...params,
      );
      return rows[0];
    });
  }

  async getZ51ActionableVisits(
    offset = 0,
    limit = 20,
    diagnosisCode?: string,
    dateFrom?: string,
    dateTo?: string,
    billingStatus?: string,
  ) {
    // Build dynamic WHERE conditions with parameterized values
    const params: (string | number)[] = [];
    const conditions: string[] = [];
    let idx = 1;

    // Z51 diagnosis filter (always present)
    conditions.push(`pv.secondary_diagnoses ILIKE $${idx}`);
    params.push(diagnosisCode ? `%${diagnosisCode}%` : '%Z51%');
    idx++;

    // Billing status filter (always present, optionally narrowed)
    if (billingStatus === 'none') {
      conditions.push(`lc.status IS NULL`);
    } else if (billingStatus === 'rejected') {
      conditions.push(`lc.status = 'REJECTED'`);
    } else if (billingStatus === 'pending') {
      conditions.push(`lc.status = 'PENDING'`);
    } else {
      conditions.push(`(lc.status IS NULL OR lc.status = 'REJECTED' OR lc.status = 'PENDING')`);
    }

    // Date range filters
    if (dateFrom) {
      conditions.push(`pv.visit_date >= $${idx}::date`);
      params.push(dateFrom);
      idx++;
    }
    if (dateTo) {
      conditions.push(`pv.visit_date <= $${idx}::date`);
      params.push(dateTo);
      idx++;
    }

    const whereClause = conditions.join('\n        AND ');
    const limitIdx = idx;
    const offsetIdx = idx + 1;

    const dataQuery = `
      SELECT
        pv.vn, pv.hn, pv.visit_date AS "visitDate",
        p.id AS "patientId", p.full_name AS "fullName",
        pc.case_number AS "caseNumber",
        pn.protocol_code AS "protocolCode",
        pn.name_thai AS "protocolNameThai",
        lc.status AS "billingStatus"
      FROM patient_visits pv
      LEFT JOIN patients p ON p.hn = pv.hn
      LEFT JOIN patient_cases pc ON pc.id = pv.case_id
      LEFT JOIN protocol_names pn ON pn.id = pc.protocol_id
      LEFT JOIN LATERAL (
        SELECT vbc.status
        FROM visit_billing_claims vbc
        WHERE vbc.visit_id = pv.id AND vbc.is_active = true
        ORDER BY vbc.round_number DESC
        LIMIT 1
      ) lc ON true
      WHERE ${whereClause}
      ORDER BY pv.visit_date ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM patient_visits pv
      LEFT JOIN LATERAL (
        SELECT vbc.status
        FROM visit_billing_claims vbc
        WHERE vbc.visit_id = pv.id AND vbc.is_active = true
        ORDER BY vbc.round_number DESC
        LIMIT 1
      ) lc ON true
      WHERE ${whereClause}
    `;

    const [data, countRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<
        {
          vn: string;
          hn: string;
          visitDate: Date;
          patientId: number | null;
          fullName: string | null;
          caseNumber: string | null;
          protocolCode: string | null;
          protocolNameThai: string | null;
          billingStatus: string | null;
        }[]
      >(dataQuery, ...params, limit, offset),
      this.prisma.$queryRawUnsafe<[{ total: number }]>(countQuery, ...params),
    ]);

    return { data, total: countRows[0].total };
  }

  async getRecentActivity() {
    return this.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  /** Patients who have visits but no active PatientCase — need case number assignment */
  async getPatientsWithoutCases(): Promise<
    { id: number; hn: string; fullName: string; firstTreatmentDate: string | null; visitVn: string | null }[]
  > {
    return this.withCache('patients-without-cases', async () => {
      // Find patients with NO active case
      const patients = await this.prisma.patient.findMany({
        where: {
          isActive: true,
          cases: { none: { isActive: true } },
          // Must have at least one visit
          visits: { some: {} },
        },
        select: { id: true, hn: true, fullName: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      if (patients.length === 0) return [];

      // For each patient, find earliest visit with cancer diagnosis (C*) + Z51 secondary
      const results = await Promise.all(
        patients.map(async (p) => {
          const visit = await this.prisma.patientVisit.findFirst({
            where: {
              hn: p.hn,
              primaryDiagnosis: { startsWith: 'C' },
              secondaryDiagnoses: { contains: 'Z51', mode: 'insensitive' },
            },
            orderBy: { visitDate: 'asc' },
            select: { vn: true, visitDate: true },
          });
          return {
            id: p.id,
            hn: p.hn,
            fullName: p.fullName,
            firstTreatmentDate: visit?.visitDate?.toISOString().slice(0, 10) ?? null,
            visitVn: visit?.vn ?? null,
          };
        }),
      );

      // Sort by firstTreatmentDate ASC (oldest = most urgent), nulls last
      return results.sort((a, b) => {
        if (!a.firstTreatmentDate && !b.firstTreatmentDate) return 0;
        if (!a.firstTreatmentDate) return 1;
        if (!b.firstTreatmentDate) return -1;
        return a.firstTreatmentDate.localeCompare(b.firstTreatmentDate);
      });
    });
  }

  async getNightlyScanSummary() {
    const [enabledSetting, latestScanLog] = await Promise.all([
      this.prisma.appSetting.findUnique({ where: { settingKey: 'his_nightly_scan_enabled' } }),
      this.prisma.nightlyScanLog.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          details: {
            where: { status: 'imported' },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    const enabled = enabledSetting?.settingValue === 'true';

    if (!latestScanLog) {
      return { enabled, lastScan: null, recentImports: [] };
    }

    const lastScan = {
      date: latestScanLog.scanDate,
      startedAt: latestScanLog.startedAt.toISOString(),
      finishedAt: latestScanLog.finishedAt?.toISOString() || null,
      status: latestScanLog.status,
      totalScanned: latestScanLog.totalScanned,
      newPatients: latestScanLog.newPatients,
      newVisits: latestScanLog.newVisits,
      skipped: latestScanLog.skipped,
      errors: latestScanLog.errors,
      error: latestScanLog.errorMessage || undefined,
      durationMs: latestScanLog.durationMs,
    };

    // Enrich details with patientId for linking
    const hns = latestScanLog.details.map((d) => d.hn);
    const patients = hns.length > 0
      ? await this.prisma.patient.findMany({
          where: { hn: { in: hns } },
          select: { id: true, hn: true, fullName: true },
        })
      : [];
    const hnMap = new Map(patients.map((p) => [p.hn, p]));

    const recentImports = latestScanLog.details.map((d) => {
      const patient = hnMap.get(d.hn);
      return {
        hn: d.hn,
        patientName: d.patientName || patient?.fullName || null,
        patientId: patient?.id || null,
        importedVisits: d.importedVisits,
      };
    });

    return { enabled, lastScan, recentImports };
  }

  private async withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const data = await fn();
    this.cache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL });
    return data;
  }
}
