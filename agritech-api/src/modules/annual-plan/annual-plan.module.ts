import { Module } from '@nestjs/common';
import { AiQuotaModule } from '../ai-quota/ai-quota.module';
import { DatabaseModule } from '../database/database.module';
import { AnnualPlanController } from './annual-plan.controller';
import { AnnualPlanService } from './annual-plan.service';

@Module({
  imports: [
    AiQuotaModule,DatabaseModule],
  controllers: [AnnualPlanController],
  providers: [AnnualPlanService],
  exports: [AnnualPlanService],
})
export class AnnualPlanModule {}
