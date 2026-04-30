import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CanCreateDeliveryNote,
  CanDeleteDeliveryNote,
  CanReadDeliveryNotes,
  CanUpdateDeliveryNote,
} from '../casl/permissions.decorator';
import { DeliveryNotesService } from './delivery-notes.service';
import {
  CreateDeliveryNoteDto,
  DeliveryNoteFiltersDto,
  UpdateDeliveryNoteDto,
} from './dto';

@ApiTags('delivery-notes')
@ApiBearerAuth()
@Controller('delivery-notes')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
export class DeliveryNotesController {
  constructor(private readonly deliveryNotesService: DeliveryNotesService) {}

  @Post()
  @CanCreateDeliveryNote()
  @ApiOperation({ summary: 'Create a new delivery note' })
  @ApiResponse({ status: 201, description: 'Delivery note created successfully' })
  async create(@Body() dto: CreateDeliveryNoteDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.deliveryNotesService.create(dto, organizationId, userId);
  }

  @Get()
  @CanReadDeliveryNotes()
  @ApiOperation({ summary: 'Get delivery notes' })
  @ApiResponse({ status: 200, description: 'Delivery notes retrieved successfully' })
  async findAll(@Query() filters: DeliveryNoteFiltersDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.deliveryNotesService.findAll(organizationId, filters);
  }

  @Get(':id')
  @CanReadDeliveryNotes()
  @ApiOperation({ summary: 'Get a delivery note by ID' })
  @ApiParam({ name: 'id', description: 'Delivery note UUID' })
  @ApiResponse({ status: 200, description: 'Delivery note retrieved successfully' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.deliveryNotesService.findOne(id, organizationId);
  }

  @Patch(':id')
  @CanUpdateDeliveryNote()
  @ApiOperation({ summary: 'Update a draft delivery note' })
  @ApiParam({ name: 'id', description: 'Delivery note UUID' })
  @ApiResponse({ status: 200, description: 'Delivery note updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryNoteDto,
    @Req() req: any,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.deliveryNotesService.update(id, organizationId, userId, dto);
  }

  @Post(':id/submit')
  @CanUpdateDeliveryNote()
  @ApiOperation({ summary: 'Submit a delivery note' })
  @ApiParam({ name: 'id', description: 'Delivery note UUID' })
  @ApiResponse({ status: 200, description: 'Delivery note submitted successfully' })
  async submit(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.deliveryNotesService.submit(id, organizationId, userId);
  }

  @Patch(':id/cancel')
  @CanUpdateDeliveryNote()
  @ApiOperation({ summary: 'Cancel a delivery note' })
  @ApiParam({ name: 'id', description: 'Delivery note UUID' })
  @ApiResponse({ status: 200, description: 'Delivery note cancelled successfully' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.deliveryNotesService.cancel(id, organizationId, userId);
  }

  @Delete(':id')
  @CanDeleteDeliveryNote()
  @ApiOperation({ summary: 'Delete a draft delivery note' })
  @ApiParam({ name: 'id', description: 'Delivery note UUID' })
  @ApiResponse({ status: 200, description: 'Delivery note deleted successfully' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.deliveryNotesService.remove(id, organizationId);
  }
}
