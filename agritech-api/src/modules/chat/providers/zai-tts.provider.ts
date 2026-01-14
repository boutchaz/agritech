import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';

export interface TTSRequest {
  text: string;
  language?: string;
  voice?: string;
  speed?: number;
}

export interface TTSResponse {
  audio: Buffer;
  contentType: string;
  duration?: number;
}

@Injectable()
export class ZaiTTSProvider {
  private readonly logger = new Logger(ZaiTTSProvider.name);
  private readonly envApiKey: string;
  private readonly apiUrl = 'https://open.bigmodel.cn/api/paas/v4/audio/speech';
  private readonly defaultModel = 'glm-tts';
  private dynamicApiKey?: string;

  constructor(configService: ConfigService) {
    this.envApiKey = configService.get<string>('ZAI_API_KEY', '');
  }

  setApiKey(apiKey: string) {
    this.dynamicApiKey = apiKey;
  }

  private getEffectiveApiKey(): string {
    const apiKey = this.dynamicApiKey || this.envApiKey;
    return this.generateZaiToken(apiKey);
  }

  /**
   * Generate Z.ai JWT token from API key
   * API key format: id.secret
   */
  private generateZaiToken(apiKey: string): string {
    try {
      const [id, secret] = apiKey.split('.');
      if (!id || !secret) {
        throw new Error('Invalid Z.ai API key format');
      }

      const nowInSeconds = Math.floor(Date.now() / 1000);
      const payload = {
        api_key: id,
        exp: nowInSeconds + 3600,
        timestamp: nowInSeconds,
      };

      return jwt.sign(payload, secret, {
        algorithm: 'HS256',
        header: { alg: 'HS256', sign_type: 'SIGN' },
      } as jwt.SignOptions);
    } catch (error) {
      this.logger.error('Failed to generate Z.ai token', error);
      return apiKey;
    }
  }

  validateConfig(): boolean {
    const apiKey = this.dynamicApiKey || this.envApiKey;
    const isValid = !!apiKey && apiKey.includes('.') && apiKey.split('.').length === 2;
    if (!isValid) {
      this.logger.warn('Z.ai API key not configured or invalid format (expected: id.secret)');
    }
    return isValid;
  }

  /**
   * Convert text to speech using Z.ai GLM-TTS
   * API Documentation: https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-tts
   */
  async textToSpeech(request: TTSRequest): Promise<TTSResponse> {
    const apiKey = this.getEffectiveApiKey();

    if (!this.validateConfig()) {
      throw new Error('Z.ai API key is not configured');
    }

    this.logger.log(`Converting text to speech: ${request.text.substring(0, 50)}...`);

    try {
      // Z.ai GLM-TTS API endpoint
      // Available voices: "tongtong", "xiaochen", "chuichui", "jam", "kazi", "douji", "luodo"
      // "jam" and "kazi" tend to sound more natural for multilingual content
      const defaultVoice = request.voice || 'jam'; // Use 'jam' as default (more natural)
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.defaultModel,
          input: request.text,
          voice: defaultVoice,
          speed: request.speed || 0.95, // Slightly slower for more natural speech (0.5 to 2.0)
          volume: 6, // Slightly higher volume for clarity (0 to 10)
          response_format: 'wav', // or 'mp3', 'opus'
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer', // Get audio as binary
          timeout: 30000,
        },
      );

      const audioBuffer = Buffer.from(response.data);
      // Z.ai returns WAV format by default
      const contentType = response.headers['content-type'] || 'audio/wav';

      this.logger.log(`TTS generation complete. Audio size: ${audioBuffer.length} bytes`);

      return {
        audio: audioBuffer,
        contentType,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = (error as AxiosError).response?.data
          ? JSON.stringify((error as AxiosError).response?.data)
          : error.message;
        this.logger.error(`Z.ai TTS API error: ${errorMessage}`);
        throw new Error(`Z.ai TTS API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Fallback: Use browser TTS if Z.ai TTS is not available
   * This can be called from frontend as a fallback
   */
  async textToSpeechFallback(request: TTSRequest): Promise<{ fallback: true }> {
    this.logger.warn('Z.ai TTS not available, using browser TTS fallback');
    return { fallback: true };
  }
}
