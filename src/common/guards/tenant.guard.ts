import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get restaurant ID from query, params, or body
    const restaurantId = 
      request.params?.restaurantId || 
      request.query?.restaurantId || 
      request.body?.restaurantId;

    if (!restaurantId) {
      throw new ForbiddenException('Restaurant ID is required');
    }

    // Verify user has access to this restaurant
    const hasAccess = await this.checkRestaurantAccess(user.id, restaurantId, user.role);
    
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this restaurant');
    }

    // Attach restaurant to request
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new ForbiddenException('Restaurant not found');
    }

    request.tenant = restaurant;
    return true;
  }

  private async checkRestaurantAccess(
    userId: string,
    restaurantId: string,
    userRole: string,
  ): Promise<boolean> {
    // Super admin has access to all restaurants
    if (userRole === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user is owner
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: userId,
      },
    });

    if (restaurant) {
      return true;
    }

    // Check if user has staff role
    const staffRole = await this.prisma.staffRole.findUnique({
      where: {
        restaurantId_userId: {
          restaurantId,
          userId,
        },
      },
    });

    return !!staffRole;
  }
}
