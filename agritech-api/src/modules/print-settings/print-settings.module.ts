import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PrintSettingsController } from './print-settings.controller';
import { PrintSettingsService } from './print-settings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PrintSettingsController],
  providers: [PrintSettingsService],
  exports: [PrintSettingsService],
})
export class PrintSettingsModule {}
