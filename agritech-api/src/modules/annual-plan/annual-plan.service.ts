import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { getCropReference } from '../calibration/crop-reference-loader';
/* eslint-disable @typescript-eslint/no-unused-vars */

export const ANNUAL_PLAN_STATUSES = [
  'draft',
  'validated',
  'active',
  'archived',
] as const;

export const PLAN_INTERVENTION_STATUSES = [
  'planned',
  'executed',
  'skipped',
  'delayed',
] as const;

export type AnnualPlanStatus = (typeof ANNUAL_PLAN_STATUSES)[number];
export type PlanInterventionStatus =
  (typeof PLAN_INTERVENTION_STATUSES)[number];

export interface AnnualPlanRecord {
  id: string;
  parcel_id: string;
  organization_id: string;
  calibration_id: string | null;
  season: string;
  status: AnnualPlanStatus;
  crop_type: string;
  variety: string | null;
  plan_data: Record<string, unknown> | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PlanInterventionRecord {
  id: string;
  annual_plan_id: string;
  parcel_id: string;
  organization_id: string;
  month: number;
  week: number | null;
  intervention_type: string;
  description: string;
  product: string | null;
  dose: string | null;
  unit: string | null;
  status: PlanInterventionStatus;
  executed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AnnualPlanWithInterventions extends AnnualPlanRecord {
  interventions: PlanInterventionRecord[];
}

export interface AnnualPlanSummary {
  plan_id: string;
  parcel_id: string;
  season: string;
  status: AnnualPlanStatus;
  total_interventions: number;
  executed: number;
  planned: number;
  skipped: number;
}

export interface AnnualPlanCalendarMonth {
  month: number;
  label: string;
  interventions: PlanInterventionRecord[];
}

export interface AnnualPlanCalendar {
  plan_id: string;
  parcel_id: string;
  season: string;
  status: AnnualPlanStatus;
  months: AnnualPlanCalendarMonth[];
}

interface ParcelPlanSource {
  id: string;
  crop_type: string | null;
  variety: string | null;
  ai_calibration_id: string | null;
}

interface CropReferenceRow {
  reference_data: Record<string, unknown>;
}

interface PlanAnnualReference {
  calendrier_type_intensif?: Record<string, unknown>;
  calendrier_type?: Record<string, unknown>;
  calendrier?: Record<string, unknown>;
  [key: string]: unknown;
}

type MonthlyPlanValue = string | number | boolean | null;

interface MonthlyPlanDefinition {
  month: number;
  month_key: string;
  label: string;
  components: Record<string, MonthlyPlanValue>;
}

/** AI prompt month keys differ from template keys (aou vs aout, sep vs sept, etc.) */
const AI_MONTH_KEY_TO_NUMBER: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  avr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  aou: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

interface AIInterventionJson {
  id?: string;
  type?: string;
  category?: string;
  month?: string;
  week?: number | null;
  stageBBCH?: string;
  product?: string;
  dose?: number | string | null;
  doseUnit?: string;
  nutrientContent?: Record<string, unknown>;
  applicationMethod?: string;
  applicationConditions?: string;
  priority?: string;
  status?: string;
  notes?: string;
}

const MONTH_KEY_TO_NUMBER: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  avr: 4,
  mai: 5,
  juin: 6,
  juil: 7,
  aout: 8,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const MONTH_NUMBER_TO_LABEL: Record<number, string> = {
  1: 'Janvier',
  2: 'Fevrier',
  3: 'Mars',
  4: 'Avril',
  5: 'Mai',
  6: 'Juin',
  7: 'Juillet',
  8: 'Aout',
  9: 'Septembre',
  10: 'Octobre',
  11: 'Novembre',
  12: 'Decembre',
};

@Injectable()
export class AnnualPlanService {
  private readonly logger = new Logger(AnnualPlanService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Ensures that an annual plan exists for the given parcel, organization, and year.
   * If there is no existing plan for the specified parameters, a new draft plan is generated.
   * If a plan already exists, returns it along with its interventions.
   *
   * @param parcelId - The ID of the parcel for which to ensure the annual plan.
   * @param organizationId - The ID of the organization owning the parcel.
   * @param year - The year of the annual plan (defaults to current UTC year).
   * @returns The annual plan with its interventions.
   */
  async ensurePlan(
    parcelId: string,
    organizationId: string,
    season?: string,
  ): Promise<AnnualPlanWithInterventions> {
    const effectiveSeason = season ?? String(new Date().getUTCFullYear());
    const existingPlan = await this.findPlanByParcelAndYear(
      parcelId,
      organizationId,
      effectiveSeason,
    );

    if (!existingPlan) {
      return this.generatePlan(parcelId, organizationId, effectiveSeason);
    }

    const interventions = await this.findPlanInterventions(
      existingPlan.id,
      organizationId,
    );

    return {
      ...existingPlan,
      interventions,
    };
  }

  /**
   * Generates a new annual plan and its associated interventions for a given parcel, organization, and year.
   *
   * Source of Truth:
   * The plan is generated primarily from the crop reference data ("plan_annuel") linked to the parcel's crop type.
   * This reference is considered the "source of truth" for defining monthly program structure, interventions, and best practices.
   * The actual source data is fetched via `findCropReferenceOrThrow`, resulting in a referential model (not user-edited),
   * which is then transposed to a new annual plan for the designated parcel/year.
   * The resulting plan references this source in its `plan_data.source` field, and the monthly structure reflects the referential design.
   * After plan creation, per-month interventions are initialized according to these reference definitions.
   *
   * This method will:
   * - Retrieve the parcel and its crop reference data, throwing an error if not found.
   * - Use crop reference data to extract the monthly plan definitions that specify interventions/components for each month,
   *   directly reflecting the referential (source of truth) structure.
   * - Insert a new draft annual plan record in the `annual_plans` table, including linked plan data, year, and metadata,
   *   recording its referential origin.
   * - Insert one `plan_interventions` record per month (according to the extracted calendar), linked to the newly created plan.
   * - Return the created plan and its (sorted) interventions.
   *
   * @param parcelId - The ID of the parcel for which to generate the annual plan.
   * @param organizationId - The ID of the organization associated with the parcel.
   * @param year - (Optional) Target year for the plan. Defaults to the current UTC year if not provided.
   * @returns The created annual plan record with its list of interventions, both structured from crop reference (referential) data.
   * @throws NotFoundException or BadRequestException if operations fail at any step (parcel not found, reference data missing, DB errors, etc.)
   */
  async generatePlan(
    parcelId: string,
    organizationId: string,
    season?: string,
  ): Promise<AnnualPlanWithInterventions> {
    const effectiveSeason = season ?? String(new Date().getUTCFullYear());
    const parcel = await this.findParcelOrThrow(parcelId, organizationId);
    const referenceData = await this.findCropReferenceOrThrow(parcel.crop_type);
    const monthlyDefinitions = this.extractMonthlyDefinitions(referenceData);
    const supabase = this.databaseService.getAdminClient();

    const { data: createdPlan, error: planError } = await supabase
      .from('annual_plans')
      .insert({
        parcel_id: parcelId,
        organization_id: organizationId,
        calibration_id: parcel.ai_calibration_id,
        season: effectiveSeason,
        status: 'draft',
        crop_type: parcel.crop_type,
        variety: parcel.variety,
        plan_data: {
          source: 'plan_annuel', // References the referential source for traceability
          generated_at: new Date().toISOString(),
          months: monthlyDefinitions.map((definition) => ({
            month: definition.month,
            month_key: definition.month_key,
            label: definition.label,
            components: definition.components,
          })),
        },
      })
      .select('*')
      .single();

    if (planError) {
      throw new BadRequestException(
        `Failed to create annual plan: ${planError.message}`,
      );
    }

    const interventionRows = monthlyDefinitions.map((definition) =>
      this.buildInterventionInsertRow(createdPlan.id, parcelId, organizationId, definition),
    );

    const { data: createdInterventions, error: interventionsError } = await supabase
      .from('plan_interventions')
      .insert(interventionRows)
      .select('*');

    if (interventionsError) {
      throw new BadRequestException(
        `Failed to create annual plan interventions: ${interventionsError.message}`,
      );
    }

    return {
      ...(createdPlan as AnnualPlanRecord),
      interventions: this.sortInterventions(
        (createdInterventions ?? []) as PlanInterventionRecord[],
      ),
    };
  }

  async getPlan(
    parcelId: string,
    organizationId: string,
  ): Promise<AnnualPlanWithInterventions> {
    const plan = await this.findLatestPlanOrThrow(parcelId, organizationId);
    const interventions = await this.findPlanInterventions(plan.id, organizationId);

    return {
      ...plan,
      interventions,
    };
  }

  async getPlanOrNull(
    parcelId: string,
    organizationId: string,
  ): Promise<AnnualPlanWithInterventions | null> {
    const plan = await this.findLatestPlan(parcelId, organizationId);

    if (!plan) {
      return null;
    }

    const interventions = await this.findPlanInterventions(plan.id, organizationId);

    return {
      ...plan,
      interventions,
    };
  }

  /**
   * Latest Agromind-approved annual plan (validated or active). Draft plans are excluded —
   * they are not an official calendar until the user validates them in the app.
   */
  async getValidatedPlanOrNull(
    parcelId: string,
    organizationId: string,
  ): Promise<AnnualPlanWithInterventions | null> {
    const { data, error } = await this.databaseService
      .getAdminClient()
      .from('annual_plans')
      .select('*')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .in('status', ['validated', 'active'])
      .order('season', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch validated annual plan: ${error.message}`,
      );
    }

    if (!data) {
      return null;
    }

    const plan = data as AnnualPlanRecord;
    const interventions = await this.findPlanInterventions(plan.id, organizationId);

    return {
      ...plan,
      interventions,
    };
  }

  async getCalendar(
    parcelId: string,
    organizationId: string,
  ): Promise<AnnualPlanCalendar> {
    const plan = await this.getPlan(parcelId, organizationId);
    const groupedInterventions = new Map<number, PlanInterventionRecord[]>();

    for (const intervention of plan.interventions) {
      const current = groupedInterventions.get(intervention.month) ?? [];
      current.push(intervention);
      groupedInterventions.set(intervention.month, current);
    }

    return {
      plan_id: plan.id,
      parcel_id: plan.parcel_id,
      season: plan.season,
      status: plan.status,
      months: Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        return {
          month,
          label: MONTH_NUMBER_TO_LABEL[month],
          interventions: this.sortInterventions(
            groupedInterventions.get(month) ?? [],
          ),
        };
      }),
    };
  }

  async getSummary(
    parcelId: string,
    organizationId: string,
  ): Promise<AnnualPlanSummary> {
    const plan = await this.getPlan(parcelId, organizationId);
    const interventions = plan.interventions;

    return {
      plan_id: plan.id,
      parcel_id: plan.parcel_id,
      season: plan.season,
      status: plan.status,
      total_interventions: interventions.length,
      executed: interventions.filter((item) => item.status === 'executed').length,
      planned: interventions.filter((item) => item.status === 'planned').length,
      skipped: interventions.filter((item) => item.status === 'skipped').length,
    };
  }

  async validatePlan(
    planId: string,
    organizationId: string,
  ): Promise<AnnualPlanRecord> {
    const plan = await this.findPlanByIdOrThrow(planId, organizationId);

    if (plan.status !== 'draft') {
      throw new BadRequestException('Only draft annual plans can be validated');
    }

    const { data, error } = await this.databaseService
      .getAdminClient()
      .from('annual_plans')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to validate annual plan: ${error.message}`,
      );
    }

    const record = data as AnnualPlanRecord;
    const interventions = await this.findPlanInterventions(
      record.id,
      organizationId,
    );
    await this.syncWorkforceTasksFromPlan(
      { ...record, interventions },
      record.parcel_id,
      organizationId,
    );

    return record;
  }

  /**
   * Inserts `tasks` rows for plan interventions that are not already linked
   * (metadata.annual_plan_intervention_id). Used after calibration activation
   * and when the farmer confirms the season calendar (validate).
   */
  async syncWorkforceTasksFromPlan(
    annualPlan: AnnualPlanWithInterventions,
    parcelId: string,
    organizationId: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    if (annualPlan.interventions.length === 0) {
      this.logger.log(
        `Annual plan ${annualPlan.id} has no interventions to sync as workforce tasks`,
      );
      return;
    }

    const { data: parcel } = await supabase
      .from('parcels')
      .select('farm_id')
      .eq('id', parcelId)
      .single();

    if (!parcel?.farm_id) {
      this.logger.warn(
        `Cannot sync annual plan tasks: parcel ${parcelId} has no farm_id`,
      );
      return;
    }

    const { data: existingTasks, error: existingTasksError } = await supabase
      .from('tasks')
      .select('id, metadata')
      .eq('organization_id', organizationId)
      .eq('parcel_id', parcelId);

    if (existingTasksError) {
      this.logger.warn(
        `Failed to load existing annual plan tasks for parcel ${parcelId}: ${existingTasksError.message}`,
      );
      return;
    }

    const existingInterventionIds = new Set(
      ((existingTasks ?? []) as Array<{ metadata?: unknown }>)
        .map((task) => {
          const meta = this.asRecord(task.metadata);
          const id = meta.annual_plan_intervention_id;
          return typeof id === 'string' ? id : null;
        })
        .filter((value): value is string => value !== null),
    );

    const taskRows = annualPlan.interventions
      .filter((intervention) => !existingInterventionIds.has(intervention.id))
      .map((intervention) => {
        const title = this.formatAnnualPlanTaskTitle(intervention);

        return {
          farm_id: parcel.farm_id,
          parcel_id: parcelId,
          organization_id: organizationId,
          title,
          description: this.formatAnnualPlanTaskDescription(intervention),
          task_type: this.mapAnnualPlanInterventionToTaskType(intervention),
          priority: this.mapAnnualPlanInterventionPriority(intervention),
          status: 'pending',
          due_date: this.buildAnnualPlanTaskDueDate(
            annualPlan.season,
            intervention.month,
            intervention.week,
          ),
          metadata: {
            source: 'annual_plan',
            annual_plan_id: annualPlan.id,
            annual_plan_intervention_id: intervention.id,
            plan_season: annualPlan.season,
            month: intervention.month,
            week: intervention.week,
            intervention_type: intervention.intervention_type,
            product: intervention.product,
            dose: intervention.dose,
            unit: intervention.unit,
          },
        };
      })
      .filter((row) => row.title.length > 0);

    if (taskRows.length === 0) {
      return;
    }

    const { error: insertError } = await supabase.from('tasks').insert(taskRows);

    if (insertError) {
      this.logger.warn(
        `Failed to create tasks from annual plan for parcel ${parcelId}: ${insertError.message}`,
      );
      return;
    }

    this.logger.log(
      `Created ${taskRows.length} workforce task(s) from annual plan ${annualPlan.id} for parcel ${parcelId}`,
    );
  }

  async getInterventions(
    parcelId: string,
    organizationId: string,
  ): Promise<PlanInterventionRecord[]> {
    const plan = await this.findLatestPlan(parcelId, organizationId);

    if (!plan) {
      return [];
    }

    return this.findPlanInterventions(plan.id, organizationId);
  }

  async executeIntervention(
    interventionId: string,
    organizationId: string,
  ): Promise<PlanInterventionRecord> {
    await this.findInterventionOrThrow(interventionId, organizationId);

    const { data, error } = await this.databaseService
      .getAdminClient()
      .from('plan_interventions')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString(),
      })
      .eq('id', interventionId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to execute intervention: ${error.message}`,
      );
    }

    return data as PlanInterventionRecord;
  }

  async regeneratePlan(
    parcelId: string,
    organizationId: string,
    season?: string | number,
  ): Promise<AnnualPlanWithInterventions> {
    const effectiveSeason = String(season ?? new Date().getUTCFullYear());
    const existingPlan = await this.findPlanByParcelAndYear(
      parcelId,
      organizationId,
      effectiveSeason,
    );

    if (existingPlan && existingPlan.status !== 'draft') {
      throw new BadRequestException(
        'Only draft annual plans can be regenerated for the selected year',
      );
    }

    if (existingPlan) {
      const supabase = this.databaseService.getAdminClient();
      const { error: interventionsDeleteError } = await supabase
        .from('plan_interventions')
        .delete()
        .eq('annual_plan_id', existingPlan.id)
        .eq('organization_id', organizationId);

      if (interventionsDeleteError) {
        throw new BadRequestException(
          `Failed to delete annual plan interventions: ${interventionsDeleteError.message}`,
        );
      }

      const { error: planDeleteError } = await supabase
        .from('annual_plans')
        .delete()
        .eq('id', existingPlan.id)
        .eq('organization_id', organizationId);

      if (planDeleteError) {
        throw new BadRequestException(
          `Failed to delete annual plan: ${planDeleteError.message}`,
        );
      }
    }

    const templatePlan = await this.generatePlan(parcelId, organizationId, effectiveSeason);

    // Try to enrich from the latest AI annual plan report
    const aiSections = await this.findLatestAIPlanSections(parcelId);
    if (aiSections) {
      try {
        return await this.enrichPlanFromAI(
          templatePlan.id,
          parcelId,
          organizationId,
          aiSections,
        );
      } catch (error) {
        this.logger.warn(
          `AI enrichment after regeneration failed for parcel ${parcelId}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }

    return templatePlan;
  }

