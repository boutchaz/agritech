# Spec: Referential JSON Migration

## Olive phases migrated

GIVEN DATA_OLIVIER.json
WHEN reading protocole_phenologique.phases
THEN phases are keyed by name (DORMANCE, DEBOURREMENT, ...) not PHASE_0, PHASE_1
AND each phase has `exit` array with `{target, when, confidence}` objects
AND `when` is a structured condition (has "var"/"and"/"or" keys, no French strings)
AND DORMANCE has `skip_when` condition
AND DORMANCE has `entry.when` condition

## Signaux.streaks block exists for all crops

GIVEN each DATA_*.json file
WHEN reading signaux.streaks
THEN block exists with at least: warm_streak, cold_streak, hot_streak, hot_dry_streak
AND each streak value is a valid condition expression (has "var" or "and"/"or" key)

## Crop-specific streak thresholds

GIVEN DATA_OLIVIER.json
WHEN reading signaux.streaks.hot_streak
THEN threshold is Tmoy > 25

GIVEN DATA_PALMIER_DATTIER.json
WHEN reading signaux.streaks.hot_streak
THEN threshold is Tmoy > 35 (palm tolerates higher heat)

## All 4 crops migrated

GIVEN DATA_OLIVIER.json, DATA_AGRUMES.json, DATA_AVOCATIER.json, DATA_PALMIER_DATTIER.json
WHEN scanning protocole_phenologique.phases for string values containing "ET", "OU", ">=", "pendant"
THEN no matches found (all conditions are structured JSON)

## Backward compatibility during migration

GIVEN a referential with OLD string-format conditions (unmigrated)
WHEN extract_phase_config() reads it
THEN falls back to regex extraction (existing behavior)
AND logs a deprecation warning

GIVEN a referential with NEW structured conditions
WHEN extract_phase_config() reads it
THEN parses condition trees directly (no regex)
