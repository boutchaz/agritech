import { Controller, Delete, Body, UseGuards, Request, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ParcelsService } from './parcels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DeleteParcelDto,
  DeleteParcelResponseDto,
} from './dto/delete-parcel.dto';

@ApiTags('parcels')
@Controller('parcels')
export class ParcelsController {
  constructor(private parcelsService: ParcelsService) { }

  @Get('performance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get parcel performance summary' })
  @ApiQuery({ name: 'farmId', required: false })
  @ApiQuery({ name: 'parcelId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getPerformanceSummary(
    @Request() req,
    @Query('farmId') farmId?: string,
    @Query('parcelId') parcelId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.parcelsService.getPerformanceSummary(
      req.user.id,
      organizationId,
      {
        farmId,
        parcelId,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      },
    );
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a parcel',
    description:
      'Delete a parcel with subscription validation. Checks for active subscription before deletion.',
  })
  @ApiResponse({
    status: 200,
    description: 'Parcel deleted successfully',
    type: DeleteParcelResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - invalid subscription' })
  @ApiResponse({ status: 404, description: 'Parcel or farm not found' })
  async deleteParcel(@Request() req, @Body() deleteParcelDto: DeleteParcelDto) {
    return this.parcelsService.deleteParcel(req.user.id, deleteParcelDto);
  }
}
