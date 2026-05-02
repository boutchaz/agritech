import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LandingService } from './landing.service';

@ApiTags('landing')
@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Get()
  @ApiOperation({ summary: 'Get public landing page settings (hero stats, partners)' })
  @ApiResponse({ status: 200 })
  async get() {
    return this.landingService.get();
  }
}
