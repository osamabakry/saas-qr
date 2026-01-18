import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QrCodesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private configService: ConfigService,
  ) { }

  async generateQrCode(restaurantId: string, tableId?: string) {
    // Check if QR already exists for this table
    if (tableId) {
      const existing = await this.prisma.qrCode.findUnique({
        where: { tableId },
      });

      if (existing) {
        return existing;
      }
    }

    // Generate unique code
    const code = uuidv4();
    const baseUrl = this.configService.get('QR_BASE_URL') || 'https://otlobha-qr.vercel.app/menu';
    const publicUrl = `${baseUrl}/${code}`;

    // Generate QR code image
    const qrImageBuffer = await QRCode.toBuffer(publicUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 500,
      margin: 2,
    });

    // Upload QR image to storage
    const qrImageUrl = await this.storageService.uploadFile(
      qrImageBuffer,
      `qr-codes/${restaurantId}/${code}.png`,
      'image/png',
    );

    // Create QR code record
    const qrCode = await this.prisma.qrCode.create({
      data: {
        restaurantId,
        tableId,
        code,
        qrImageUrl,
        publicUrl,
      },
      include: {
        table: true,
      },
    });

    return qrCode;
  }

  async getQrCodeByCode(code: string) {
    const qrCode = await this.prisma.qrCode.findUnique({
      where: { code },
      include: {
        restaurant: {
          include: {
            settings: true,
          },
        },
        table: true,
      },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    // Track scan
    await this.trackScan(qrCode.id, qrCode.restaurantId);

    return qrCode;
  }

  async getQrCodes(restaurantId: string) {
    return this.prisma.qrCode.findMany({
      where: { restaurantId },
      include: {
        table: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQrCode(id: string, restaurantId: string) {
    const qrCode = await this.prisma.qrCode.findFirst({
      where: { id, restaurantId },
      include: {
        table: true,
      },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    return qrCode;
  }

  async deleteQrCode(id: string, restaurantId: string) {
    const qrCode = await this.prisma.qrCode.findFirst({
      where: { id, restaurantId },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    // Delete QR image from storage
    if (qrCode.qrImageUrl) {
      await this.storageService.deleteFile(qrCode.qrImageUrl);
    }

    return this.prisma.qrCode.delete({
      where: { id },
    });
  }

  private async trackScan(qrCodeId: string, restaurantId: string, ipAddress?: string, userAgent?: string) {
    // Update QR code scan count
    await this.prisma.qrCode.update({
      where: { id: qrCodeId },
      data: {
        scanCount: { increment: 1 },
        lastScannedAt: new Date(),
      },
    });

    // Record scan event
    await this.prisma.qrScan.create({
      data: {
        qrCodeId,
        restaurantId,
        ipAddress,
        userAgent,
      },
    });
  }
}
