import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QrCodesService } from './qr-codes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Query } from '@nestjs/common';

@ApiTags('QR Codes')
@Controller('restaurants/:restaurantId/qr-codes')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Post()
  @ApiOperation({ summary: 'Generate QR code for restaurant or table' })
  async generateQrCode(
    @Param('restaurantId') restaurantId: string,
    @Query('tableId') tableId?: string,
  ) {
    return this.qrCodesService.generateQrCode(restaurantId, tableId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all QR codes for restaurant' })
  async getQrCodes(@Param('restaurantId') restaurantId: string) {
    return this.qrCodesService.getQrCodes(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get QR code by ID' })
  async getQrCode(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.qrCodesService.getQrCode(id, restaurantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete QR code' })
  async deleteQrCode(
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.qrCodesService.deleteQrCode(id, restaurantId);
  }
}
