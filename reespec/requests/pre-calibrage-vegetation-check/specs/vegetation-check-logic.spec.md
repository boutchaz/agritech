# Spec: Vegetation Check Logic

## Capability: Deterministic vegetation check from summer NDVI

### Scenario: Young plantation bypasses check
- GIVEN a parcel with `planting_year` such that age < 4
- WHEN `checkVegetation()` is called
- THEN return `{ status: "BYPASS_JEUNE_PLANTATION", continueCalibration: true, showMessage: false }`

### Scenario: No planting year defaults to bypass
- GIVEN a parcel with `planting_year = null`
- WHEN `checkVegetation()` is called
- THEN return `{ status: "BYPASS_JEUNE_PLANTATION", continueCalibration: true, showMessage: false }`

### Scenario: Confirmed vegetation passes
- GIVEN NDVI history with July-August mean = 0.42 and min = 0.31
- WHEN `checkVegetation()` is called
- THEN return `{ status: "VEGETATION_CONFIRMEE", continueCalibration: true, showMessage: false }`

### Scenario: Boundary values for confirmed (exact thresholds)
- GIVEN NDVI history with July-August mean = 0.28 and min = 0.18
- WHEN `checkVegetation()` is called
- THEN return `{ status: "VEGETATION_CONFIRMEE", continueCalibration: true, showMessage: false }`

### Scenario: Empty parcel blocks calibration
- GIVEN NDVI history with July-August mean = 0.08 and min = 0.04
- WHEN `checkVegetation()` is called
- THEN return `{ status: "PARCELLE_VIDE", continueCalibration: false, showMessage: true, messageType: "bloquant" }`

### Scenario: Boundary values for empty (exact thresholds)
- GIVEN NDVI history with July-August mean = 0.14 and min = 0.09
- WHEN `checkVegetation()` is called
- THEN return `{ status: "PARCELLE_VIDE", continueCalibration: false, showMessage: true }`

### Scenario: Grey zone warns but continues
- GIVEN NDVI history with July-August mean = 0.22 and min = 0.15
- WHEN `checkVegetation()` is called
- THEN return `{ status: "ZONE_GRISE", continueCalibration: true, showMessage: true, messageType: "avertissement" }`

### Scenario: No July-August data bypasses check
- GIVEN NDVI history with zero entries for July or August months
- WHEN `checkVegetation()` is called
- THEN return `{ status: "BYPASS_JEUNE_PLANTATION", continueCalibration: true, showMessage: false }`
- AND never block on missing data (rule absolue)

### Scenario: Mixed — meets mean but not min
- GIVEN NDVI history with July-August mean = 0.30 but min = 0.12
- WHEN `checkVegetation()` is called
- THEN return `{ status: "ZONE_GRISE", continueCalibration: true, showMessage: true }`
- BECAUSE Rule 1 requires BOTH mean ≥ 0.28 AND min ≥ 0.18
