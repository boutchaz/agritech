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
import { ChatService } from './chat.service';
import { SendMessageDto, ChatResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('organizations/:organizationId/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({
    summary: 'Send chat message and get AI response',
    description:
      'Queries all modules and provides intelligent responses using Z.ai GLM-4.7 model',
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
}
