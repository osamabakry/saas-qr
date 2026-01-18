import { Controller, Get, Param, Query, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Public Menu')
@Controller('public/menus')
export class PublicMenuController {
  constructor(
    private readonly menusService: MenusService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get public menu (for QR codes)' })
  async getPublicMenu(
    @Param('restaurantId') restaurantId: string,
    @Query('lang') language?: string,
  ) {
    // Check subscription status
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) {
      throw new ForbiddenException('Restaurant subscription not found');
    }

    if (subscription.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'This restaurant menu is currently unavailable. Please contact the restaurant owner.',
      );
    }

    // Check if subscription period has expired
    if (
      subscription.currentPeriodEnd &&
      new Date() > subscription.currentPeriodEnd
    ) {
      throw new ForbiddenException({
        message: 'انتهت مدة الاشتراك. المنيو غير متاح حالياً.',
        code: 'SUBSCRIPTION_EXPIRED',
        expiredAt: subscription.currentPeriodEnd,
      });
    }

    return this.menusService.getPublicMenu(restaurantId, language || 'en');
  }
}
