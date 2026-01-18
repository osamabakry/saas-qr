import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@ApiTags('Subscriptions')
@Controller('restaurants/:restaurantId/subscriptions')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get subscription for restaurant' })
  async getSubscription(@Param('restaurantId') restaurantId: string) {
    return this.subscriptionsService.getSubscription(restaurantId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  async createCheckoutSession(
    @Param('restaurantId') restaurantId: string,
    @Body('plan') plan: string,
  ) {
    return this.subscriptionsService.createCheckoutSession(restaurantId, plan);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@Param('restaurantId') restaurantId: string) {
    return this.subscriptionsService.cancelSubscription(restaurantId);
  }
}
