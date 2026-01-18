import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu.dto';

@Injectable()
export class MenusService {
  constructor(private prisma: PrismaService) { }

  // Categories
  async createCategory(restaurantId: string, dto: CreateCategoryDto) {
    // Get max display order
    const maxOrder = await this.prisma.category.findFirst({
      where: { restaurantId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    return this.prisma.category.create({
      data: {
        ...dto,
        restaurantId,
        displayOrder: (maxOrder?.displayOrder || 0) + 1,
      },
    });
  }

  async getCategories(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId, isActive: true },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getCategory(id: string, restaurantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, restaurantId },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async updateCategory(id: string, restaurantId: string, dto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string, restaurantId: string) {
    return this.prisma.category.delete({
      where: { id },
    });
  }

  // Menu Items
  async createMenuItem(restaurantId: string, dto: CreateMenuItemDto) {
    // Verify category belongs to restaurant
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, restaurantId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Get max display order in category
    const maxOrder = await this.prisma.menuItem.findFirst({
      where: { categoryId: dto.categoryId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    return this.prisma.menuItem.create({
      data: {
        ...dto,
        restaurantId,
        displayOrder: (maxOrder?.displayOrder || 0) + 1,
      },
    });
  }

  async getMenuItems(restaurantId: string, categoryId?: string) {
    const where: any = { restaurantId, isAvailable: true };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    return this.prisma.menuItem.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameTranslations: true,
          },
        },
      },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
      ],
    });
  }

  async getMenuItem(id: string, restaurantId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId },
      include: {
        category: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    return item;
  }

  async updateMenuItem(id: string, restaurantId: string, dto: UpdateMenuItemDto) {
    return this.prisma.menuItem.update({
      where: { id },
      data: dto,
    });
  }

  async deleteMenuItem(id: string, restaurantId: string) {
    return this.prisma.menuItem.delete({
      where: { id },
    });
  }

  // Public menu (for QR codes)
  async getPublicMenu(restaurantId: string, language: string = 'en') {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        settings: true,
        categories: {
          where: { isActive: true },
          include: {
            items: {
              where: { isAvailable: true },
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!restaurant || !restaurant.isActive) {
      throw new NotFoundException('Restaurant not found');
    }

    // Apply language translations if available
    const categories = restaurant.categories.map((category) => ({
      ...category,
      name:
        category.nameTranslations?.[language] || category.name,
      description: category.description || undefined,
      items: category.items.map((item) => ({
        ...item,
        name: item.nameTranslations?.[language] || item.name,
        description:
          item.descriptionTranslations?.[language] ||
          item.description ||
          undefined,
      })),
    }));

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        logo: restaurant.settings?.customLogo || restaurant.logo,
        coverImage: restaurant.coverImage,
        currency: restaurant.currency,
        taxRate: restaurant.taxRate,
      },
      settings: restaurant.settings,
      categories,
      currentLanguage: language,
      availableLanguages: restaurant.settings?.languages || ['en'],
    };
  }
}
