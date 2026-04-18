import { Module } from '@nestjs/common';
import { TaskTemplatesService } from './task-templates.service';
import { DatabaseModule } from '../database/database.module';
import { TaskTemplatesController } from './task-templates.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [TaskTemplatesController],
  providers: [TaskTemplatesService],
  exports: [TaskTemplatesService],
})
export class TaskTemplatesModule {}