  /**
   * Finds the latest AI annual_plan report sections from parcel_reports.
   */
  private async findLatestAIPlanSections(
    parcelId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.databaseService
      .getAdminClient()
      .from('parcel_reports')
      .select('metadata')
      .eq('parcel_id', parcelId)
      .eq('status', 'completed')
      .order('generated_at', { ascending: false })
      .limit(10);

    if (error || !data) {
      return null;
    }

    // Find the most recent annual_plan report
    for (const row of data) {
      const meta = this.asRecord(row.metadata);
      if (meta.report_type === 'annual_plan' && this.isRecord(meta.sections)) {
        return meta.sections as Record<string, unknown>;
      }
    }

    return null;
  }

  /**
   * Replaces template plan_interventions with AI-generated ones that carry
   * real doses, products, BBCH stages, and application details.
   * Also updates annual_plans.plan_data with AI aggregate data.
   * Only enriches draft plans — validated/active plans are left untouched.
   */
  async enrichPlanFromAI(
    annualPlanId: string,
    parcelId: string,
    organizationId: string,
    aiPlanJson: Record<string, unknown>,
  ): Promise<AnnualPlanWithInterventions> {
    const supabase = this.databaseService.getAdminClient();

    const plan = await this.findPlanByIdOrThrow(annualPlanId, organizationId);

    if (plan.status !== 'draft') {
      this.logger.log(
        `Skipping AI enrichment for plan ${annualPlanId}: status is "${plan.status}", not draft`,
      );
      const interventions = await this.findPlanInterventions(annualPlanId, organizationId);
      return { ...plan, interventions };
    }

    const rawInterventions = aiPlanJson.interventions;
    if (!Array.isArray(rawInterventions) || rawInterventions.length === 0) {
      this.logger.warn(
        `AI plan JSON has no interventions array for plan ${annualPlanId}, keeping template`,
      );
      const interventions = await this.findPlanInterventions(annualPlanId, organizationId);
      return { ...plan, interventions };
    }

    // Delete existing template interventions
    const { error: deleteError } = await supabase
      .from('plan_interventions')
      .delete()
      .eq('annual_plan_id', annualPlanId)
      .eq('organization_id', organizationId);

    if (deleteError) {
      throw new BadRequestException(
        `Failed to delete template interventions for AI enrichment: ${deleteError.message}`,
      );
    }

    // Map AI interventions to insert rows
    const insertRows = rawInterventions
      .filter((item): item is AIInterventionJson => this.isRecord(item))
      .map((aiIntervention) =>
        this.buildAIInterventionRow(annualPlanId, parcelId, organizationId, aiIntervention),
      )
      .filter((row) => row !== null);

    if (insertRows.length === 0) {
      this.logger.warn(
        `No valid AI interventions parsed for plan ${annualPlanId}, regenerating template`,
      );
      const templatePlan = await this.generatePlan(parcelId, organizationId, plan.season);
      return templatePlan;
    }

    const { data: createdInterventions, error: insertError } = await supabase
      .from('plan_interventions')
      .insert(insertRows)
      .select('*');

    if (insertError) {
      throw new BadRequestException(
        `Failed to insert AI interventions: ${insertError.message}`,
      );
    }

    // Update plan_data with AI aggregate data
    const { error: updateError } = await supabase
      .from('annual_plans')
      .update({
        plan_data: {
          source: 'ai',
          generated_at: typeof aiPlanJson.generationDate === 'string'
            ? aiPlanJson.generationDate
            : new Date().toISOString(),
          ai_version: aiPlanJson.version ?? null,
          parameters: this.isRecord(aiPlanJson.parameters) ? aiPlanJson.parameters : null,
          annualDoses: this.isRecord(aiPlanJson.annualDoses) ? aiPlanJson.annualDoses : null,
          irrigation: this.isRecord(aiPlanJson.irrigation) ? aiPlanJson.irrigation : null,
          pruning: this.isRecord(aiPlanJson.pruning) ? aiPlanJson.pruning : null,
          harvestForecast: this.isRecord(aiPlanJson.harvestForecast) ? aiPlanJson.harvestForecast : null,
          economicEstimate: this.isRecord(aiPlanJson.economicEstimate) ? aiPlanJson.economicEstimate : null,
          planSummary: typeof aiPlanJson.planSummary === 'string' ? aiPlanJson.planSummary : null,
        },
      })
      .eq('id', annualPlanId)
      .eq('organization_id', organizationId);

    if (updateError) {
      this.logger.warn(
        `Failed to update plan_data with AI aggregate: ${updateError.message}`,
      );
    }

    this.logger.log(
      `Enriched plan ${annualPlanId} with ${insertRows.length} AI interventions (replaced template)`,
    );

    return {
      ...plan,
      plan_data: {
        source: 'ai',
        generated_at: new Date().toISOString(),
      },
      interventions: this.sortInterventions(
        (createdInterventions ?? []) as PlanInterventionRecord[],
      ),
    };
  }

