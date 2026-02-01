import { Module } from '@nestjs/common';
import { PolarService } from './polar.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [PolarService],
  exports: [PolarService],
})
export class PolarModule {}
