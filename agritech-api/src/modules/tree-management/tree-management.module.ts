import { Module } from '@nestjs/common';
import { TreeManagementController } from './tree-management.controller';
import { TreeManagementService } from './tree-management.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TreeManagementController],
  providers: [TreeManagementService],
  exports: [TreeManagementService],
})
export class TreeManagementModule {}
