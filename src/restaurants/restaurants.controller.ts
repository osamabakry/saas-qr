import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Restaurants')
@Controller('restaurants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new restaurant' })
  async create(
    @Body() dto: CreateRestaurantDto & { ownerPhone?: string; ownerId?: string; plan?: string },
    @CurrentUser() user: any,
  ) {
    return await this.restaurantsService.create(user.id, user.role, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all restaurants (filtered by user role)' })
  async findAll(@CurrentUser() user: any) {
    return this.restaurantsService.findAll(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.restaurantsService.findOne(id, user.id, user.role);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get restaurant by slug (public)' })
  async findBySlug(@Param('slug') slug: string) {
    return this.restaurantsService.findBySlug(slug);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update restaurant' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
    @CurrentUser() user: any,
  ) {
    return this.restaurantsService.update(id, user.id, user.role, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete restaurant' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.restaurantsService.remove(id, user.id, user.role);
  }
}
