import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRestaurantSettingsDto } from './dto/settings.dto';

@Injectable()
export class RestaurantSettingsService {
  constructor(private prisma: PrismaService) {}

  async get(restaurantId: string) {
    const settings = await this.prisma.restaurantSettings.findUnique({
      where: { restaurantId },
    });

    if (!settings) {
      // Create default settings if they don't exist
      return this.prisma.restaurantSettings.create({
        data: {
          restaurantId,
          languages: ['en'],
          defaultLanguage: 'en',
        },
      });
    }

    return settings;
  }

  async update(restaurantId: string, dto: UpdateRestaurantSettingsDto) {
    return this.prisma.restaurantSettings.upsert({
      where: { restaurantId },
      create: {
        restaurantId,
        ...dto,
      },
      update: dto,
    });
  }
}
