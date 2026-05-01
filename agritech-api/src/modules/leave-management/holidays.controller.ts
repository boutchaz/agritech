import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { Action } from '../casl/action.enum';
import { Subject } from '../casl/subject.enum';
import { RequirePermission } from '../casl/permissions.decorator';
import { HolidaysService } from './holidays.service';
import { AddHolidaysDto, CreateHolidayListDto } from './dto';

@ApiTags('HR - Holidays')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/holidays')
export class HolidaysController {
  constructor(private readonly service: HolidaysService) {}

  @Get('lists')
  @RequirePermission(Action.Read, Subject.HOLIDAY)
  listLists(
    @Param('organizationId') organizationId: string,
    @Query('year') year?: string,
  ) {
    return this.service.listLists(
      organizationId,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Post('lists')
  @RequirePermission(Action.Create, Subject.HOLIDAY)
  createList(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateHolidayListDto,
  ) {
    return this.service.createList(organizationId, dto);
  }

  @Post('lists/:id/holidays')
  @RequirePermission(Action.Update, Subject.HOLIDAY)
  addHolidays(
    @Param('organizationId') organizationId: string,
    @Param('id') listId: string,
    @Body() dto: AddHolidaysDto,
  ) {
    return this.service.addHolidays(organizationId, listId, dto);
  }

  @Post('lists/:id/pull-regional')
  @RequirePermission(Action.Update, Subject.HOLIDAY)
  @ApiOperation({ summary: 'Auto-pull standard Moroccan public holidays for the list year' })
  pullRegional(
    @Param('organizationId') organizationId: string,
    @Param('id') listId: string,
    @Query('year') year: string,
  ) {
    if (!year) throw new BadRequestException('year query param is required');
    return this.service.pullMoroccoHolidays(organizationId, listId, parseInt(year, 10));
  }

  @Delete('lists/:id')
  @RequirePermission(Action.Delete, Subject.HOLIDAY)
  deleteList(
    @Param('organizationId') organizationId: string,
    @Param('id') listId: string,
  ) {
    return this.service.deleteList(organizationId, listId);
  }
}
