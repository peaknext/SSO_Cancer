import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryCancerSitesDto } from './dto/query-cancer-sites.dto';
import { CreateCancerSiteDto } from './dto/create-cancer-site.dto';
import { UpdateCancerSiteDto } from './dto/update-cancer-site.dto';
import { Prisma } from '../../prisma';

@Injectable()
export class CancerSitesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryCancerSitesDto) {
    const { page = 1, limit = 25, sortBy = 'sortOrder', sortOrder = 'asc', search, isActive } = query;
    const where: Prisma.CancerSiteWhereInput = {};

    if (search) {
      where.OR = [
        { nameThai: { contains: search, mode: 'insensitive' } },
        { nameEnglish: { contains: search, mode: 'insensitive' } },
        { siteCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.cancerSite.findMany({
        where,
        include: {
          _count: { select: { protocols: true, siteStages: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cancerSite.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number) {
    return this.prisma.cancerSite.findUnique({
      where: { id },
      include: {
        siteStages: { include: { stage: true } },
        _count: { select: { protocols: true } },
      },
    });
  }

  async getProtocols(id: number) {
    return this.prisma.protocolName.findMany({
      where: { cancerSiteId: id },
      include: {
        _count: { select: { protocolRegimens: true, protocolStages: true } },
      },
      orderBy: { protocolCode: 'asc' },
    });
  }

  async getStages(id: number) {
    const siteStages = await this.prisma.cancerSiteStage.findMany({
      where: { cancerSiteId: id },
      include: { stage: true },
      orderBy: { stage: { sortOrder: 'asc' } },
    });
    return siteStages.map((ss) => ss.stage);
  }

  async create(dto: CreateCancerSiteDto) {
    return this.prisma.cancerSite.create({ data: dto });
  }

  async update(id: number, dto: UpdateCancerSiteDto) {
    return this.prisma.cancerSite.update({
      where: { id },
      data: dto,
    });
  }
}
