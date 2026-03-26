import { Module } from '@nestjs/common';
import { PieceWorkController } from './piece-work.controller';
import { PieceWorkService } from './piece-work.service';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [PieceWorkController],
  providers: [PieceWorkService],
  exports: [PieceWorkService],
})
export class PieceWorkModule {}
