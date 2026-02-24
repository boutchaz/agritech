import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsDateString, IsIn, IsObject, IsBoolean, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

// Custom validator to ensure numeric dimension values are not negative
function IsNonNegativeDimensions(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNonNegativeDimensions',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'object') return true;

          // Check top-level numeric properties
          const numericFields = ['width', 'length', 'height', 'depth', 'radius', 'pump_power', 'top_width', 'bottom_width'];
          for (const field of numericFields) {
            if (value[field] !== undefined && typeof value[field] === 'number' && value[field] < 0) {
              return false;
            }
          }

          // Check nested dimensions object
          if (value.dimensions && typeof value.dimensions === 'object') {
            for (const field of numericFields) {
              if (value.dimensions[field] !== undefined && typeof value.dimensions[field] === 'number' && value.dimensions[field] < 0) {
                return false;
              }
            }
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Dimension values (width, length, height, depth, radius, etc.) must not be negative';
        },
      },
    });
  };
}

export class CreateStructureDto {
  @ApiProperty({ description: 'Structure name' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Structure type',
    enum: ['stable', 'technical_room', 'basin', 'well', 'other']
  })
  @IsIn(['stable', 'technical_room', 'basin', 'well', 'other'])
  type: string;

  @ApiPropertyOptional({ description: 'Farm ID (if farm-specific structure)' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({
    description: 'Geographic location',
    type: 'object',
    additionalProperties: true,
    example: { lat: 33.5731, lng: -7.5898 }
  })
  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number };

  @ApiProperty({ description: 'Installation date' })
  @IsDateString()
  installation_date: string;

  @ApiPropertyOptional({
    description: 'Structure condition',
    enum: ['excellent', 'good', 'fair', 'poor', 'needs_repair']
  })
  @IsOptional()
  @IsIn(['excellent', 'good', 'fair', 'poor', 'needs_repair'])
  condition?: string;

  @ApiPropertyOptional({ description: 'Usage description' })
  @IsOptional()
  @IsString()
  usage?: string;

  @ApiPropertyOptional({
    description: 'Structure-specific details (dimensions, equipment, etc.)',
    type: 'object',
    additionalProperties: true
  })
  @IsOptional()
  @IsObject()
  @IsNonNegativeDimensions({ message: 'Dimension values (width, length, height, depth, radius, etc.) must not be negative' })
  structure_details?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
