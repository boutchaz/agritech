import { Injectable } from '@nestjs/common';
import { InterventionWindowsService } from './intervention-windows.service';
import { PhenologyService } from './phenology.service';
import { WeatherForecastDay, WeatherGateService } from './weather-gate.service';

export interface MonitoringReadinessInput {
  cropType: string;
  gddCumulative: number;
  currentBbch: string | null;
  interventionType: string;
  weatherForecast: WeatherForecastDay[];
}

export interface MonitoringReadinessResult {
  phenology: Awaited<ReturnType<PhenologyService['determinePhenology']>>;
  intervention_window: ReturnType<InterventionWindowsService['checkInterventionWindow']>;
  weather_gate: ReturnType<WeatherGateService['checkWeatherCompatibility']>;
  can_execute: boolean;
}

@Injectable()
export class MonitoringPipelineService {
  constructor(
    private readonly phenologyService: PhenologyService,
    private readonly interventionWindowsService: InterventionWindowsService,
    private readonly weatherGateService: WeatherGateService,
  ) {}

  async evaluateRecommendationReadiness(
    input: MonitoringReadinessInput,
  ): Promise<MonitoringReadinessResult> {
    const phenology = await this.phenologyService.determinePhenology(
      input.cropType,
      input.gddCumulative,
    );

    const effectiveBbch = input.currentBbch ?? phenology.current_stage_bbch;

    const interventionWindow = this.interventionWindowsService.checkInterventionWindow(
      input.interventionType,
      effectiveBbch,
    );

    const weatherGate = this.weatherGateService.checkWeatherCompatibility(
      input.interventionType,
      input.weatherForecast,
    );

    return {
      phenology,
      intervention_window: interventionWindow,
      weather_gate: weatherGate,
      can_execute:
        interventionWindow.status !== 'forbidden' &&
        interventionWindow.status !== 'critical' &&
        weatherGate.can_proceed,
    };
  }
}
