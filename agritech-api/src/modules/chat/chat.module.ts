import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ZaiProvider } from './providers/zai.provider';
import { ZaiTTSProvider } from './providers/zai-tts.provider';
import { WeatherProvider } from './providers/weather.provider';
import { DatabaseModule } from '../database/database.module';
import { ContextRouterService } from './context/context-router.service';
import { ContextBuilderService } from './context/context-builder.service';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { ConversationService } from './conversation/conversation.service';
import { AgromindiaContextService } from './context/agromindia-context.service';
import { AiDiagnosticsModule } from '../ai-diagnostics/ai-diagnostics.module';
import { AiRecommendationsModule } from '../ai-recommendations/ai-recommendations.module';
import { AnnualPlanModule } from '../annual-plan/annual-plan.module';
import { AiReferencesModule } from '../ai-references/ai-references.module';
import { CalibrationModule } from '../calibration/calibration.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    AiDiagnosticsModule,
    AiRecommendationsModule,
    AnnualPlanModule,
    AiReferencesModule,
    CalibrationModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ContextRouterService,
    ContextBuilderService,
    PromptBuilderService,
    ConversationService,
    AgromindiaContextService,
    ZaiProvider,
    ZaiTTSProvider,
    WeatherProvider,
    Reflector,
  ],
  exports: [ChatService, WeatherProvider],
})
export class ChatModule {}
