import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProductionIntelligenceController } from './production-intelligence.controller';
import { ProductionIntelligenceService } from './production-intelligence.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductionIntelligenceController],
  providers: [ProductionIntelligenceService],
  exports: [ProductionIntelligenceService],
})
export class ProductionIntelligenceModule {}
