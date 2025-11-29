import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SequencesModule } from '../sequences/sequences.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [DatabaseModule, SequencesModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