  private buildAIInterventionRow(
    annualPlanId: string,
    parcelId: string,
    organizationId: string,
    ai: AIInterventionJson,
  ): Omit<PlanInterventionRecord, 'id' | 'created_at' | 'updated_at'> | null {
    const monthKey = typeof ai.month === 'string' ? ai.month.toLowerCase() : '';
    const month = AI_MONTH_KEY_TO_NUMBER[monthKey];

    if (!month) {
      this.logger.warn(`Skipping AI intervention with unrecognized month: "${ai.month}"`);
      return null;
    }

    const product = typeof ai.product === 'string' ? ai.product : null;
    const dose = ai.dose != null ? String(ai.dose) : null;
    const unit = typeof ai.doseUnit === 'string' ? ai.doseUnit : null;
    const interventionType = typeof ai.type === 'string' ? ai.type : 'unknown';
    const week = typeof ai.week === 'number' && ai.week >= 1 && ai.week <= 4 ? ai.week : null;

    const descParts = [
      product,
      dose && unit ? `${dose} ${unit}` : null,
      typeof ai.applicationMethod === 'string' ? `(${ai.applicationMethod})` : null,
      typeof ai.stageBBCH === 'string' ? `BBCH ${ai.stageBBCH}` : null,
    ].filter((p): p is string => p !== null);

    const description = descParts.length > 0
      ? descParts.join(' — ')
      : `${MONTH_NUMBER_TO_LABEL[month] ?? ''}: ${interventionType}`;

    // Store the full AI object in notes for frontend parsing
    const notesPayload: Record<string, unknown> = { ...ai };
    delete notesPayload.id; // avoid confusion with DB id

    return {
      annual_plan_id: annualPlanId,
      parcel_id: parcelId,
      organization_id: organizationId,
      month,
      week,
      intervention_type: interventionType,
      description,
      product,
      dose,
      unit,
      status: 'planned',
      executed_at: null,
      notes: JSON.stringify(notesPayload),
    };
  }

