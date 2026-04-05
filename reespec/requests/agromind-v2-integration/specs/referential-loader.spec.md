# Spec: Referential Loader

## Capability: Load MOTEUR_CONFIG + V2 referentiel files from disk

### S1. MOTEUR_CONFIG.json loaded and cached
- **GIVEN** `referentials/MOTEUR_CONFIG.json` exists on disk
- **WHEN** `getMoteurConfig()` is called
- **THEN** it returns the parsed JSON object
- **AND** subsequent calls return the cached value without re-reading disk

### S2. V2 referentiel files loaded by culture
- **GIVEN** `referentials/DATA_OLIVIER_v5.json` exists on disk
- **WHEN** `getLocalCropReference('olivier')` is called
- **THEN** it returns the parsed V5 referentiel with keys including `gdd`, `co_occurrence`, `protocole_phenologique`, `formes_engrais`, `microelements`, `rdi`, `kc_par_periode`

### S3. Referentiel version validation
- **GIVEN** a referentiel file loaded from disk
- **WHEN** the loader validates it
- **THEN** it checks that `metadata.version` exists and `alertes` array has at least 1 entry
- **AND** logs a warning if expected sections are missing

### S4. Both files available for prompt injection
- **GIVEN** MOTEUR_CONFIG and a culture referentiel are loaded
- **WHEN** a prompt builder calls `buildCalibrageSystemPrompt(moteurConfig, referentiel)`
- **THEN** both objects are available as arguments and can be JSON.stringified into the prompt
