# Spec: Calibration Service Integration

## Capability: startCalibration runs vegetation check before proceeding

### Scenario: PARCELLE_VIDE returns 422
- GIVEN a parcel with age ≥ 4 and summer NDVI mean < 0.15, min < 0.10
- WHEN POST `/parcels/{id}/calibration/start` is called
- THEN response status is 422
- AND response body contains `vegetation_status: "PARCELLE_VIDE"`
- AND response body contains `user_message` with title and body
- AND parcel `ai_phase` is NOT changed (no state transition happened)

### Scenario: VEGETATION_CONFIRMEE proceeds to calibration
- GIVEN a parcel with summer NDVI mean ≥ 0.28, min ≥ 0.18
- WHEN POST `/parcels/{id}/calibration/start` is called
- THEN calibration record is created with status "in_progress"
- AND background calibration is launched

### Scenario: ZONE_GRISE proceeds with warning flag
- GIVEN a parcel in grey zone (neither confirmed nor empty)
- WHEN POST `/parcels/{id}/calibration/start` is called
- THEN calibration record is created
- AND `profile_snapshot.vegetation_check_status` = "ZONE_GRISE"
- AND background calibration is launched

### Scenario: BYPASS skips check entirely
- GIVEN a parcel with age < 4
- WHEN POST `/parcels/{id}/calibration/start` is called
- THEN no NDVI query is made for vegetation check
- AND calibration proceeds normally
