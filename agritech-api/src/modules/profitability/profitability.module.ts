import { Module } from '@nestjs/common';
import { ProfitabilityController } from './profitability.controller';
import { ProfitabilityService } from './profitability.service';
import { DatabaseModule } from '../database/database.module';
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [ProfitabilityController],
  providers: [ProfitabilityService],
  exports: [ProfitabilityService],
})
export class ProfitabilityModule {}
