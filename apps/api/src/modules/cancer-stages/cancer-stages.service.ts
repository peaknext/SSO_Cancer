import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryCancerStagesDto } from './dto/query-cancer-stages.dto';
import { CreateCancerStageDto } from './dto/create-cancer-stage.dto';
import { UpdateCancerStageDto } from './dto/update-cancer-stage.dto';
import { Prisma } from '../../prisma';

@Injectable()
export class CancerStagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryCancerStagesDto) {
    const { page = 1, limit = 25, sortBy = 'sortOrder', sortOrder = 'asc', search, stageGroup, isActive } = query;
    const where: Prisma.CancerStageWhereInput = {};

    if (search) {
      where.OR = [
        { nameThai: { contains: search, mode: 'insensitive' } },
        { nameEnglish: { contains: search, mode: 'insensitive' } },
        { stageCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (stageGroup) where.stageGroup = stageGroup;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.cancerStage.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cancerStage.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number) {
    return this.prisma.cancerStage.findUnique({
      where: { id },
      include: {
        siteStages: { include: { cancerSite: true } },
        protocolStages: { include: { protocol: true } },
      },
    });
  }

  async create(dto: CreateCancerStageDto) {
    return this.prisma.cancerStage.create({ data: dto });
  }

  async update(id: number, dto: UpdateCancerStageDto) {
    return this.prisma.cancerStage.update({ where: { id }, data: dto });
  }
}
