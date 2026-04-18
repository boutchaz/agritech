# Spec: V2 Prompt Builders

## Capability: Replace V1 prompts with config-driven V2 prompt builders

### S1. Calibration prompt uses V2 builder
- **GIVEN** moteurConfig and referentiel are loaded
- **WHEN** `buildCalibrageSystemPrompt(moteurConfig, referentiel)` is called
- **THEN** the returned string contains the culture name, GDD parameters, phase_age logic, scoring breakdown, and referentiel JSON
- **AND** it contains "MODE OBSERVATION PURE"
- **AND** it does NOT contain hardcoded threshold values (they come from the injected JSON)

### S2. Operational prompt uses V2 builder
- **GIVEN** moteurConfig and referentiel are loaded
- **WHEN** `buildOperationnelSystemPrompt(moteurConfig, referentiel)` is called
- **THEN** the returned string contains gouvernance rules, 6-bloc structure, chemin A/B/C routing, co-occurrence matrix, and alert codes from referentiel

### S3. Annual plan prompt uses V2 builder
- **GIVEN** moteurConfig and referentiel are loaded
- **WHEN** `buildPlanAnnuelSystemPrompt(moteurConfig, referentiel)` is called
- **THEN** the returned string contains the 10-step deterministic algorithm, nutrition option determination, fractionnement tables, and verification checklist

### S4. Recalibration prompt exists
- **GIVEN** moteurConfig and referentiel are loaded
- **WHEN** `buildRecalibrageSystemPrompt(referentiel)` is called
- **THEN** the returned string contains F2 partial and F3 complete recalibration logic

### S5. V2 types are the contract
- **GIVEN** `agromind.types.ts` is imported
- **WHEN** prompt user builders are called
- **THEN** they accept `CalibrageInput`, `OperationnelInput`, `PlanAnnuelInput`, `RecalibrageInput` respectively
- **AND** the expected AI output matches `CalibrageOutput`, `OperationnelOutput`, `PlanAnnuelOutput`, `RecalibrageOutput`

### S6. AI reports service routes to V2 builders
- **GIVEN** a calibration report is requested for a parcel
- **WHEN** `aiReportsService.generateReport()` is called with `reportType = CALIBRATION`
- **THEN** it loads moteurConfig + culture referentiel and passes them to V2 prompt builders
- **AND** the old V1 `CALIBRATION_EXPERT_SYSTEM_PROMPT` is no longer used
