import { Module, forwardRef } from '@nestjs/common';
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
import { SemanticContextRouterService } from './context/semantic-context-router.service';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { ConversationService } from './conversation/conversation.service';
import { AgromindiaContextService } from './context/agromindia-context.service';
import { FollowUpService } from './prompt/follow-up.service';
import { StructuredResponseService } from './prompt/structured-response.service';
import { AiQuotaModule } from '../ai-quota/ai-quota.module';
import { AiDiagnosticsModule } from '../ai-diagnostics/ai-diagnostics.module';
import { AiRecommendationsModule } from '../ai-recommendations/ai-recommendations.module';
import { AnnualPlanModule } from '../annual-plan/annual-plan.module';
import { AiReferencesModule } from '../ai-references/ai-references.module';
import { CalibrationModule } from '../calibration/calibration.module';
import { ChatToolsModule } from './tools/chat-tools.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    AiDiagnosticsModule,
    AiRecommendationsModule,
    AnnualPlanModule,
    AiReferencesModule,
    ChatToolsModule,
    forwardRef(() => CalibrationModule),
    AiQuotaModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ContextRouterService,
    SemanticContextRouterService,
    ContextBuilderService,
    PromptBuilderService,
    ConversationService,
    AgromindiaContextService,
    FollowUpService,
    StructuredResponseService,
    ZaiProvider,
    ZaiTTSProvider,
    WeatherProvider,
    Reflector,
  ],
  exports: [ChatService, WeatherProvider],
})
export class ChatModule {}
