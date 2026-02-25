import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma';
import { QueryHospitalsDto } from './dto/query-hospitals.dto';

@Injectable()
export class HospitalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryHospitalsDto) {
    const { page = 1, limit = 25, sortBy = 'nameThai', sortOrder = 'asc', search, province } = query;

    const where: Prisma.HospitalWhereInput = { isActive: true };

    if (search) {
      where.OR = [
        { nameThai: { contains: search, mode: 'insensitive' } },
        { hcode5: { contains: search, mode: 'insensitive' } },
        { hcode9: { contains: search, mode: 'insensitive' } },
        { province: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (province) {
      where.province = province;
    }

    const orderBy: Prisma.HospitalOrderByWithRelationInput = { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.hospital.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          hcode9: true,
          hcode5: true,
          nameThai: true,
          hospitalLevel: true,
          province: true,
          district: true,
        },
      }),
      this.prisma.hospital.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number) {
    return this.prisma.hospital.findUnique({
      where: { id },
    });
  }
}
