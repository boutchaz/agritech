import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BarcodeController } from './barcode.controller';
import { BarcodeService } from './barcode.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BarcodeController],
  providers: [BarcodeService],
  exports: [BarcodeService],
})
export class BarcodeModule {}