  private async findParcelOrThrow(
    parcelId: string,
    organizationId: string,
  ): Promise<ParcelPlanSource> {
    const { data, error } = await this.databaseService
      .getAdminClient()
      .from('parcels')
      .select('id, crop_type, variety, ai_calibration_id')
      .eq('id', parcelId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch parcel: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Parcel not found');
    }

    const parcel = data as ParcelPlanSource;

    if (!parcel.crop_type) {
      throw new BadRequestException('Parcel crop type is required to generate an annual plan');
    }

    return parcel;
  }

  private async findCropReferenceOrThrow(
    cropType: string,
  ): Promise<Record<string, unknown>> {
    // Source-of-truth is now local JSON files under agritech-api/referentials/
    // (e.g. DATA_OLIVIER.json). The loader falls back to the crop_ai_references
    // DB table if no file is found — so callers see a file-first, DB-fallback
    // lookup without caring about the source.
    const supabaseAdmin = this.databaseService.getAdminClient();
    const normalized = this.normalizeCropType(cropType);

    const reference = await getCropReference(normalized, supabaseAdmin);

    if (!reference) {
      throw new BadRequestException(
        `Référentiel agronomique non trouvé pour la culture "${cropType}". ` +
          `Vérifiez le fichier agritech-api/referentials/DATA_${normalized.toUpperCase()}.json ` +
          `ou publiez-le depuis l'application d'administration.`,
      );
    }

    return reference;
  }

