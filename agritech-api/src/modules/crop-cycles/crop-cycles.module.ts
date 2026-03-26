import { Module } from '@nestjs/common';
import { CropCyclesService } from './crop-cycles.service';
import { CropCyclesController } from './crop-cycles.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [CropCyclesController],
  providers: [CropCyclesService],
  exports: [CropCyclesService],
})
export class CropCyclesModule {}
