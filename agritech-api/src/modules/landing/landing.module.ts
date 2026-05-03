import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AdminModule } from '../admin/admin.module';
import { LandingController } from './landing.controller';
import { LandingAdminController } from './landing-admin.controller';
import { LandingService } from './landing.service';

@Module({
  imports: [DatabaseModule, AdminModule],
  controllers: [LandingController, LandingAdminController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
