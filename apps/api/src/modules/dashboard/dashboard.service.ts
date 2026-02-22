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

  async getTopDrugsByVisits() {
    return this.withCache('top-drugs-by-visits', async () => {
      const grouped = await this.prisma.visitMedication.groupBy({
        by: ['resolvedDrugId'],
        _count: { id: true },
        where: { resolvedDrugId: { not: null } },
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

  async getRecentActivity() {
    return this.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
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
