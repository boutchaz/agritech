import { Module } from '@nestjs/common';
import { WorkersController } from './workers.controller';
import { WorkersMeController } from './workers-me.controller';
import { WorkersService } from './workers.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [WorkersController, WorkersMeController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
