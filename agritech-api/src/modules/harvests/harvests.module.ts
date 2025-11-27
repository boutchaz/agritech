import { Module } from '@nestjs/common';
import { HarvestsController } from './harvests.controller';
import { HarvestsService } from './harvests.service';

@Module({
  controllers: [HarvestsController],
  providers: [HarvestsService],
  exports: [HarvestsService],
})
export class HarvestsModule {}
