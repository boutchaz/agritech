import { Module } from '@nestjs/common';
import { WorkersController } from './workers.controller';
import { WorkersMeController } from './workers-me.controller';
import { WorkersService } from './workers.service';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [EmailModule, NotificationsModule],
  controllers: [WorkersController, WorkersMeController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
