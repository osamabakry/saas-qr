import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
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

    // Get subscription
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      include: {
        restaurant: true,
      },
    });

    if (!subscription) {
      throw new ForbiddenException('Subscription not found');
    }

    // Check if subscription is active
    if (subscription.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Subscription is not active. Please renew your subscription to access this feature.',
      );
    }

    // Check if subscription period has expired
    if (
      subscription.currentPeriodEnd &&
      new Date() > subscription.currentPeriodEnd
    ) {
      throw new ForbiddenException({
        message: 'انتهت مدة الاشتراك. يرجى تجديد الاشتراك للوصول إلى لوحة التحكم.',
        code: 'SUBSCRIPTION_EXPIRED',
        expiredAt: subscription.currentPeriodEnd,
      });
    }

    // Attach subscription to request
    request.subscription = subscription;
    return true;
  }
}
