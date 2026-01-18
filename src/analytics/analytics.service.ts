import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getRestaurantAnalytics(restaurantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { restaurantId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const analytics = await this.prisma.menuAnalytics.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 30, // Last 30 days
    });

    // Aggregate totals
    const totals = analytics.reduce(
      (acc, curr) => ({
        totalViews: acc.totalViews + curr.views,
        totalUniqueViews: acc.totalUniqueViews + curr.uniqueViews,
        totalQrScans: acc.totalQrScans + curr.qrScans,
      }),
      { totalViews: 0, totalUniqueViews: 0, totalQrScans: 0 },
    );

    // Get popular items
    const itemViewsMap = new Map<string, number>();
    analytics.forEach((a) => {
      if (a.itemViews) {
        Object.entries(a.itemViews as Record<string, number>).forEach(([itemId, views]) => {
          itemViewsMap.set(itemId, (itemViewsMap.get(itemId) || 0) + views);
        });
      }
    });

    const popularItems = Array.from(itemViewsMap.entries())
      .map(([itemId, views]) => ({ itemId, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Get QR scan stats
    const qrScans = await this.prisma.qrScan.findMany({
      where: {
        restaurantId,
        scannedAt: {
          gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: endDate || new Date(),
        },
      },
      include: {
        qrCode: {
          include: {
            table: true,
          },
        },
      },
    });

    return {
      totals,
      dailyAnalytics: analytics,
      popularItems,
      qrScans: qrScans.length,
      qrScansByCode: this.groupScansByCode(qrScans),
    };
  }

  async recordMenuView(restaurantId: string, itemId?: string, categoryId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get or create today's analytics
    let analytics = await this.prisma.menuAnalytics.findUnique({
      where: {
        restaurantId_date: {
          restaurantId,
          date: today,
        },
      },
    });

    if (!analytics) {
      analytics = await this.prisma.menuAnalytics.create({
        data: {
          restaurantId,
          date: today,
          views: 1,
          uniqueViews: 1,
        },
      });
    } else {
      analytics = await this.prisma.menuAnalytics.update({
        where: { id: analytics.id },
        data: {
          views: { increment: 1 },
        },
      });
    }

    // Update item/category views
    if (itemId || categoryId) {
      const itemViews = (analytics.itemViews as Record<string, number>) || {};
      const categoryViews = (analytics.categoryViews as Record<string, number>) || {};

      if (itemId) {
        itemViews[itemId] = (itemViews[itemId] || 0) + 1;
      }
      if (categoryId) {
        categoryViews[categoryId] = (categoryViews[categoryId] || 0) + 1;
      }

      await this.prisma.menuAnalytics.update({
        where: { id: analytics.id },
        data: {
          itemViews,
          categoryViews,
        },
      });
    }

    return analytics;
  }

  private groupScansByCode(scans: any[]) {
    const grouped = new Map<string, number>();
    scans.forEach((scan) => {
      const code = scan.qrCode?.code || 'unknown';
      grouped.set(code, (grouped.get(code) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([code, count]) => ({ code, count }));
  }
}
