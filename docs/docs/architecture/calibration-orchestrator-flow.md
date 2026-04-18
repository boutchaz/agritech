# Calibration pipeline — data flow (Mermaid)

End-to-end flow: **Supabase + NestJS** assemble inputs; **FastAPI** runs `run_calibration_pipeline` (orchestrator); results return to Nest for persistence.

> The Python **orchestrator does not query a database**; it only consumes the JSON body of `POST /calibration/v2/run`.

```mermaid
flowchart TB
  subgraph db["Supabase (NestJS reads / writes)"]
    SI["satellite_indices_data"]
    WD["weather_daily_data"]
    AN["analyses"]
    HR["harvest_records"]
    CR["crop_ai_references\n(or bundled JSON fallback)"]
    CV["crop_varieties\n(optional: chill for precompute)"]
    CAL["calibrations\n(profile_snapshot, status, …)"]
  end

  subgraph nest["agritech-api (CalibrationService + CalibrationDataService)"]
    N1["fetchSatelliteImages"]
    N2["fetchWeatherRows"]
    N3["syncWeatherData if empty"]
    N4["fetchAnalyses / fetchHarvestRecords"]
    N5["fetchCropReferenceData"]
    N6["optional: POST precompute-gdd\nif GDD columns missing"]
    N7["POST /calibration/v2/run"]
    N8["persist v2 output"]
  end

  subgraph api["backend-service FastAPI"]
    WH["GET /weather/historical\n(archive e.g. Open-Meteo)"]
    PG["POST /calibration/v2/precompute-gdd"]
    RUN["POST /calibration/v2/run\n→ run_calibration_pipeline"]
  end

  subgraph orch["orchestrator.py (in-memory)"]
    M0["determine_maturity_phase\nget_threshold_adjustment"]
    S1["Step1: extract_satellite_history"]
    S2["Step2: extract_weather_history"]
    GDD["Crop-aware GDD:\nprecompute_gdd_rows +\nmonthly cumulative / totals"]
    S2A["classify_signal"]
    S3["calculate_percentiles"]
    S4["detect_phenology"]
    S5["detect_anomalies"]
    S6["calculate_yield_potential"]
    S7["classify_zones"]
    S8["calculate_health_score +\ncalculate_confidence_score"]
  end

  SI --> N1
  WD --> N2
  AN --> N4
  HR --> N4
  CR --> N5
  CV -.-> N6

  N2 --> N3
  N3 --> WH
  WH --> WD

  N1 --> N7
  N2 --> N7
  N4 --> N7
  N5 --> N7
  N6 --> PG
  PG --> api

  N7 --> RUN
  RUN --> M0 --> S1 --> S2 --> GDD --> S2A --> S3 --> S4 --> S5 --> S6 --> S7 --> S8
  S8 --> N8
  N8 --> CAL
```

## Orchestrator-only sequence (steps inside `run_calibration_pipeline`)

```mermaid
sequenceDiagram
  participant Client as NestJS client
  participant API as FastAPI /calibration/v2/run
  participant O as orchestrator.run_calibration_pipeline
  participant R as referential reference_data

  Client->>API: calibration_input + satellite_images + weather_rows
  API->>O: invoke pipeline
  O->>R: thresholds via calibration_input.reference_data
  Note over O: Step1 satellite → Step2 weather
  O->>O: precompute_gdd_rows (NIRv from step1 + weather + ref)
  Note over O: classify_signal → percentiles → phenology → anomalies → yield → zones → health + confidence
  O-->>API: CalibrationOutput
  API-->>Client: JSON response
```

## Related code

- Nest assembly and HTTP calls: `agritech-api/src/modules/calibration/calibration.service.ts`
- DB fetch helpers: `agritech-api/src/modules/calibration/calibration-data.service.ts`
- Pipeline entry: `backend-service/app/services/calibration/orchestrator.py`
- HTTP entry: `backend-service/app/api/calibration.py` (`CalibrationRunV2Request`, `_run_v2`)
