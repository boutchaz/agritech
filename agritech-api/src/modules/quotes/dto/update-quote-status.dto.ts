import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateQuoteStatusDto {
  @ApiProperty({
    description: 'New quote status',
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled']
  })
  @IsEnum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'])
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'cancelled';

  @ApiProperty({ description: 'Optional notes for status change', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
