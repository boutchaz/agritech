import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CostCentersController } from './cost-centers.controller';
import { CostCentersService } from './cost-centers.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CostCentersController],
  providers: [CostCentersService],
  exports: [CostCentersService],
})
export class CostCentersModule {}