  /**
   * Map parcel crop_type values to the referential file key.
   * Files are named DATA_<KEY>.json (loader lowercases the key internally).
   * Common aliases are normalized so a parcel stored as "Olive" / "olives"
   * still resolves to DATA_OLIVIER.json.
   */
  private normalizeCropType(cropType: string): string {
    const trimmed = (cropType || '').trim().toLowerCase();
    const aliases: Record<string, string> = {
      olive: 'olivier',
      olives: 'olivier',
      olivier: 'olivier',
      oliviers: 'olivier',
      avocat: 'avocatier',
      avocats: 'avocatier',
      avocatier: 'avocatier',
      avocatiers: 'avocatier',
      agrume: 'agrumes',
      agrumes: 'agrumes',
      citrus: 'agrumes',
      palmier: 'palmier_dattier',
      dattier: 'palmier_dattier',
      'palmier-dattier': 'palmier_dattier',
      'palmier dattier': 'palmier_dattier',
      palmier_dattier: 'palmier_dattier',
    };
    return aliases[trimmed] ?? trimmed;
  }

  private async findLatestPlan(
    parcelId: string,
    organizationId: string,
  ): Promise<AnnualPlanRecord | null> {
    const { data, error } = await this.databaseService
      .getAdminClient()
      .from('annual_plans')
      .select('*')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .order('season', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch annual plan: ${error.message}`,
      );
    }

    return (data as AnnualPlanRecord | null) ?? null;
  }

  private async findLatestPlanOrThrow(
    parcelId: string,
    organizationId: string,
  ): Promise<AnnualPlanRecord> {
    const plan = await this.findLatestPlan(parcelId, organizationId);

    if (!plan) {
      throw new NotFoundException('Annual plan not found for parcel');
    }

    return plan;
  }

  private async findPlanByIdOrThrow(
    planId: string,
    organizationId: string,
  ): Promise<AnnualPlanRecord> {
    const { data, error } = await this.databaseService
      .getAdminClient()
      .from('annual_plans')
      .select('*')
      .eq('id', planId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch annual plan: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException('Annual plan not found');
    }

    return data as AnnualPlanRecord;
  }

  private async findPlanByParcelAndYear(
    parcelId: string,
    organizationId: string,
    season: string,
  ): Promise<AnnualPlanRecord | null> {
    const { data, error } = await this.databaseService
      .getAdminClient()
      .from('annual_plans')
      .select('*')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('season', season)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch annual plan for regeneration: ${error.message}`,
      );
    }

