import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SoilAnalysesController } from './soil-analyses.controller';
import { SoilAnalysesService } from './soil-analyses.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [SoilAnalysesController],
  providers: [SoilAnalysesService],
  exports: [SoilAnalysesService],
})
export class SoilAnalysesModule {}
