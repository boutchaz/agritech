import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AdminModule } from '../admin/admin.module';
import { SupportController } from './support.controller';
import { SupportAdminController } from './support-admin.controller';
import { SupportService } from './support.service';

@Module({
  imports: [DatabaseModule, AdminModule],
  controllers: [SupportController, SupportAdminController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