    return (data as AnnualPlanRecord | null) ?? null;
  }

  private async findPlanInterventions(
    planId: string,
    organizationId: string,
  ): Promise<PlanInterventionRecord[]> {
    const { data, error } = await this.databaseService
      .getAdminClient()
      .from('plan_interventions')
      .select('*')
      .eq('annual_plan_id', planId)
      .eq('organization_id', organizationId)
      .order('month', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch plan interventions: ${error.message}`,
      );
    }

    return this.sortInterventions((data ?? []) as PlanInterventionRecord[]);
  }

  private async findInterventionOrThrow(
    interventionId: string,
    organizationId: string,
  ): Promise<PlanInterventionRecord> {
    const { data, error } = await this.databaseService
      .getAdminClient()
      .from('plan_interventions')
      .select('*')
      .eq('id', interventionId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch intervention: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException('Plan intervention not found');
    }

    return data as PlanInterventionRecord;
  }

  private extractMonthlyDefinitions(
    referenceData: Record<string, unknown>,
  ): MonthlyPlanDefinition[] {
    const rawPlanAnnual = referenceData.plan_annuel;

    if (!this.isRecord(rawPlanAnnual)) {
      throw new NotFoundException('plan_annuel is missing from crop reference data');
    }

    const monthlyCalendar = this.resolveMonthlyCalendar(rawPlanAnnual);

    return Object.entries(MONTH_KEY_TO_NUMBER).map(([monthKey, month]) => {
      const rawMonth = monthlyCalendar[monthKey];
      const components = this.extractMonthComponents(rawMonth);

      return {
        month,
        month_key: monthKey,
        label: MONTH_NUMBER_TO_LABEL[month],
        components,
      };
    });
  }

  private resolveMonthlyCalendar(
    planAnnual: PlanAnnualReference,
  ): Record<string, unknown> {
    const candidateKeys = [
      'calendrier_type_intensif',
      'calendrier_type',
      'calendrier',
    ];

    for (const candidateKey of candidateKeys) {
      const candidate = planAnnual[candidateKey];
      if (this.hasMonthKeys(candidate)) {
        return candidate;
      }
    }

    if (this.hasMonthKeys(planAnnual)) {
      return planAnnual;
    }

    throw new NotFoundException('No monthly annual plan calendar found in crop reference data');
  }

  private extractMonthComponents(rawMonth: unknown): Record<string, MonthlyPlanValue> {
    if (!this.isRecord(rawMonth)) {
      return {};
    }

    return Object.entries(rawMonth).reduce<Record<string, MonthlyPlanValue>>(
      (accumulator, [key, value]) => {
        if (value === null || value === undefined || value === '') {
          return accumulator;
        }

        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          accumulator[key] = value;
        }

        return accumulator;
      },
      {},
    );
  }

  private buildInterventionInsertRow(
    annualPlanId: string,
    parcelId: string,
    organizationId: string,
    definition: MonthlyPlanDefinition,
  ): Omit<PlanInterventionRecord, 'id' | 'created_at' | 'updated_at' | 'executed_at'> & {
    executed_at: null;
  } {
    const componentEntries = Object.entries(definition.components);
    const componentKeys = componentEntries.map(([key]) => key);
    const componentValues = componentEntries.map(([, value]) => String(value));
    const description =
      componentEntries.length === 0
        ? `${definition.label}: no scheduled interventions from reference calendar.`
        : `${definition.label}: ${componentEntries
            .map(([key, value]) => `${key}=${String(value)}`)
            .join('; ')}`;

    return {
      annual_plan_id: annualPlanId,
      parcel_id: parcelId,
      organization_id: organizationId,
      month: definition.month,
      week: null,
      intervention_type:
        componentKeys.length === 0 ? 'monthly_monitoring' : componentKeys.join('+'),
      description,
      product: componentValues.length === 0 ? null : componentValues.join(', '),
      dose: null,
      unit: null,
      status: 'planned',
      executed_at: null,
      notes: JSON.stringify(definition.components),
    };
  }

  private formatAnnualPlanTaskTitle(intervention: PlanInterventionRecord): string {
    const interventionLabel = intervention.intervention_type
      .split('+')
      .map((part) => part.replace(/_/g, ' ').trim())
      .filter((part) => part.length > 0)
      .join(' / ');

    return interventionLabel.length > 0
      ? interventionLabel
      : `Intervention mois ${intervention.month}`;
  }

  private formatAnnualPlanTaskDescription(
    intervention: PlanInterventionRecord,
  ): string | null {
    const details = [
      intervention.description,
      intervention.product ? `Produit: ${intervention.product}` : null,
      intervention.dose ? `Dose: ${intervention.dose}` : null,
      intervention.unit ? `Unite: ${intervention.unit}` : null,
      intervention.notes ? `Reference: ${intervention.notes}` : null,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);

    return details.length > 0 ? details.join(' | ') : null;
  }

  private mapAnnualPlanInterventionToTaskType(
    intervention: PlanInterventionRecord,
  ): string {
    const normalized = `${intervention.intervention_type} ${intervention.description}`.toLowerCase();

    if (normalized.includes('irrig')) {
      return 'irrigation';
    }
    if (
      normalized.includes('ferti') ||
      normalized.includes('nutrition') ||
      normalized.includes('amend')
    ) {
      return 'fertilization';
    }
    if (normalized.includes('taille') || normalized.includes('prun')) {
      return 'pruning';
    }
    if (
      normalized.includes('phyto') ||
      normalized.includes('ravage') ||
      normalized.includes('pest') ||
      normalized.includes('maladie')
    ) {
      return 'pest_control';
    }
    if (
      normalized.includes('sol') ||
      normalized.includes('labour') ||
      normalized.includes('preparation')
    ) {
      return 'soil_preparation';
    }
    if (normalized.includes('recolte') || normalized.includes('harvest')) {
      return 'harvesting';
    }

    return 'maintenance';
  }

  private mapAnnualPlanInterventionPriority(
    intervention: PlanInterventionRecord,
  ): 'low' | 'medium' | 'high' | 'urgent' {
    const normalized = `${intervention.intervention_type} ${intervention.description}`.toLowerCase();

    if (
      normalized.includes('stress') ||
      normalized.includes('urgent') ||
      normalized.includes('maladie') ||
      normalized.includes('irrig')
    ) {
      return 'high';
    }

    return 'medium';
  }

  private buildAnnualPlanTaskDueDate(
    seasonOrYear: string | number,
    month: number,
    week: number | null,
  ): string | null {
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return null;
    }

    const year = typeof seasonOrYear === 'number'
      ? seasonOrYear
      : parseInt(String(seasonOrYear).slice(0, 4), 10) || new Date().getUTCFullYear();
    const day = week && week > 0 ? Math.min(28, week * 7) : 1;
    return new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0];
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return this.isRecord(value) ? value : {};
  }

  private sortInterventions(
    interventions: PlanInterventionRecord[],
  ): PlanInterventionRecord[] {
    return [...interventions].sort((left, right) => {
      if (left.month !== right.month) {
        return left.month - right.month;
      }

      return left.description.localeCompare(right.description);
    });
  }

  private hasMonthKeys(value: unknown): value is Record<string, unknown> {
    if (!this.isRecord(value)) {
      return false;
    }

    return Object.keys(MONTH_KEY_TO_NUMBER).every((monthKey) => monthKey in value);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
}
