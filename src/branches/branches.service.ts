import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        ...dto,
        restaurantId,
      },
    });
  }

  async findAll(restaurantId: string) {
    return this.prisma.branch.findMany({
      where: { restaurantId },
      include: {
        _count: {
          select: { tables: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, restaurantId },
      include: {
        tables: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, restaurantId: string, dto: UpdateBranchDto) {
    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, restaurantId: string) {
    return this.prisma.branch.delete({
      where: { id },
    });
  }
}
