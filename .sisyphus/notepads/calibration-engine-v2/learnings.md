# Calibration Engine V2 — Learnings

## 2026-03-18 — Session 5 (ses_2fccf6f46ffe4J8UWniqyvKGj1)

### Implementation Status: 33/34 complete. Only F3 (Real Manual QA) remains.

### Architecture Established
- Python 8-step sequential engine: `backend-service/app/services/calibration/`
- NestJS orchestration V2: `agritech-api/src/modules/calibration/calibration.service.ts`
- State machine: `agritech-api/src/modules/calibration/calibration-state-machine.ts`
- Nutrition logic: `agritech-api/src/modules/calibration/nutrition-option.service.ts`
- Frontend: `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.calibration.tsx`
- DB migrations: `20260313023000_calibration_v2_schema.sql`, `20260313023100_weather_gdd_columns.sql`

### Services Configuration (local dev)
- Supabase: http://127.0.0.1:54321 (start with: cd project && npx supabase start)
- NestJS API: http://localhost:3001 (start with: pnpm --filter agritech-api start:dev)
- Python backend: http://localhost:8001 (start with: cd backend-service && uvicorn app.main:app --reload --port 8001)
- Frontend: http://localhost:5173 (already running: pnpm --filter agriprofy dev)

### Verified Passing (F1+F2+F4 all APPROVED)
- All 8 Python calibration steps implemented and tested
- NestJS V2 orchestration + state machine + nutrition gate
- Frontend: 4-section report, validation flow, nutrition option selector
- Integration tests: full state machine flow tested
- E2E test: calibration-v2.spec.ts created
- DB migrations: 2 migrations applied with correct schema changes

### ai_phase State Machine Transitions
- disabled → calibrating (start calibration)
- calibrating → awaiting_validation (calibration success)
- calibrating → disabled (calibration failure)
- awaiting_validation → awaiting_nutrition_option (user validates)
- awaiting_nutrition_option → active (user confirms nutrition option)
- active → awaiting_nutrition_option (change nutrition option)
- active → calibrating (recalibration)
- active → disabled (user disables AI)

### Known Issues / Gotchas
- Tasks 2 and 3 (DB migrations) were implemented but not checked off in plan — fixed in this session
- F3 tagged as "BLOCKED: requires running services" — needs Supabase + NestJS + Python all running
- F3 evidence dir: .sisyphus/evidence/final-qa/
