import { Module } from '@nestjs/common';
import { AnnualPlanModule } from '../../annual-plan/annual-plan.module';
import { TasksModule } from '../../tasks/tasks.module';
import { ChatToolsService } from './chat-tools.service';

@Module({
  imports: [TasksModule, AnnualPlanModule],
  providers: [ChatToolsService],
  exports: [ChatToolsService],
})
export class ChatToolsModule {}
