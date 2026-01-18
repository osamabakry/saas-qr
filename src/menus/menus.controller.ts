import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from './dto/menu.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { Tenant } from '../common/decorators/tenant.decorator';

@ApiTags('Menus')
@Controller('restaurants/:restaurantId/menus')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
@ApiBearerAuth()
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  // Categories
  @Post('categories')
  @ApiOperation({ summary: 'Create a category' })
  async createCategory(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.menusService.createCategory(restaurantId, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  async getCategories(@Param('restaurantId') restaurantId: string) {
    return this.menusService.getCategories(restaurantId);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category with items' })
  async getCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.menusService.getCategory(id, restaurantId);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.menusService.updateCategory(id, restaurantId, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.menusService.deleteCategory(id, restaurantId);
  }

  // Menu Items
  @Post('items')
  @ApiOperation({ summary: 'Create a menu item' })
  async createMenuItem(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.menusService.createMenuItem(restaurantId, dto);
  }

  @Get('items')
  @ApiOperation({ summary: 'Get all menu items' })
  async getMenuItems(
    @Param('restaurantId') restaurantId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.menusService.getMenuItems(restaurantId, categoryId);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get menu item' })
  async getMenuItem(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.menusService.getMenuItem(id, restaurantId);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update menu item' })
  async updateMenuItem(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menusService.updateMenuItem(id, restaurantId, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete menu item' })
  async deleteMenuItem(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.menusService.deleteMenuItem(id, restaurantId);
  }
}
