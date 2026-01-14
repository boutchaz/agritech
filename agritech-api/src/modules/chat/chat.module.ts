import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ZaiProvider } from './providers/zai.provider';
import { ZaiTTSProvider } from './providers/zai-tts.provider';
import { WeatherProvider } from './providers/weather.provider';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [ChatController],
  providers: [ChatService, ZaiProvider, ZaiTTSProvider, WeatherProvider],
  exports: [ChatService, WeatherProvider], // Export WeatherProvider for use in other modules
})
export class ChatModule {}
