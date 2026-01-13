import { ApiProperty } from '@nestjs/swagger';

export class ChatContextSummaryDto {
  @ApiProperty({ description: 'Organization name' })
  organization: string;

  @ApiProperty({ description: 'Number of farms' })
  farms_count: number;

  @ApiProperty({ description: 'Number of parcels' })
  parcels_count: number;

  @ApiProperty({ description: 'Number of workers' })
  workers_count: number;

  @ApiProperty({ description: 'Number of pending tasks' })
  pending_tasks: number;

  @ApiProperty({ description: 'Number of recent invoices' })
  recent_invoices: number;

  @ApiProperty({ description: 'Number of inventory items' })
  inventory_items: number;

  @ApiProperty({ description: 'Number of recent harvests' })
  recent_harvests: number;
}

export class ChatMetadataDto {
  @ApiProperty({ description: 'AI provider used' })
  provider: string;

  @ApiProperty({ description: 'Model used' })
  model: string;

  @ApiPropertyOptional({ description: 'Tokens used for generation' })
  tokensUsed?: number;

  @ApiProperty({ description: 'Response generation timestamp' })
  timestamp: Date;
}

export class ChatResponseDto {
  @ApiProperty({ description: 'AI-generated response' })
  response: string;

  @ApiProperty({
    description: 'Summary of context used for generation',
    type: ChatContextSummaryDto,
  })
  context_summary: ChatContextSummaryDto;

  @ApiProperty({
    description: 'Metadata about the response',
    type: ChatMetadataDto,
  })
  metadata: ChatMetadataDto;
}
