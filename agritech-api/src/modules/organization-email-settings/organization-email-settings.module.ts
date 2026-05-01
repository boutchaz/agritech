import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { EncryptionService } from '../../common/services/encryption.service';
import { OrganizationEmailSettingsController } from './organization-email-settings.controller';
import { OrganizationEmailSettingsService } from './organization-email-settings.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [OrganizationEmailSettingsController],
  providers: [OrganizationEmailSettingsService, EncryptionService],
  exports: [OrganizationEmailSettingsService],
})
export class OrganizationEmailSettingsModule {}
