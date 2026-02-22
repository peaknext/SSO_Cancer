import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryDrugTradeNamesDto } from './dto/query-drug-trade-names.dto';
import { CreateDrugTradeNameDto } from './dto/create-drug-trade-name.dto';
import { UpdateDrugTradeNameDto } from './dto/update-drug-trade-name.dto';
import { Prisma } from '../../prisma';

@Injectable()
export class DrugTradeNamesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryDrugTradeNamesDto) {
    const { page = 1, limit = 25, sortBy = 'drugCode', sortOrder = 'asc', search, drugId, hasPrice, isActive } = query;
    const where: Prisma.DrugTradeNameWhereInput = {};

    if (search) {
      where.OR = [
        { drugCode: { contains: search, mode: 'insensitive' } },
        { tradeName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (drugId) where.drugId = drugId;
    if (hasPrice === true) where.unitPrice = { not: null };
    if (hasPrice === false) where.unitPrice = null;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.drugTradeName.findMany({
        where,
        include: { drug: { select: { id: true, genericName: true, drugCategory: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.drugTradeName.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number) {
    return this.prisma.drugTradeName.findUnique({
      where: { id },
      include: { drug: true },
    });
  }

  async create(dto: CreateDrugTradeNameDto) {
    return this.prisma.drugTradeName.create({
      data: dto,
      include: { drug: true },
    });
  }

  async update(id: number, dto: UpdateDrugTradeNameDto) {
    return this.prisma.drugTradeName.update({
      where: { id },
      data: dto,
      include: { drug: true },
    });
  }

  async deactivate(id: number) {
    return this.prisma.drugTradeName.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
