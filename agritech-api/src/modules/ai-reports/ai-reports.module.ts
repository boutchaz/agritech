import { Module, forwardRef } from '@nestjs/common';
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

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    forwardRef(() => OrganizationAISettingsModule),
    forwardRef(() => ChatModule), // forwardRef to break circular: ChatModule → CalibrationModule → AIReportsModule → ChatModule
  ],
  controllers: [AIReportsController],
  providers: [AIReportsService, OpenAIProvider, GeminiProvider, GroqProvider, ZaiProvider],
  exports: [AIReportsService],
})
export class AIReportsModule {}
