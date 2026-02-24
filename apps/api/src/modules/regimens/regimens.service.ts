import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryRegimensDto } from './dto/query-regimens.dto';
import { CreateRegimenDto } from './dto/create-regimen.dto';
import { UpdateRegimenDto } from './dto/update-regimen.dto';
import { AddRegimenDrugDto } from './dto/add-regimen-drug.dto';
import { UpdateRegimenDrugDto } from './dto/update-regimen-drug.dto';
import { Prisma } from '../../prisma';

@Injectable()
export class RegimensService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryRegimensDto) {
    const { page = 1, limit = 25, sortBy = 'regimenCode', sortOrder = 'asc', search, regimenType, isActive } = query;
    const where: Prisma.RegimenWhereInput = {};

    if (search) {
      where.OR = [
        { regimenCode: { contains: search, mode: 'insensitive' } },
        { regimenName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (regimenType) where.regimenType = regimenType;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.regimen.findMany({
        where,
        include: {
          _count: { select: { regimenDrugs: true, protocolRegimens: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.regimen.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number) {
    return this.prisma.regimen.findUnique({
      where: { id },
      include: {
        regimenDrugs: {
          include: { drug: { include: { tradeNames: { where: { isActive: true } } } } },
          orderBy: { id: 'asc' },
        },
        protocolRegimens: {
          include: { protocol: { include: { cancerSite: true } } },
          orderBy: { lineOfTherapy: 'asc' },
        },
      },
    });
  }

  async create(dto: CreateRegimenDto) {
    const { drugs, ...regimenData } = dto;

    return this.prisma.regimen.create({
      data: {
        ...regimenData,
        regimenDrugs: drugs?.length
          ? {
              create: drugs.map((drug) => ({
                drugId: drug.drugId,
                dosePerCycle: drug.dosePerCycle,
                route: drug.route,
                daySchedule: drug.daySchedule,
                isOptional: drug.isOptional ?? false,
                notes: drug.notes,
              })),
            }
          : undefined,
      },
      include: {
        regimenDrugs: {
          include: { drug: true },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  async update(id: number, dto: UpdateRegimenDto) {
    return this.prisma.regimen.update({ where: { id }, data: dto });
  }

  async addDrug(regimenId: number, dto: AddRegimenDrugDto) {
    return this.prisma.regimenDrug.create({
      data: { regimenId, ...dto },
      include: { drug: true },
    });
  }

  async updateDrug(regimenId: number, drugId: number, dto: UpdateRegimenDrugDto) {
    return this.prisma.regimenDrug.updateMany({
      where: { regimenId, drugId },
      data: dto,
    });
  }

  async removeDrug(regimenId: number, drugId: number) {
    return this.prisma.regimenDrug.deleteMany({
      where: { regimenId, drugId },
    });
  }
}
