import { Injectable } from '@nestjs/common';

@Injectable()
export class ContextSummarizerService {
  /**
   * Summarize farms into a concise text without UUIDs.
   */
  summarizeFarms(farms: any[]): string {
    if (!farms || farms.length === 0) return 'No farms registered.';

    return farms
      .map((f) => {
        const parts = [f.name];
        if (f.total_area) parts.push(`${f.total_area} ha`);
        if (f.city) parts.push(f.city);
        return parts.join(', ');
      })
      .join('; ') + '.';
  }

  /**
   * Summarize parcels into a concise text.
   */
  summarizeParcels(parcels: any[]): string {
    if (!parcels || parcels.length === 0) return 'No parcels registered.';

    return parcels
      .map((p) => {
        const parts = [p.name || p.parcel_name];
        if (p.crop_type) parts.push(p.crop_type);
        if (p.area) parts.push(`${p.area} ha`);
        return parts.join(', ');
      })
      .join('; ') + '.';
  }

  /**
   * Summarize workers.
   */
  summarizeWorkers(workers: any[]): string {
    if (!workers || workers.length === 0) return 'No workers registered.';
    return `${workers.length} workers: ${workers.map((w) => `${w.first_name || ''} ${w.last_name || ''}`.trim()).join(', ')}.`;
  }

  /**
   * Summarize AgromindIA intelligence into concise, actionable text.
   */
  summarizeAgromindiaIntel(intel: any[]): string {
    if (!intel || intel.length === 0) return '';

    return intel
      .map((p) => {
        const lines: string[] = [];
        lines.push(`Parcel ${p.parcel_name} (${p.crop_type || 'unknown crop'}):`);

        if (p.diagnostics) {
          lines.push(`  Scenario ${p.diagnostics.scenario_code} — ${p.diagnostics.scenario} (confidence: ${Math.round(p.diagnostics.confidence * 100)}%)`);
        }

        if (p.recommendations?.length) {
          const pending = p.recommendations.filter((r: any) => r.status === 'pending' || !r.status);
          for (const rec of pending.slice(0, 3)) {
            lines.push(`  [${rec.priority}] ${rec.constat}: ${rec.action}`);
          }
          if (pending.length > 3) lines.push(`  ...and ${pending.length - 3} more recommendations`);
        }

        if (p.annual_plan?.upcoming_interventions?.length) {
          const upcoming = p.annual_plan.upcoming_interventions.slice(0, 2);
          lines.push(`  Upcoming: ${upcoming.map((i: any) => `${i.description} (month ${i.month})`).join(', ')}`);
        }

        if (p.annual_plan?.overdue_interventions?.length) {
          lines.push(`  ⚠ ${p.annual_plan.overdue_interventions.length} overdue intervention(s)`);
        }

        if (p.calibration) {
          lines.push(`  Calibration: ${p.calibration.zone_classification} (NDVI baseline: ${p.calibration.baseline_ndvi})`);
        }

        return lines.join('\n');
      })
      .join('\n\n');
  }

  /**
   * Summarize all context into a prompt-friendly format.
   */
  summarizeAll(context: any): string {
    const sections: string[] = [];

    if (context.farms_recent?.length) {
      sections.push('FARMS: ' + this.summarizeFarms(context.farms_recent));
    }
    if (context.parcels_recent?.length) {
      sections.push('PARCELS: ' + this.summarizeParcels(context.parcels_recent));
    }
    if (context.workers_recent?.length) {
      sections.push('WORKERS: ' + this.summarizeWorkers(context.workers_recent));
    }
    if (context.agromindiaIntel?.length) {
      sections.push('AGROMINDIA INTELLIGENCE:\n' + this.summarizeAgromindiaIntel(context.agromindiaIntel));
    }

    return sections.join('\n\n');
  }
}
