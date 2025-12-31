import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIReportsController } from './ai-reports.controller';
import { AIReportsService } from './ai-reports.service';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [AIReportsController],
  providers: [AIReportsService, OpenAIProvider, GeminiProvider],
  exports: [AIReportsService],
})
export class AIReportsModule {}
