import { Module } from '@nestjs/common';
import { OrgSetupService } from './org-setup.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [OrgSetupService],
  exports: [OrgSetupService],
})
export class OrgSetupModule {}
