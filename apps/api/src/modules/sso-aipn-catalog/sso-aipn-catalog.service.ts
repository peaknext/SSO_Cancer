import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma';
import { QuerySsoAipnDto } from './dto/query-sso-aipn.dto';

@Injectable()
export class SsoAipnCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QuerySsoAipnDto) {
    const {
      page = 1,
      limit = 25,
      sortBy = 'code',
      sortOrder = 'asc',
      search,
      billingGroup,
      minPrice,
      maxPrice,
    } = query;

    const where: Prisma.SsoAipnItemWhereInput = {};

    if (search) {
      const asNum = parseInt(search, 10);
      if (!isNaN(asNum)) {
        where.OR = [
          { code: asNum },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      } else {
        where.description = { contains: search, mode: 'insensitive' };
      }
    }

    if (billingGroup) {
      where.billingGroup = billingGroup;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.rate = {};
      if (minPrice !== undefined) where.rate.gte = minPrice;
      if (maxPrice !== undefined) where.rate.lte = maxPrice;
    }

    const [data, total] = await Promise.all([
      this.prisma.ssoAipnItem.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ssoAipnItem.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findByCode(code: number) {
    return this.prisma.ssoAipnItem.findUnique({ where: { code } });
  }

  async findById(id: number) {
    return this.prisma.ssoAipnItem.findUnique({ where: { id } });
  }

  async getStats() {
    const [total, drugCount, equipmentCount, priceAgg] = await Promise.all([
      this.prisma.ssoAipnItem.count(),
      this.prisma.ssoAipnItem.count({ where: { billingGroup: '03' } }),
      this.prisma.ssoAipnItem.count({
        where: { billingGroup: { not: '03' } },
      }),
      this.prisma.ssoAipnItem.aggregate({
        _avg: { rate: true },
        _max: { rate: true },
        _min: { rate: true },
      }),
    ]);
    return { total, drugCount, equipmentCount, priceStats: priceAgg };
  }
}
