import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignSummaryController } from './campaign-summary.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [CampaignsController, CampaignSummaryController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
