import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { DatabaseService } from '../database/database.service';
import { NotificationsService, MANAGEMENT_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';

export const AI_RECOMMENDATION_STATUSES = [
  'pending',
  'validated',
  'rejected',
  'executed',
  'expired',
] as const;

export type AiRecommendationStatus = (typeof AI_RECOMMENDATION_STATUSES)[number];

export interface AiRecommendationRecord {
  id: string;
  parcel_id: string;
  organization_id: string;
  calibration_id: string | null;
  status: AiRecommendationStatus;
  constat: string | null;
  diagnostic: string | null;
  action: string | null;
  conditions: string | null;
  suivi: string | null;
  crop_type: string | null;
  alert_code: string | null;
  priority: string | null;
  valid_from: string | null;
  valid_until: string | null;
  executed_at: string | null;
  execution_notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface RecommendationProductApplicationRecord {
  id: string;
  ai_recommendation_id: string | null;
  organization_id: string;
  farm_id: string | null;
  parcel_id: string | null;
  product_id: string | null;
  application_date: string | null;
  quantity_used: number | null;
  area_treated: number | null;
  cost: number | null;
  currency: string | null;
  notes: string | null;
  task_id: string | null;
  images: unknown;
  created_at: string | null;
  updated_at: string | null;
}

interface RecommendationExecutionParcelRecord {
  farm_id: string | null;
  area: number | string | null;
  calculated_area: number | string | null;
}

interface RecommendationExecutionProductRecord {
  id: string;
}

export interface AiRecommendationExecutionRecord extends AiRecommendationRecord {
  product_application: RecommendationProductApplicationRecord;
}

export interface AiRecommendationEvaluation {
  recommendation: AiRecommendationRecord;
  product_applications: RecommendationProductApplicationRecord[];
}

@Injectable()
export class AiRecommendationsService {
  private readonly logger = new Logger(AiRecommendationsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getRecommendations(
    parcelId: string,
    organizationId: string,
  ): Promise<AiRecommendationRecord[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch AI recommendations: ${error.message}`,
      );
    }

    return (data ?? []) as AiRecommendationRecord[];
  }

  async getRecommendation(
    id: string,
    organizationId: string,
  ): Promise<AiRecommendationRecord> {
    return this.findRecommendationOrThrow(id, organizationId);
  }

  async createRecommendation(
    data: CreateRecommendationDto,
    organizationId: string,
  ): Promise<AiRecommendationRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data: createdRecommendation, error } = await supabase
      .from('ai_recommendations')
      .insert({
        parcel_id: data.parcel_id,
        organization_id: organizationId,
        calibration_id: data.calibration_id ?? null,
        status: 'pending',
        constat: data.constat,
        diagnostic: data.diagnostic,
        action: data.action,
        conditions: data.conditions ?? null,
        suivi: data.suivi ?? null,
        crop_type: data.crop_type ?? null,
        alert_code: data.alert_code ?? null,
        priority: data.priority ?? null,
        valid_from: data.valid_from ?? null,
        valid_until: data.valid_until ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to create AI recommendation: ${error.message}`,
      );
    }

    // Notify management roles about new AI recommendation
    try {
      const actionPreview = data.action ? data.action.substring(0, 80) : 'New recommendation';
      await this.notificationsService.createNotificationsForRoles(
        organizationId,
        MANAGEMENT_ROLES,
        null, // AI is the actor — no user to exclude
        NotificationType.AI_RECOMMENDATION_CREATED,
        `🤖 AgromindIA: ${actionPreview}`,
        data.diagnostic || undefined,
        {
          recommendationId: createdRecommendation.id,
          parcelId: data.parcel_id,
          priority: data.priority,
          alertCode: data.alert_code,
        },
      );
    } catch (notifError) {
      this.logger.warn(`Failed to send AI recommendation notification: ${notifError}`);
    }

    return createdRecommendation as AiRecommendationRecord;
  }

  async validateRecommendation(
    id: string,
    organizationId: string,
  ): Promise<AiRecommendationRecord> {
    const recommendation = await this.findRecommendationOrThrow(id, organizationId);

    if (recommendation.status !== 'pending') {
      throw new BadRequestException(
        'Only pending recommendations can be validated',
      );
    }

    return this.updateRecommendationStatus(id, organizationId, {
      status: 'validated',
    });
  }

  async rejectRecommendation(
    id: string,
    organizationId: string,
  ): Promise<AiRecommendationRecord> {
    const recommendation = await this.findRecommendationOrThrow(id, organizationId);

    if (recommendation.status !== 'pending') {
      throw new BadRequestException(
        'Only pending recommendations can be rejected',
      );
    }

    return this.updateRecommendationStatus(id, organizationId, {
      status: 'rejected',
    });
  }

  async executeRecommendation(
    id: string,
    organizationId: string,
    notes?: string,
  ): Promise<AiRecommendationExecutionRecord> {
    const recommendation = await this.findRecommendationOrThrow(id, organizationId);

    if (recommendation.status !== 'validated') {
      throw new BadRequestException(
        'Only validated recommendations can be executed',
      );
    }

    const updatedRecommendation = await this.updateRecommendationStatus(id, organizationId, {
      status: 'executed',
      executed_at: new Date().toISOString(),
      execution_notes: notes ?? null,
    });

    const productApplication = await this.createProductApplicationForRecommendation(
      updatedRecommendation,
    );

    return {
      ...updatedRecommendation,
      product_application: productApplication,
    };
  }

  async getEvaluation(
    id: string,
    organizationId: string,
  ): Promise<AiRecommendationEvaluation> {
    const recommendation = await this.findRecommendationOrThrow(id, organizationId);
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('product_applications')
      .select('*')
      .eq('ai_recommendation_id', id)
      .eq('organization_id', organizationId)
      .order('application_date', { ascending: false });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch AI recommendation evaluation: ${error.message}`,
      );
    }

    return {
      recommendation,
      product_applications: (data ?? []) as RecommendationProductApplicationRecord[],
    };
  }

  private async findRecommendationOrThrow(
    id: string,
    organizationId: string,
  ): Promise<AiRecommendationRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch AI recommendation: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException('AI recommendation not found');
    }

    return data as AiRecommendationRecord;
  }

  private async updateRecommendationStatus(
    id: string,
    organizationId: string,
    payload: Partial<AiRecommendationRecord>,
  ): Promise<AiRecommendationRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('ai_recommendations')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to update AI recommendation: ${error.message}`,
      );
    }

    return data as AiRecommendationRecord;
  }

  private async createProductApplicationForRecommendation(
    recommendation: AiRecommendationRecord,
  ): Promise<RecommendationProductApplicationRecord> {
    const [parcel, product] = await Promise.all([
      this.findRecommendationParcelOrThrow(
        recommendation.parcel_id,
        recommendation.organization_id,
      ),
      this.findDefaultProductOrThrow(recommendation.organization_id),
    ]);

    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('product_applications')
      .insert({
        ai_recommendation_id: recommendation.id,
        organization_id: recommendation.organization_id,
        farm_id: parcel.farm_id,
        parcel_id: recommendation.parcel_id,
        product_id: product.id,
        application_date: new Date().toISOString(),
        quantity_used: 1,
        area_treated: this.resolveAreaTreated(parcel),
        cost: 0,
        currency: 'MAD',
        notes: recommendation.execution_notes ?? recommendation.action ?? null,
        task_id: null,
        images: null,
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to create product application: ${error.message}`,
      );
    }

    return data as RecommendationProductApplicationRecord;
  }

  private async findRecommendationParcelOrThrow(
    parcelId: string,
    organizationId: string,
  ): Promise<RecommendationExecutionParcelRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('parcels')
      .select('farm_id, area, calculated_area')
      .eq('id', parcelId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch parcel for recommendation execution: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException('Parcel not found for recommendation execution');
    }

    if (!data.farm_id) {
      throw new BadRequestException(
        'Recommendation parcel is missing a farm association',
      );
    }

    return data as RecommendationExecutionParcelRecord;
  }

  private async findDefaultProductOrThrow(
    organizationId: string,
  ): Promise<RecommendationExecutionProductRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('items')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch product for recommendation execution: ${error.message}`,
      );
    }

    if (!data) {
      throw new BadRequestException(
        'No active product available for recommendation execution',
      );
    }

    return data as RecommendationExecutionProductRecord;
  }

  private resolveAreaTreated(
    parcel: RecommendationExecutionParcelRecord,
  ): number {
    const candidates = [parcel.calculated_area, parcel.area];

    for (const candidate of candidates) {
      const value =
        typeof candidate === 'number' ? candidate : Number(candidate ?? Number.NaN);

      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    return 1;
  }
}
