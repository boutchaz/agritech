import { Injectable } from '@nestjs/common';

export type MonitoringWindowStatus =
  | 'effective'
  | 'critical'
  | 'forbidden'
  | 'not_relevant';

export interface MonitoringWindowResult {
  status: MonitoringWindowStatus;
  reason: string;
}

@Injectable()
export class InterventionWindowsService {
  checkInterventionWindow(
    interventionType: string,
    currentBbch: string | null,
  ): MonitoringWindowResult {
    if (!currentBbch) {
      return {
        status: 'critical',
        reason: 'Current phenological stage is unknown',
      };
    }

    const normalizedIntervention = interventionType.trim().toLowerCase();
    const bbch = this.toBbchNumber(currentBbch);
    if (bbch === null) {
      return {
        status: 'critical',
        reason: 'Invalid BBCH stage format',
      };
    }

    if (
      (normalizedIntervention.includes('foliar') ||
        normalizedIntervention.includes('phytosanitaire') ||
        normalizedIntervention.includes('spray')) &&
      bbch >= 60 &&
      bbch <= 69
    ) {
      return {
        status: 'forbidden',
        reason: 'Foliar treatments are forbidden during flowering (BBCH 60-69)',
      };
    }

    if (
      (normalizedIntervention.includes('taille') ||
        normalizedIntervention.includes('pruning')) &&
      bbch >= 10 &&
      bbch <= 79
    ) {
      return {
        status: 'forbidden',
        reason: 'Severe pruning is forbidden during active growth',
      };
    }

    if (
      (normalizedIntervention.includes('fertigation') ||
        normalizedIntervention.includes('azote') ||
        normalizedIntervention.includes('nitrogen')) &&
      bbch >= 80
    ) {
      return {
        status: 'critical',
        reason: 'Nitrogen fertigation after veraison is strongly discouraged',
      };
    }

    return {
      status: 'effective',
      reason: 'Intervention is compatible with current BBCH stage',
    };
  }

  private toBbchNumber(bbch: string): number | null {
    const parsed = Number(bbch);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    return Math.round(parsed);
  }
}
