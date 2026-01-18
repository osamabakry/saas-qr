import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { PublicMenuController } from './public-menu.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MenusController, PublicMenuController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
