import { Module, forwardRef } from '@nestjs/common';
import { AiQuotaModule } from '../ai-quota/ai-quota.module';
import { ConfigModule } from '@nestjs/config';
import { AIReportsController } from './ai-reports.controller';
import { AIReportsService } from './ai-reports.service';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { ZaiProvider } from './providers/zai.provider';
import { DatabaseModule } from '../database/database.module';
import { OrganizationAISettingsModule } from '../organization-ai-settings/organization-ai-settings.module';
import { ChatModule } from '../chat/chat.module';
import { AgronomyRagModule } from '../agronomy-rag/agronomy-rag.module';

@Module({
  imports: [
    AiQuotaModule,
    DatabaseModule,
    ConfigModule,
    forwardRef(() => OrganizationAISettingsModule),
    forwardRef(() => ChatModule),
    AgronomyRagModule,
  ],
  controllers: [AIReportsController],
  providers: [AIReportsService, OpenAIProvider, GeminiProvider, GroqProvider, ZaiProvider],
  exports: [AIReportsService],
})
export class AIReportsModule {}
