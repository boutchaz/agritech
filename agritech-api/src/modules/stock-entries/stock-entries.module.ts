import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StockEntriesController } from './stock-entries.controller';
import { StockEntriesService } from './stock-entries.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StockEntriesController],
  providers: [StockEntriesService],
  exports: [StockEntriesService],
})
export class StockEntriesModule {}
