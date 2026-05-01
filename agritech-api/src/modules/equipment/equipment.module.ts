import { Module } from '@nestjs/common';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { DatabaseModule } from '../database/database.module';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';

@Module({
  imports: [DatabaseModule, JournalEntriesModule],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
