import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QrCodesService } from './qr-codes.service';
import { Request } from 'express';

@ApiTags('Public QR')
@Controller('public/qr-codes')
export class PublicQrController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Get(':code')
  @ApiOperation({ summary: 'Get QR code by code (public, tracks scan)' })
  async getQrCodeByCode(
    @Param('code') code: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];
    return this.qrCodesService.getQrCodeByCode(code);
  }
}
