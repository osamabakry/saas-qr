import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RestaurantSettingsService } from './restaurant-settings.service';
import { UpdateRestaurantSettingsDto } from './dto/settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@ApiTags('Restaurant Settings')
@Controller('restaurants/:restaurantId/settings')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class RestaurantSettingsController {
  constructor(
    private readonly settingsService: RestaurantSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get restaurant settings' })
  async get(@Param('restaurantId') restaurantId: string) {
    return this.settingsService.get(restaurantId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update restaurant settings' })
  async update(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: UpdateRestaurantSettingsDto,
  ) {
    return this.settingsService.update(restaurantId, dto);
  }
}
