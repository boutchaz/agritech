import { Module } from '@nestjs/common';
import { ReceptionBatchesController } from './reception-batches.controller';
import { ReceptionBatchesService } from './reception-batches.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ReceptionBatchesController],
  providers: [ReceptionBatchesService],
  exports: [ReceptionBatchesService],
})
export class ReceptionBatchesModule {}
