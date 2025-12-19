import { Module } from '@nestjs/common';
import { DemoDataService } from './demo-data.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DemoDataService],
  exports: [DemoDataService],
})
export class DemoDataModule {}
