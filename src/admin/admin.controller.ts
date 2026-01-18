import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics (Super Admin only)' })
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions (Super Admin only)' })
  async getAllSubscriptions() {
    return this.adminService.getAllSubscriptions();
  }

  @Patch('subscriptions/:restaurantId')
  @ApiOperation({ summary: 'Update subscription (Super Admin only)' })
  async updateSubscription(
    @Param('restaurantId') restaurantId: string,
    @Body() body: { plan?: string; status?: string },
  ) {
    return this.adminService.updateSubscription(
      restaurantId,
      body.plan,
      body.status,
    );
  }

  @Patch('subscriptions/:restaurantId/cancel')
  @ApiOperation({ summary: 'Cancel subscription immediately (Super Admin only)' })
  async cancelSubscription(@Param('restaurantId') restaurantId: string) {
    return this.adminService.cancelSubscription(restaurantId);
  }

  @Patch('subscriptions/:restaurantId/renew')
  @ApiOperation({ summary: 'Renew subscription (Super Admin only)' })
  async renewSubscription(
    @Param('restaurantId') restaurantId: string,
    @Body() body: { duration?: number; plan?: string },
  ) {
    return this.adminService.renewSubscription(
      restaurantId,
      body.duration || 1,
      body.plan,
    );
  }

  @Get('restaurants/:restaurantId')
  @ApiOperation({ summary: 'Get restaurant details (Super Admin only)' })
  async getRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.adminService.getRestaurantDetails(restaurantId);
  }
}
