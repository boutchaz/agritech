import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { PublicRdvController } from './public-rdv.controller';
import { PublicRdvService } from './public-rdv.service';

@Module({
  imports: [ConfigModule, NotificationsModule, DatabaseModule, EmailModule],
  controllers: [PublicRdvController],
  providers: [PublicRdvService],
})
export class PublicRdvModule {}
