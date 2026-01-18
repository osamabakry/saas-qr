import { Module } from '@nestjs/common';
import { QrCodesService } from './qr-codes.service';
import { QrCodesController } from './qr-codes.controller';
import { PublicQrController } from './public-qr.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [QrCodesController, PublicQrController],
  providers: [QrCodesService],
  exports: [QrCodesService],
})
export class QrCodesModule {}
