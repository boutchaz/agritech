import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { InternalAdminGuard } from './guards/internal-admin.guard';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminController],
  providers: [AdminService, InternalAdminGuard],
  exports: [AdminService],
})
export class AdminModule {}
