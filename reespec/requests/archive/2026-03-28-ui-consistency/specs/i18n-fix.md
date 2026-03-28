# Spec: i18n Fix

## Capability: Hardcoded French strings in button labels replaced with t() calls

### Scenario: Hardcoded French label replaced
- **GIVEN** a button with `<span>Nouvelle Charge</span>`
- **WHEN** the i18n fix is applied
- **THEN** it becomes `{t('common.newCharge', 'New charge')}` and keys exist in en/, fr/, ar/ locale files

### Scenario: aria-label values are translated
- **GIVEN** an icon-only button with `aria-label="Annuler"`
- **WHEN** the i18n fix is applied
- **THEN** it becomes `aria-label={t('common.cancel', 'Cancel')}`

### Scenario: Existing t() calls are not duplicated
- **GIVEN** a button already using `t('tasks.start', 'Start')`
- **WHEN** the replacement pass is applied
- **THEN** the t() call remains unchanged

### Scenario: Locale files contain all new keys
- **GIVEN** new i18n keys added during the pass
- **WHEN** the locale files are checked
- **THEN** all 3 languages (en, fr, ar) have the key with appropriate translations
