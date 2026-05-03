import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { EncryptionService } from '../../common/services/encryption.service';
import { OrganizationWhatsAppSettingsController } from './organization-whatsapp-settings.controller';
import { OrganizationWhatsAppSettingsService } from './organization-whatsapp-settings.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [OrganizationWhatsAppSettingsController],
  providers: [OrganizationWhatsAppSettingsService, EncryptionService],
  exports: [OrganizationWhatsAppSettingsService],
})
export class OrganizationWhatsAppSettingsModule {}
