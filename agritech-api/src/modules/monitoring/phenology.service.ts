import { Injectable } from '@nestjs/common';
import {
  MonitoringReferential,
  MonitoringReferentialService,
} from './monitoring-referential.service';

interface BbchStage {
  code: string;
  nom: string;
  gddMin: number;
  gddMax: number;
}

export interface PhenologyResult {
  current_stage_bbch: string;
  current_stage_name: string;
  gdd_cumulative: number;
  next_stage_bbch: string | null;
  next_stage_name: string | null;
  gdd_to_next: number | null;
}

@Injectable()
export class PhenologyService {
  constructor(
    private readonly referentialService: MonitoringReferentialService,
  ) {}

  async determinePhenology(cropType: string, gddCumulative: number): Promise<PhenologyResult> {
    const referential = await this.referentialService.getCropReferential(cropType);
    const stages = this.extractStages(referential);

    if (!stages.length) {
      return {
        current_stage_bbch: '00',
        current_stage_name: 'Unknown stage',
        gdd_cumulative: this.round(gddCumulative),
        next_stage_bbch: null,
        next_stage_name: null,
        gdd_to_next: null,
      };
    }

    const current =
      stages.find((stage) => gddCumulative >= stage.gddMin && gddCumulative <= stage.gddMax) ??
      stages[stages.length - 1];

    const next =
      stages.find((stage) => stage.gddMin > gddCumulative) ?? null;

    return {
      current_stage_bbch: current.code,
      current_stage_name: current.nom,
      gdd_cumulative: this.round(gddCumulative),
      next_stage_bbch: next?.code ?? null,
      next_stage_name: next?.nom ?? null,
      gdd_to_next: next ? this.round(Math.max(0, next.gddMin - gddCumulative)) : null,
    };
  }

  private extractStages(referential: MonitoringReferential): BbchStage[] {
    const rawStages = Array.isArray(referential.stades_bbch)
      ? referential.stades_bbch
      : [];

    const stages = rawStages
      .map((stage) => {
        if (!this.isJsonObject(stage)) {
          return null;
        }

        const code = typeof stage.code === 'string' ? stage.code : null;
        const nom = typeof stage.nom === 'string' ? stage.nom : null;
        const gddRange = this.parseGddRange(stage.gdd_cumul);

        if (!code || !nom || !gddRange) {
          return null;
        }

        return {
          code,
          nom,
          gddMin: gddRange[0],
          gddMax: gddRange[1],
        };
      })
      .filter((stage): stage is BbchStage => stage !== null)
      .sort((a, b) => a.gddMin - b.gddMin);

    return stages;
  }

  private parseGddRange(value: unknown): [number, number] | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return [value, value];
    }

    if (Array.isArray(value) && value.length === 2) {
      const min = Number(value[0]);
      const max = Number(value[1]);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return [min, max];
      }
    }

    return null;
  }

  private isJsonObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private round(value: number, digits = 2): number {
    return Number(value.toFixed(digits));
  }
}
