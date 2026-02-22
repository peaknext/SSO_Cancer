import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryProtocolsDto } from './dto/query-protocols.dto';
import { CreateProtocolDto } from './dto/create-protocol.dto';
import { UpdateProtocolDto } from './dto/update-protocol.dto';
import { LinkRegimenDto } from './dto/link-regimen.dto';
import { UpdateProtocolRegimenDto } from './dto/update-protocol-regimen.dto';
import { LinkStageDto } from './dto/link-stage.dto';
import { Prisma } from '../../prisma';

@Injectable()
export class ProtocolsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProtocolsDto) {
    const { page = 1, limit = 25, sortBy = 'protocolCode', sortOrder = 'asc', search, cancerSiteId, protocolType, treatmentIntent, isActive } = query;
    const where: Prisma.ProtocolNameWhereInput = {};

    if (search) {
      where.OR = [
        { nameThai: { contains: search, mode: 'insensitive' } },
        { nameEnglish: { contains: search, mode: 'insensitive' } },
        { protocolCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (cancerSiteId) where.cancerSiteId = cancerSiteId;
    if (protocolType) where.protocolType = protocolType;
    if (treatmentIntent) where.treatmentIntent = treatmentIntent;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.protocolName.findMany({
        where,
        include: {
          cancerSite: { select: { id: true, siteCode: true, nameThai: true, nameEnglish: true } },
          _count: { select: { protocolRegimens: true, protocolStages: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.protocolName.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number) {
    return this.prisma.protocolName.findUnique({
      where: { id },
      include: {
        cancerSite: true,
        protocolStages: {
          include: { stage: true },
          orderBy: { stage: { sortOrder: 'asc' } },
        },
        protocolRegimens: {
          include: {
            regimen: {
              include: {
                regimenDrugs: {
                  include: {
                    drug: {
                      include: {
                        tradeNames: {
                          where: { isActive: true },
                          orderBy: { drugCode: 'asc' },
                        },
                      },
                    },
                  },
                  orderBy: { id: 'asc' },
                },
              },
            },
          },
          orderBy: [{ lineOfTherapy: 'asc' }, { isPreferred: 'desc' }],
        },
      },
    });
  }

  async create(dto: CreateProtocolDto) {
    const { stageIds, ...protocolData } = dto;

    return this.prisma.protocolName.create({
      data: {
        ...protocolData,
        protocolStages: stageIds?.length
          ? { create: stageIds.map((stageId) => ({ stageId })) }
          : undefined,
      },
      include: {
        cancerSite: true,
        protocolStages: { include: { stage: true } },
      },
    });
  }

  async update(id: number, dto: UpdateProtocolDto) {
    return this.prisma.protocolName.update({
      where: { id },
      data: dto,
    });
  }

  async deactivate(id: number) {
    return this.prisma.protocolName.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async linkRegimen(protocolId: number, dto: LinkRegimenDto) {
    return this.prisma.protocolRegimen.create({
      data: {
        protocolId,
        regimenId: dto.regimenId,
        lineOfTherapy: dto.lineOfTherapy,
        isPreferred: dto.isPreferred ?? false,
        notes: dto.notes,
      },
      include: { regimen: true },
    });
  }

  async updateProtocolRegimen(protocolId: number, regimenId: number, dto: UpdateProtocolRegimenDto) {
    return this.prisma.protocolRegimen.updateMany({
      where: { protocolId, regimenId },
      data: dto,
    });
  }

  async unlinkRegimen(protocolId: number, regimenId: number) {
    return this.prisma.protocolRegimen.deleteMany({
      where: { protocolId, regimenId },
    });
  }

  async linkStage(protocolId: number, dto: LinkStageDto) {
    return this.prisma.protocolStage.create({
      data: {
        protocolId,
        stageId: dto.stageId,
        notes: dto.notes,
      },
      include: { stage: true },
    });
  }

  async unlinkStage(protocolId: number, stageId: number) {
    return this.prisma.protocolStage.deleteMany({
      where: { protocolId, stageId },
    });
  }
}
