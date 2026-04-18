import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";

/**
 * V2 parcel lifecycle states.
 *
 * awaiting_data → ready_calibration → calibrating → calibrated
 *   → awaiting_nutrition_option → active → archived
 *
 * Recalibration loop: active → calibrating → calibrated → awaiting_nutrition_option → active
 */
export type AiPhase =
  | "awaiting_data"
  | "ready_calibration"
  | "calibrating"
  | "calibrated"
  | "awaiting_nutrition_option"
  | "active"
  | "archived";

const VALID_TRANSITIONS: Record<AiPhase, AiPhase[]> = {
  awaiting_data: ["ready_calibration"],
  ready_calibration: ["calibrating", "awaiting_data"],
  calibrating: [
    "calibrated",
    "awaiting_data",       // failure recovery
    "ready_calibration",   // failure recovery
    "awaiting_nutrition_option", // auto-activate (recalibration)
    "active",              // auto-activate (recalibration, observation mode)
  ],
  calibrated: [
    "awaiting_nutrition_option",
    "calibrating",         // re-run calibration
    "awaiting_data",       // boundary change reset
  ],
  awaiting_nutrition_option: [
    "active",
    "calibrating",         // re-run calibration
    "awaiting_data",       // boundary change reset
  ],
  active: [
    "calibrating",         // recalibration loop
    "awaiting_nutrition_option", // nutrition option change
    "archived",
    "awaiting_data",       // boundary change reset
  ],
  archived: [],            // terminal state
};

@Injectable()
export class CalibrationStateMachine {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  async transitionPhase(
    parcelId: string,
    fromPhase: AiPhase,
    toPhase: AiPhase,
    organizationId: string,
  ): Promise<void> {
    const allowed = VALID_TRANSITIONS[fromPhase];
    if (!allowed || !allowed.includes(toPhase)) {
      throw new BadRequestException(
        `Invalid ai_phase transition: ${fromPhase} -> ${toPhase}`,
      );
    }

    const supabase = this.databaseService.getAdminClient();
    const query = supabase
      .from("parcels")
      .update({ ai_phase: toPhase })
      .eq("id", parcelId)
      .eq("organization_id", organizationId);

    if (fromPhase === "awaiting_data") {
      // Accept both NULL (old rows) and explicit 'awaiting_data' (new rows with DEFAULT)
      query.or("ai_phase.is.null,ai_phase.eq.awaiting_data");
    } else {
      query.eq("ai_phase", fromPhase);
    }

    const { data, error } = await query.select("id");

    if (error) {
      throw new BadRequestException(
        `Failed to transition ai_phase: ${error.message}`,
      );
    }

    if (!data?.length) {
      throw new BadRequestException(
        `ai_phase transition skipped: parcel is not in "${fromPhase}" (concurrent update or invalid state)`,
      );
    }

    this.gateway.emitToOrganization(organizationId, "calibration:phase-changed", {
      parcel_id: parcelId,
      from_phase: fromPhase,
      to_phase: toPhase,
    });
  }

  async resetToAwaitingDataOnBoundaryChange(
    parcelId: string,
    organizationId: string,
    currentPhase: AiPhase,
    previousBoundary: unknown,
    nextBoundary: unknown,
  ): Promise<boolean> {
    if (currentPhase === "awaiting_data") {
      return false;
    }

    if (!this.boundaryChanged(previousBoundary, nextBoundary)) {
      return false;
    }

    await this.transitionPhase(
      parcelId,
      currentPhase,
      "awaiting_data",
      organizationId,
    );
    return true;
  }

  /**
   * @deprecated Use resetToAwaitingDataOnBoundaryChange instead.
   * Kept for backward compatibility during migration.
   */
  async resetToDisabledOnBoundaryChange(
    parcelId: string,
    organizationId: string,
    currentPhase: AiPhase,
    previousBoundary: unknown,
    nextBoundary: unknown,
  ): Promise<boolean> {
    return this.resetToAwaitingDataOnBoundaryChange(
      parcelId,
      organizationId,
      currentPhase,
      previousBoundary,
      nextBoundary,
    );
  }

  private boundaryChanged(
    previousBoundary: unknown,
    nextBoundary: unknown,
  ): boolean {
    return JSON.stringify(previousBoundary) !== JSON.stringify(nextBoundary);
  }
}
