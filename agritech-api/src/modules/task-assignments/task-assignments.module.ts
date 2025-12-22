import { Module } from '@nestjs/common';
import { TaskAssignmentsController } from './task-assignments.controller';
import { TaskAssignmentsService } from './task-assignments.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TaskAssignmentsController],
  providers: [TaskAssignmentsService],
  exports: [TaskAssignmentsService],
})
export class TaskAssignmentsModule {}
