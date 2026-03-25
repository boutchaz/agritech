import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { SendMessageDto, ChatResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Res } from '@nestjs/common';
import { Response } from 'express';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('organizations/:organizationId/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Send chat message and get AI response',
    description:
      'Queries all modules and provides intelligent responses using Z.ai GLM-4.5-Flash model',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'AI response generated successfully',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or AI provider error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - no access to organization',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - rate limit exceeded (10 messages per minute)',
  })
  async sendMessage(
    @Req() req,
    @Param('organizationId') organizationId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ChatResponseDto> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    return this.chatService.sendMessage(userId, organizationId, dto);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get conversation history',
    description: 'Retrieves chat conversation history for the user',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of messages to retrieve',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation history retrieved',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - no access to organization',
  })
  async getHistory(
    @Req() req,
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    return this.chatService.getConversationHistory(
      userId,
      organizationId,
      limit,
    );
  }

  @Delete('history')
  @ApiOperation({
    summary: 'Clear conversation history',
    description: 'Clears all chat conversation history for the user',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation history cleared',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - no access to organization',
  })
  async clearHistory(
    @Req() req,
    @Param('organizationId') organizationId: string,
  ) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    return this.chatService.clearConversationHistory(userId, organizationId);
  }

  @Post('stream')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Send chat message and get streaming AI response',
    description: 'Streams AI response tokens via Server-Sent Events',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Streaming response started',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async sendMessageStream(
    @Req() req,
    @Param('organizationId') organizationId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      await this.chatService.sendMessageStream(userId, organizationId, dto, {
        onToken: (token: string) => {
          res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
        },
        onComplete: (metadata: any) => {
          res.write(`data: ${JSON.stringify({ type: 'done', metadata })}\n\n`);
          res.end();
        },
        onError: (error: Error) => {
          res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
          res.end();
        },
      });
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }

  @Post('tts')
  @ApiOperation({
    summary: 'Convert text to speech',
    description: 'Generate audio from text using Z.ai GLM-TTS',
  })
  @ApiResponse({
    status: 200,
    description: 'Audio generated successfully',
    content: {
      'audio/mpeg': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  async textToSpeech(
    @Req() req,
    @Param('organizationId') organizationId: string,
    @Body() body: { text: string; language?: string; voice?: string; speed?: number },
    @Res() res: Response,
  ) {
    if (!body.text || body.text.trim().length === 0) {
      throw new BadRequestException('Text is required');
    }

    try {
      const ttsResponse = await this.chatService.textToSpeech(organizationId, {
        text: body.text,
        language: body.language || 'fr',
        voice: body.voice,
        speed: body.speed,
      });

      res.setHeader('Content-Type', ttsResponse.contentType);
      res.setHeader('Content-Length', ttsResponse.audio.length.toString());
      res.send(ttsResponse.audio);
    } catch (error) {
      this.chatService['logger'].error(`TTS error: ${error.message}`);
      throw new BadRequestException(`Failed to generate speech: ${error.message}`);
    }
  }
}
