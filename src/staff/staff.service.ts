import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffRoleDto, UpdateStaffRoleDto } from './dto/staff.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: CreateStaffRoleDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.staffRole.create({
      data: {
        restaurantId,
        userId: user.id,
        role: dto.role as UserRole,
        permissions: dto.permissions,
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(restaurantId: string) {
    return this.prisma.staffRole.findMany({
      where: { restaurantId },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const staffRole = await this.prisma.staffRole.findFirst({
      where: { id, restaurantId },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!staffRole) {
      throw new NotFoundException('Staff role not found');
    }

    return staffRole;
  }

  async update(id: string, restaurantId: string, dto: UpdateStaffRoleDto) {
    return this.prisma.staffRole.update({
      where: { id },
      data: {
        role: dto.role as UserRole,
        permissions: dto.permissions,
      },
    });
  }

  async remove(id: string, restaurantId: string) {
    return this.prisma.staffRole.delete({
      where: { id },
    });
  }
}
