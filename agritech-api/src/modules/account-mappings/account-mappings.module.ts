import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountMappingsController } from './account-mappings.controller';
import { AccountMappingsService } from './account-mappings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AccountMappingsController],
  providers: [AccountMappingsService],
  exports: [AccountMappingsService],
})
export class AccountMappingsModule {}
