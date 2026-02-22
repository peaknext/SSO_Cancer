import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryDrugsDto } from './dto/query-drugs.dto';
import { CreateDrugDto } from './dto/create-drug.dto';
import { UpdateDrugDto } from './dto/update-drug.dto';
import { Prisma } from '../../prisma';

@Injectable()
export class DrugsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryDrugsDto) {
    const { page = 1, limit = 25, sortBy = 'genericName', sortOrder = 'asc', search, drugCategory, isActive } = query;
    const where: Prisma.DrugWhereInput = {};

    if (search) {
      where.genericName = { contains: search, mode: 'insensitive' };
    }
    if (drugCategory) where.drugCategory = drugCategory;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.drug.findMany({
        where,
        include: {
          _count: { select: { tradeNames: true, regimenDrugs: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.drug.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number) {
    return this.prisma.drug.findUnique({
      where: { id },
      include: {
        tradeNames: { orderBy: { drugCode: 'asc' } },
        regimenDrugs: {
          include: {
            regimen: {
              include: {
                protocolRegimens: {
                  include: { protocol: { include: { cancerSite: true } } },
                },
              },
            },
          },
        },
      },
    });
  }

  async create(dto: CreateDrugDto) {
    return this.prisma.drug.create({ data: dto });
  }

  async update(id: number, dto: UpdateDrugDto) {
    return this.prisma.drug.update({ where: { id }, data: dto });
  }

  async deactivate(id: number) {
    return this.prisma.drug.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
