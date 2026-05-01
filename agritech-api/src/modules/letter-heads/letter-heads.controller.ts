import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LetterHeadsService } from './letter-heads.service';
import { CreateLetterHeadDto, UpdateLetterHeadDto } from './dto';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('Letter Heads')
@ApiBearerAuth()
@Controller('organizations/:organizationId/letter-heads')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class LetterHeadsController {
  constructor(private readonly letterHeadsService: LetterHeadsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all letter heads' })
  @ApiResponse({ status: 200, description: 'Letter heads retrieved successfully' })
  async findAll(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.letterHeadsService.findAll(req.user.userId, organizationId);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default letter head' })
  @ApiResponse({ status: 200, description: 'Default letter head retrieved successfully' })
  async findDefault(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.letterHeadsService.findDefault(req.user.userId, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single letter head' })
  @ApiResponse({ status: 200, description: 'Letter head retrieved successfully' })
  async findOne(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') letterHeadId: string,
  ) {
    return this.letterHeadsService.findOne(req.user.userId, organizationId, letterHeadId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new letter head' })
  @ApiResponse({ status: 201, description: 'Letter head created successfully' })
  async create(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateLetterHeadDto,
  ) {
    return this.letterHeadsService.create(req.user.userId, organizationId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a letter head' })
  @ApiResponse({ status: 200, description: 'Letter head updated successfully' })
  async update(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') letterHeadId: string,
    @Body() updateDto: UpdateLetterHeadDto,
  ) {
    return this.letterHeadsService.update(req.user.userId, organizationId, letterHeadId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a letter head' })
  @ApiResponse({ status: 200, description: 'Letter head deleted successfully' })
  async delete(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') letterHeadId: string,
  ) {
    await this.letterHeadsService.delete(req.user.userId, organizationId, letterHeadId);
    return { message: 'Letter head deleted successfully' };
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set letter head as default' })
  @ApiResponse({ status: 200, description: 'Letter head set as default' })
  async setDefault(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') letterHeadId: string,
  ) {
    return this.letterHeadsService.setDefault(req.user.userId, organizationId, letterHeadId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a letter head' })
  @ApiResponse({ status: 201, description: 'Letter head duplicated successfully' })
  async duplicate(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') letterHeadId: string,
    @Body() body: { name?: string },
  ) {
    return this.letterHeadsService.duplicate(req.user.userId, organizationId, letterHeadId, body.name);
  }
}
