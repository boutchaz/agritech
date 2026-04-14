# Spec: Frontend Vegetation Error Handling

## Capability: CalibrationWizard handles vegetation check responses

### Scenario: PARCELLE_VIDE shows blocking dialog
- GIVEN the user clicks "Lancer le calibrage"
- WHEN the API returns 422 with `vegetation_status: "PARCELLE_VIDE"`
- THEN a dialog appears with title "Végétation insuffisante détectée"
- AND dialog shows explanatory body text
- AND dialog has "Corriger ma parcelle" button
- AND clicking "Corriger" navigates back to parcel edit (Phase 0)

### Scenario: ZONE_GRISE shows toast warning
- GIVEN the user clicks "Lancer le calibrage"
- WHEN the API returns 201 with `vegetation_check_status: "ZONE_GRISE"` in the response
- THEN a warning toast appears with "Végétation mixte détectée"
- AND calibration proceeds normally (spinner shows)

### Scenario: Normal calibration unchanged
- GIVEN the user clicks "Lancer le calibrage"
- WHEN the API returns 201 with no vegetation warning
- THEN behavior is identical to current (success toast + spinner)
