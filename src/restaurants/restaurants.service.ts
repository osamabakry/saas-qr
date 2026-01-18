import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurant.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) { }

  async create(userId: string, userRole: string, dto: CreateRestaurantDto & { ownerPhone?: string; plan?: string }) {
    try {
      // Generate slug from name
      const slug = await this.generateUniqueSlug(dto.name);

      let restaurantOwnerId = userId;

      // If super admin is creating for another user, find or create user by phone
      if (userRole === 'SUPER_ADMIN' && dto.ownerPhone) {
        if (!dto.ownerPhone || dto.ownerPhone.trim() === '') {
          throw new BadRequestException('Owner phone number is required');
        }

        let owner = await this.prisma.user.findUnique({
          where: { phone: dto.ownerPhone },
        });

        // Auto-create user if doesn't exist
        if (!owner) {
          // Generate default password (can be changed later)
          const defaultPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          const passwordHash = await bcrypt.hash(defaultPassword, 10);

          try {
            owner = await this.prisma.user.create({
              data: {
                phone: dto.ownerPhone,
                passwordHash,
                firstName: dto.ownerFirstName,
                lastName: dto.ownerLastName,
                role: 'RESTAURANT_OWNER',
                requiresPasswordChange: true,
              },
            });
          } catch (createError: any) {
            if (createError.code === 'P2002') {
              throw new ConflictException(`User with phone number ${dto.ownerPhone} already exists`);
            }
            throw new BadRequestException(`Failed to create user: ${createError.message}`);
          }
        }

        restaurantOwnerId = owner.id;
      } else if (userRole === 'SUPER_ADMIN' && dto.ownerId) {
        restaurantOwnerId = dto.ownerId;
      }

      // Calculate subscription period based on duration
      const subscriptionDuration = dto.subscriptionDuration || 1; // Default 1 month
      const now = new Date();
      const periodStart = new Date(now);
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + subscriptionDuration);

      // Create restaurant with subscription
      const restaurant = await this.prisma.restaurant.create({
        data: {
          name: dto.name,
          description: dto.description,
          phone: dto.phone,
          email: dto.email,
          website: dto.website,
          address: dto.address,
          city: dto.city,
          country: dto.country,
          currency: dto.currency || 'EGP',
          taxRate: dto.taxRate || 0,
          slug,
          ownerId: restaurantOwnerId,
          subscription: {
            create: {
              plan: (dto.plan as any) || 'PRO',
              status: 'ACTIVE',
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            },
          },
          settings: {
            create: {
              languages: ['ar', 'en'],
              defaultLanguage: 'ar',
            },
          },
        },
        include: {
          subscription: true,
          settings: true,
          owner: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return restaurant;
    } catch (error: any) {
      console.error('Error in restaurant create:', error);

      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`A restaurant with this ${field} already exists`);
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid owner reference');
      }

      // Re-throw if it's already a NestJS exception
      if (error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException) {
        throw error;
      }

      // Otherwise, wrap in a generic error
      throw new BadRequestException(error.message || 'Failed to create restaurant');
    }
  }

  async findAll(userId: string, userRole: string) {
    if (userRole === 'SUPER_ADMIN') {
      return this.prisma.restaurant.findMany({
        include: {
          subscription: true,
          owner: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              branches: true,
              categories: true,
              menus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.restaurant.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            staffRoles: {
              some: { userId },
            },
          },
        ],
      },
      include: {
        subscription: true,
        _count: {
          select: {
            branches: true,
            categories: true,
            menus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, userRole: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        subscription: true,
        settings: true,
        owner: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        branches: true,
        _count: {
          select: {
            categories: true,
            menus: true,
            tables: true,
            qrCodes: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Check access
    if (userRole !== 'SUPER_ADMIN' && restaurant.ownerId !== userId) {
      const hasStaffAccess = await this.prisma.staffRole.findUnique({
        where: {
          restaurantId_userId: {
            restaurantId: id,
            userId,
          },
        },
      });

      if (!hasStaffAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    return restaurant;
  }

  async findBySlug(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      include: {
        settings: true,
        subscription: true,
      },
    });

    if (!restaurant || !restaurant.isActive) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async update(id: string, userId: string, userRole: string, dto: UpdateRestaurantDto) {
    await this.verifyAccess(id, userId, userRole);

    const { primaryColor, ...restDto } = dto;

    if (restDto.name) {
      restDto.slug = await this.generateUniqueSlug(restDto.name);
    }

    const updateData: any = { ...restDto };

    if (primaryColor) {
      updateData.settings = {
        upsert: {
          create: { primaryColor },
          update: { primaryColor },
        },
      };
    }

    return this.prisma.restaurant.update({
      where: { id },
      data: updateData,
      include: {
        subscription: true,
        settings: true,
      },
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    await this.verifyAccess(id, userId, userRole);

    return this.prisma.restaurant.delete({
      where: { id },
    });
  }

  private async verifyAccess(restaurantId: string, userId: string, userRole: string) {
    if (userRole === 'SUPER_ADMIN') {
      return;
    }

    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
    });

    if (!restaurant) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug exists
    const existing = await this.prisma.restaurant.findUnique({
      where: { slug: baseSlug },
    });

    if (!existing) {
      return baseSlug;
    }

    // Append random suffix
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    return `${baseSlug}-${uniqueSuffix}`;
  }
}
