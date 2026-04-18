# Brief: Enhance Demo Data for WOW Effect

## What & Why

The demo data seeder (`/settings/danger-zone` → "Generate Demo Data") is the **first impression** for every prospect and investor demo. Currently it seeds ~37 entity types but leaves several high-impact screens empty or underwhelming:

1. **Dashboard** — needs richer, time-distributed data to populate KPI cards and charts
2. **Orchards / Trees** — trees exist but lack parcel linkage and pruning history
3. **Crop Cycles / Stages** — crop_cycle_stages and harvest_events are empty
4. **Calibrations (AgromindIA)** — no calibration data = AI pages look dead
5. **Worker pay records** — payment_advances, payment_bonuses, payment_deductions missing
6. **Task depth** — no task_comments, task_dependencies, task_templates, or task_equipment
7. **Delivery tracking** — delivery_items and delivery_tracking are empty
8. **Stock movements** — stock_movements table never populated (stock page incomplete)
9. **Inventory batches** — inventory_batches empty despite items existing
10. **Marketplace** — marketplace_quote_requests empty
11. **Pest/Disease reports** — pest_disease_reports empty
12. **Metayage settlements** — metayage_settlements empty (relevant for Moroccan farms)
13. **Crop templates** — crop_templates empty (campaign planning feels hollow)
14. **Biological asset valuations** — no valuation history over time
15. **Quality inspections** — exist but lack crop_cycle linkage depth

## Goals

- After seeding, **every major screen** in the app displays meaningful, realistic Moroccan agriculture data
- Data tells a **coherent story**: a 25ha farm near Berkane with olives, citrus, and vegetables across one full agricultural campaign
- Time-distributed data spanning ~6 months so charts/dashboards show trends
- The demo creates a "wow" moment: prospects see a fully alive farm management platform

## Non-Goals

- No schema changes (all tables already exist)
- No new API endpoints (the existing seed endpoint handles everything)
- No frontend changes (screens already render data — they just need it)
- No satellite/GEE data (requires backend-service, not part of demo seed)

## Impact

- Sales demos go from "imagine this would show..." to "look at this"
- Every prospect screen has data within 30 seconds of clicking "Generate Demo Data"
- Reduces time-to-wow from minutes of manual data entry to one click
