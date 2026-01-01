import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrganizationAISettingsController } from './organization-ai-settings.controller';
import { OrganizationAISettingsService } from './organization-ai-settings.service';
import { DatabaseModule } from '../database/database.module';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [OrganizationAISettingsController],
  providers: [OrganizationAISettingsService, EncryptionService],
  exports: [OrganizationAISettingsService, EncryptionService],
})
export class OrganizationAISettingsModule {}
