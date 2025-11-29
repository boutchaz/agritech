import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [DatabaseModule, SequencesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule { }
