import { Module } from '@nestjs/common';
import { DemoDataService } from './demo-data.service';
import { DemoDataController } from './demo-data.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DemoDataController],
  providers: [DemoDataService],
  exports: [DemoDataService],
})
export class DemoDataModule {}
