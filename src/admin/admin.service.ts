import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getPlatformStats() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalRestaurants,
      totalUsers,
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      pastDueSubscriptions,
      totalQrCodes,
      totalScans,
      totalMenuItems,
      totalCategories,
      totalBranches,
      newRestaurants24h,
      newRestaurants7d,
      newRestaurants30d,
      newUsers24h,
      newUsers7d,
      newUsers30d,
      scans24h,
      scans7d,
      scans30d,
    ] = await Promise.all([
      this.prisma.restaurant.count(),
      this.prisma.user.count(),
      this.prisma.subscription.count(),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.subscription.count({
        where: { status: 'CANCELLED' },
      }),
      this.prisma.subscription.count({
        where: { status: 'PAST_DUE' },
      }),
      this.prisma.qrCode.count(),
      this.prisma.qrScan.count(),
      this.prisma.menuItem.count(),
      this.prisma.category.count(),
      this.prisma.branch.count(),
      this.prisma.restaurant.count({
        where: { createdAt: { gte: last24Hours } },
      }),
      this.prisma.restaurant.count({
        where: { createdAt: { gte: last7Days } },
      }),
      this.prisma.restaurant.count({
        where: { createdAt: { gte: last30Days } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: last24Hours } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: last7Days } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: last30Days } },
      }),
      this.prisma.qrScan.count({
        where: { scannedAt: { gte: last24Hours } },
      }),
      this.prisma.qrScan.count({
        where: { scannedAt: { gte: last7Days } },
      }),
      this.prisma.qrScan.count({
        where: { scannedAt: { gte: last30Days } },
      }),
    ]);

    // Get subscription breakdown
    const subscriptionBreakdown = await this.prisma.subscription.groupBy({
      by: ['plan'],
      _count: true,
    });

    // Get subscription status breakdown
    const subscriptionStatusBreakdown = await this.prisma.subscription.groupBy({
      by: ['status'],
      _count: true,
    });

    // Get top restaurants by scans
    const topRestaurantsByScans = await this.prisma.restaurant.findMany({
      take: 10,
      orderBy: {
        qrCodes: {
          _count: 'desc',
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        subscription: true,
        _count: {
          select: {
            qrCodes: true,
            menuItems: true,
            categories: true,
            branches: true,
          },
        },
      },
    });

    // Get recent restaurants
    const recentRestaurants = await this.prisma.restaurant.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        subscription: true,
        _count: {
          select: {
            qrCodes: true,
            menuItems: true,
            categories: true,
            branches: true,
          },
        },
      },
    });

    // Get restaurants with most menu items
    const restaurantsWithMostItems = await this.prisma.restaurant.findMany({
      take: 10,
      orderBy: {
        menuItems: {
          _count: 'desc',
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        subscription: true,
        _count: {
          select: {
            menuItems: true,
            categories: true,
            qrCodes: true,
          },
        },
      },
    });

    // Calculate growth rates
    const restaurantGrowth7d = newRestaurants7d > 0 
      ? ((newRestaurants24h / newRestaurants7d) * 100).toFixed(1)
      : '0';
    const userGrowth7d = newUsers7d > 0
      ? ((newUsers24h / newUsers7d) * 100).toFixed(1)
      : '0';
    const scanGrowth7d = scans7d > 0
      ? ((scans24h / scans7d) * 100).toFixed(1)
      : '0';

    return {
      stats: {
        totalRestaurants,
        totalUsers,
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        pastDueSubscriptions,
        totalQrCodes,
        totalScans,
        totalMenuItems,
        totalCategories,
        totalBranches,
      },
      growth: {
        restaurants: {
          last24h: newRestaurants24h,
          last7d: newRestaurants7d,
          last30d: newRestaurants30d,
          growthRate7d: restaurantGrowth7d,
        },
        users: {
          last24h: newUsers24h,
          last7d: newUsers7d,
          last30d: newUsers30d,
          growthRate7d: userGrowth7d,
        },
        scans: {
          last24h: scans24h,
          last7d: scans7d,
          last30d: scans30d,
          growthRate7d: scanGrowth7d,
        },
      },
      subscriptionBreakdown: subscriptionBreakdown.map((s) => ({
        plan: s.plan,
        count: s._count,
      })),
      subscriptionStatusBreakdown: subscriptionStatusBreakdown.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      topRestaurantsByScans,
      recentRestaurants,
      restaurantsWithMostItems,
    };
  }

  async getAllSubscriptions() {
    return this.prisma.subscription.findMany({
      include: {
        restaurant: {
          include: {
            owner: {
              select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSubscription(restaurantId: string, plan?: string, status?: string) {
    const updateData: any = {};
    if (plan) updateData.plan = plan as any;
    if (status) updateData.status = status as any;

    return this.prisma.subscription.update({
      where: { restaurantId },
      data: updateData,
      include: {
        restaurant: {
          include: {
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
                qrCodes: true,
                menuItems: true,
                categories: true,
                branches: true,
              },
            },
          },
        },
      },
    });
  }

  async cancelSubscription(restaurantId: string) {
    // Cancel subscription immediately by setting status to CANCELLED and expired period
    const now = new Date();
    return this.prisma.subscription.update({
      where: { restaurantId },
      data: {
        status: 'CANCELLED',
        currentPeriodEnd: now, // Set to now to immediately expire
      },
      include: {
        restaurant: true,
      },
    });
  }

  async renewSubscription(
    restaurantId: string,
    duration: number,
    plan?: string,
  ) {
    const now = new Date();
    const periodStart = new Date(now);
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + duration);

    const updateData: any = {
      status: 'ACTIVE',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    };

    if (plan) {
      updateData.plan = plan as any;
    }

    return this.prisma.subscription.update({
      where: { restaurantId },
      data: updateData,
      include: {
        restaurant: {
          include: {
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
                qrCodes: true,
                menuItems: true,
                categories: true,
                branches: true,
              },
            },
          },
        },
      },
    });
  }

  async getRestaurantDetails(restaurantId: string) {
    return this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        owner: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        subscription: true,
        _count: {
          select: {
            qrCodes: true,
            menuItems: true,
            categories: true,
            branches: true,
          },
        },
      },
    });
  }
}
