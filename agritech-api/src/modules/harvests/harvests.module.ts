import { Module } from '@nestjs/common';
import { HarvestsController } from './harvests.controller';
import { HarvestsService } from './harvests.service';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { ReceptionBatchesModule } from '../reception-batches/reception-batches.module';

@Module({
  imports: [JournalEntriesModule, ReceptionBatchesModule],
  controllers: [HarvestsController],
  providers: [HarvestsService],
  exports: [HarvestsService],
})
export class HarvestsModule {}
