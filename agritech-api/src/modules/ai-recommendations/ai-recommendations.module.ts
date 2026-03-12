import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AiRecommendationsController } from './ai-recommendations.controller';
import { AiRecommendationsService } from './ai-recommendations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AiRecommendationsController],
  providers: [AiRecommendationsService],
  exports: [AiRecommendationsService],
})
export class AiRecommendationsModule {}
