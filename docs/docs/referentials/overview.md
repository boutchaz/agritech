---
sidebar_position: 1
title: "Crop Referentials Overview"
---

# Crop referentials

This folder contains **crop referential** JSON files used for calibration and AI features. Each file holds all reference data for one crop type (varieties, phenology stages, thresholds, nutrition, etc.).

## File naming

- **Pattern:** `DATA_<crop_type>.json`
- **Examples:** `DATA_OLIVIER.json`, `DATA_AGRUMES.json`, `DATA_PALMIER_DATTIER.json`
- The `crop_type` in the filename must match the value in `metadata.culture` inside the file (e.g. `olivier`, `palmier_dattier`).

## Adding a new referential

1. Create a new file `DATA_<crop_type>.json` in this folder.
2. Ensure the JSON has at least:
   - `metadata` with `version` (string) and `culture` (string, same as crop_type in filename).
   - `varietes` (or `especes` where applicable): array of variety objects, each with `nom`, `code`, and `rendement_kg_arbre` (yield-by-age brackets) for calibration.
3. Run the seed script from `agritech-api`:  
   `pnpm exec ts-node scripts/seed-ai-references.ts`  
   (or `--dry-run` to preview).  
   All `DATA_*.json` files in this folder are discovered automatically and upserted into `crop_ai_references`.

## Parcel variety and calibration

- **Parcel creation** stores `crop_type` and `variety` on the parcel.
- **Calibration** loads the referential for the parcel’s `crop_type` and uses the parcel’s **variety** to look up variety-specific data (e.g. yield curves) inside that referential.
- Variety matching is done by **`varietes[].nom`** or **`varietes[].code`** (case-insensitive). The variety set on the parcel at creation (or later) is the one used for maturity phase and yield potential in calibration.
- Ensure parcel varieties match one of the `nom` or `code` values in the referential for that crop so calibration can use the correct reference data.
