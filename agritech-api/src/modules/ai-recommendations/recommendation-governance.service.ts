import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type RecommendationStatus =
  | 'proposed'
  | 'validated'
  | 'waiting'
  | 'executed'
  | 'evaluated'
  | 'closed'
  | 'rejected'
  | 'expired';

export type RecommendationPriority = 'urgent' | 'priority' | 'vigilance' | 'info';

const VALID_TRANSITIONS: Record<RecommendationStatus, RecommendationStatus[]> = {
  proposed: ['validated', 'rejected', 'expired', 'waiting'],
  validated: ['executed', 'waiting', 'expired'],
  waiting: ['validated', 'expired'],
  executed: ['evaluated'],
  evaluated: ['closed'],
  closed: [],
  rejected: [],
  expired: [],
};

/** Minimum days between recommendations on the same theme */
const THEME_FREQUENCY_DAYS: Record<string, number> = {
  irrigation: 3,
  fertigation_n: 10,
  phytosanitary: 7,
  soil_amendment: 30,
  biostimulants: 7,
  pruning: 90,
};

/** Max simultaneous active reactive recommendations per parcel */
const MAX_ACTIVE_REACTIVE = 3;
/** Max simultaneous reminded planned recommendations per parcel */
const MAX_ACTIVE_PLANNED = 2;

@Injectable()
export class RecommendationGovernanceService {
  private readonly logger = new Logger(RecommendationGovernanceService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  isValidTransition(from: RecommendationStatus, to: RecommendationStatus): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return allowed?.includes(to) ?? false;
  }

  requiresMotifForRejection(priority: RecommendationPriority): boolean {
    return priority === 'urgent' || priority === 'priority';
  }

  async transitionStatus(
    recommendationId: string,
    organizationId: string,
    fromStatus: RecommendationStatus,
    toStatus: RecommendationStatus,
    decider: 'ia' | 'user',
    motif?: string,
  ): Promise<void> {
    if (!this.isValidTransition(fromStatus, toStatus)) {
      throw new BadRequestException(
        `Invalid recommendation transition: ${fromStatus} → ${toStatus}`,
      );
    }

    const supabase = this.databaseService.getAdminClient();

    // Update recommendation status
    const updatePayload: Record<string, unknown> = { status: toStatus };
    if (toStatus === 'executed') {
      updatePayload.executed_at = new Date().toISOString();
    }
    if (toStatus === 'evaluated') {
      updatePayload.evaluated_at = new Date().toISOString();
    }
    if (toStatus === 'rejected' && motif) {
      updatePayload.rejection_motif = motif;
    }

    const { error: updateError } = await supabase
      .from('ai_recommendations')
      .update(updatePayload)
      .eq('id', recommendationId)
      .eq('organization_id', organizationId)
      .eq('status', fromStatus);

    if (updateError) {
      throw new BadRequestException(
        `Failed to transition recommendation: ${updateError.message}`,
      );
    }

    // Write journal entry
    const { data: reco } = await supabase
      .from('ai_recommendations')
      .select('parcel_id')
      .eq('id', recommendationId)
      .maybeSingle();

    const { error: journalError } = await supabase
      .from('recommendation_events')
      .insert({
        recommendation_id: recommendationId,
        parcel_id: reco?.parcel_id,
        organization_id: organizationId,
        from_status: fromStatus,
        to_status: toStatus,
        decider,
        motif: motif ?? null,
      });

    if (journalError) {
      this.logger.warn(
        `Failed to write recommendation journal: ${journalError.message}`,
      );
    }
  }

  async canEmitRecommendation(
    parcelId: string,
    organizationId: string,
    priority: RecommendationPriority,
    theme?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Urgent always passes
    if (priority === 'urgent') {
      return { allowed: true };
    }

    const supabase = this.databaseService.getAdminClient();

    // Check simultaneous limits
    const { data: activeReactive, error } = await supabase
      .from('ai_recommendations')
      .select('id')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('recommendation_type', 'reactive')
      .in('status', ['proposed', 'validated', 'waiting'])
      .limit(MAX_ACTIVE_REACTIVE + 1);

    if (error) {
      this.logger.warn(`Failed to check active recommendations: ${error.message}`);
      return { allowed: true }; // fail open
    }

    if ((activeReactive?.length ?? 0) >= MAX_ACTIVE_REACTIVE) {
      return {
        allowed: false,
        reason: `Maximum ${MAX_ACTIVE_REACTIVE} active reactive recommendations reached`,
      };
    }

    // Check theme frequency
    if (theme && THEME_FREQUENCY_DAYS[theme]) {
      const minDays = THEME_FREQUENCY_DAYS[theme];
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - minDays);

      const { data: recentTheme } = await supabase
        .from('ai_recommendations')
        .select('id')
        .eq('parcel_id', parcelId)
        .eq('organization_id', organizationId)
        .eq('theme', theme)
        .gte('created_at', sinceDate.toISOString())
        .limit(1);

      if (recentTheme?.length) {
        return {
          allowed: false,
          reason: `Theme ${theme} has minimum ${minDays} day interval between recommendations`,
        };
      }
    }

    return { allowed: true };
  }

  async processExpirations(organizationId?: string): Promise<number> {
    const supabase = this.databaseService.getAdminClient();
    const now = new Date().toISOString();

    let query = supabase
      .from('ai_recommendations')
      .select('id, parcel_id, organization_id, status, priority')
      .in('status', ['proposed', 'validated', 'waiting'])
      .lt('expires_at', now);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: expired, error } = await query;

    if (error) {
      this.logger.error(`Failed to query expired recommendations: ${error.message}`);
      return 0;
    }

    if (!expired?.length) return 0;

    let count = 0;
    for (const reco of expired) {
      try {
        await this.transitionStatus(
          reco.id,
          reco.organization_id,
          reco.status as RecommendationStatus,
          'expired',
          'ia',
          'Expired: intervention window passed',
        );
        count++;
      } catch (err) {
        this.logger.warn(
          `Failed to expire recommendation ${reco.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    this.logger.log(`Processed ${count} expired recommendations`);
    return count;
  }
}
