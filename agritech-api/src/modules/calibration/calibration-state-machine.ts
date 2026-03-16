import { BadRequestException, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export type AiPhase =
  | "disabled"
  | "downloading"
  | "pret_calibrage"
  | "calibrating"
  | "awaiting_validation"
  | "awaiting_nutrition_option"
  | "active"
  | "paused";

const VALID_TRANSITIONS: Record<AiPhase, AiPhase[]> = {
  disabled: ["downloading", "calibrating"],
  downloading: ["pret_calibrage", "disabled"],
  pret_calibrage: ["calibrating", "disabled"],
  calibrating: ["awaiting_validation", "disabled"],
  awaiting_validation: [
    "awaiting_nutrition_option",
    "active",
    "calibrating",
    "disabled",
  ],
  awaiting_nutrition_option: ["active", "calibrating", "disabled"],
  active: ["awaiting_nutrition_option", "calibrating", "disabled"],
  paused: ["disabled"],
};

@Injectable()
export class CalibrationStateMachine {
  constructor(private readonly databaseService: DatabaseService) {}

  async transitionPhase(
    parcelId: string,
    fromPhase: AiPhase,
    toPhase: AiPhase,
    organizationId: string,
  ): Promise<void> {
    const canResetToDisabled = toPhase === "disabled";
    const allowed = VALID_TRANSITIONS[fromPhase] ?? [];
    if (!canResetToDisabled && !allowed.includes(toPhase)) {
      throw new BadRequestException(
        `Invalid ai_phase transition: ${fromPhase} -> ${toPhase}`,
      );
    }

    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase
      .from("parcels")
      .update({ ai_phase: toPhase })
      .eq("id", parcelId)
      .eq("organization_id", organizationId);

    if (error) {
      throw new BadRequestException(
        `Failed to transition ai_phase: ${error.message}`,
      );
    }
  }

  async resetToDisabledOnBoundaryChange(
    parcelId: string,
    organizationId: string,
    currentPhase: AiPhase,
    previousBoundary: unknown,
    nextBoundary: unknown,
  ): Promise<boolean> {
    if (currentPhase === "disabled") {
      return false;
    }

    if (!this.boundaryChanged(previousBoundary, nextBoundary)) {
      return false;
    }

    await this.transitionPhase(
      parcelId,
      currentPhase,
      "disabled",
      organizationId,
    );
    return true;
  }

  private boundaryChanged(
    previousBoundary: unknown,
    nextBoundary: unknown,
  ): boolean {
    return JSON.stringify(previousBoundary) !== JSON.stringify(nextBoundary);
  }
}
