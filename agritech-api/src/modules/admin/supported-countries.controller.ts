import { Controller, Get } from '@nestjs/common';
import { SupportedCountriesService } from './supported-countries.service';

@Controller('supported-countries')
export class SupportedCountriesController {
  constructor(
    private readonly supportedCountriesService: SupportedCountriesService,
  ) {}

  /**
   * Public endpoint — no auth required.
   * Returns all enabled supported countries grouped by region.
   */
  @Get()
  async getEnabledCountries() {
    return this.supportedCountriesService.findEnabled();
  }
}
