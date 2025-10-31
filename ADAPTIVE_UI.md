# Adaptive UI System Documentation

## Overview

The Adaptive UI System allows you to maintain a single codebase while tailoring the interface complexity to each user's experience level. Users can progress from **Basic** (guided) to **Medium** (balanced) to **Expert** (full access) as they become more comfortable with the application.

---

## Core Concepts

### Experience Levels

| Level | Description | Target Users | Key Features |
|-------|-------------|--------------|--------------|
| **Basic** | Simplified interface with guidance | New users, occasional users | Guided tours, contextual help, pre-filled defaults, limited options |
| **Medium** | Balanced with optional advanced features | Regular users | Advanced filters (collapsible), analytics, bulk actions, tooltips on demand |
| **Expert** | Full access to all capabilities | Power users, admins | All features visible, no hints, keyboard shortcuts, API access |

### Feature Flags

Each level has automatic feature flags that control UI visibility:

```typescript
interface FeatureFlags {
  showAdvancedFilters: boolean;      // Custom queries, complex filters
  showBulkActions: boolean;          // Multi-select, batch operations
  showAnalytics: boolean;            // Charts, detailed breakdowns
  showContextualHelp: boolean;       // Inline hints, helper text
  enableGuidedTours: boolean;        // Step-by-step walkthroughs
  showAllFormFields: boolean;        // Show optional/advanced form fields
  showDataExport: boolean;           // CSV/Excel export
  showApiAccess: boolean;            // API keys, webhooks
  enableKeyboardShortcuts: boolean;  // Power user shortcuts
  showDeveloperTools: boolean;       // Debug panels, logs
}
```

---

## Setup

### 1. Database Migration

Run the migration to add experience level fields:

```bash
npm run db:push
npm run db:generate-types-remote
```

This adds:
- `experience_level` (enum: basic, medium, expert)
- `dismissed_hints` (jsonb array of hint IDs)
- `feature_usage` (jsonb tracking feature interactions)

### 2. Provider Integration

Wrap your app with `ExperienceLevelProvider` (after `MultiTenantAuthProvider`):

```tsx
// In __root.tsx or main layout
import { ExperienceLevelProvider } from '@/contexts/ExperienceLevelContext';

<MultiTenantAuthProvider>
  <ExperienceLevelProvider>
    {/* Your app */}
  </ExperienceLevelProvider>
</MultiTenantAuthProvider>
```

---

## Usage Patterns

### 1. Feature Gating

Hide/show features based on experience level:

```tsx
import { useFeatureFlag } from '@/contexts/ExperienceLevelContext';

const MyComponent = () => {
  const showExport = useFeatureFlag('showDataExport');
  const showAdvanced = useFeatureFlag('showAdvancedFilters');

  return (
    <>
      {showAdvanced && <AdvancedFilters />}
      {showExport && <ExportButton />}
    </>
  );
};
```

### 2. Adaptive Sections (Progressive Disclosure)

Collapse advanced features behind toggles:

```tsx
import { AdaptiveSection } from '@/components/adaptive';

<AdaptiveSection
  title="Options avancées"
  description="Filtres et tris supplémentaires"
  collapsible={true}
  defaultExpanded={false}
>
  <AdvancedOptions />
</AdaptiveSection>
```

**Behavior:**
- **Basic**: Hidden by default, user can expand
- **Medium**: Collapsed by default, user can expand
- **Expert**: Always visible and expanded

### 3. Contextual Help

Show dismissible hints to guide users:

```tsx
import { ContextualHelp } from '@/components/adaptive';
import type { ContextualHint } from '@/types/experience-level';

const hint: ContextualHint = {
  id: 'profitability-export',  // Unique ID for dismissal tracking
  title: 'Exporter vos données',
  content: 'Cliquez sur Exporter pour télécharger un CSV...',
  targetLevel: ['basic', 'medium'],  // Only show to these levels
  category: 'feature',  // feature | tip | warning | shortcut
  priority: 'medium',   // low | medium | high
};

<ContextualHelp hint={hint} />
```

**Behavior:**
- Shows only to targeted levels
- User can dismiss permanently (stored in profile)
- Automatically hidden after dismissal

### 4. Feature Usage Tracking

Track actions to suggest level upgrades:

```tsx
import { useExperienceLevel } from '@/contexts/ExperienceLevelContext';

const MyComponent = () => {
  const { trackFeatureUsage } = useExperienceLevel();

  const handleExport = () => {
    trackFeatureUsage('profitability-export');  // Track usage
    // ... actual export logic
  };

  return <Button onClick={handleExport}>Export</Button>;
};
```

**Automatic Suggestions:**
- After 50 actions at **Basic**, suggest **Medium**
- After 200 actions at **Medium**, suggest **Expert**

### 5. Level-Up Suggestions

Show smart toast when user is ready to upgrade:

```tsx
import { LevelUpSuggestion } from '@/components/adaptive';

// In your layout/dashboard
<LevelUpSuggestion />
```

**Appears when:**
- User has accumulated enough usage
- User hasn't dismissed this suggestion
- User is not already at expert level

### 6. Settings UI

Add experience level selector to user settings:

```tsx
import { ExperienceLevelSelector } from '@/components/settings/ExperienceLevelSelector';

// In settings page
<ExperienceLevelSelector />
```

---

## Component API

### `useExperienceLevel()`

Main hook for accessing experience level context:

```tsx
const {
  level,                      // Current level: 'basic' | 'medium' | 'expert'
  config,                     // Full configuration object
  setLevel,                   // Update level: (level) => Promise<void>
  hasFeature,                 // Check feature: (feature) => boolean
  dismissedHints,             // Array of dismissed hint IDs
  dismissHint,                // Dismiss hint: (hintId) => Promise<void>
  isHintDismissed,           // Check if dismissed: (hintId) => boolean
  trackFeatureUsage,          // Track usage: (feature) => Promise<void>
  shouldSuggestUpgrade,       // Check if upgrade suggested: () => Level | null
  isLoading,                  // Loading state
} = useExperienceLevel();
```

### `useFeatureFlag(feature)`

Simplified hook for single feature check:

```tsx
const hasExport = useFeatureFlag('showDataExport');
```

### `<AdaptiveSection>`

Progressive disclosure container:

```tsx
<AdaptiveSection
  requiredFeature="showAdvancedFilters"  // Optional: hide if feature disabled
  title="Section Title"
  description="Helper text"
  collapsible={true}                     // Can be collapsed
  defaultExpanded={false}                 // Initial state
  className="custom-class"
>
  {children}
</AdaptiveSection>
```

### `<ContextualHelp>`

Dismissible hint card:

```tsx
<ContextualHelp hint={contextualHint} className="mb-4" />
```

### `<HelpTrigger>`

Inline help icon with tooltip:

```tsx
<HelpTrigger content="This feature allows you to..." />
```

### `<LevelUpSuggestion>`

Smart upgrade prompt:

```tsx
<LevelUpSuggestion />
```

---

## Best Practices

### 1. Start with Basic

Default new users to **Basic** level. Let them discover features gradually.

```typescript
// In user creation
experience_level: 'basic'
```

### 2. Use Semantic Feature Names

Track features by what they do, not by component names:

```typescript
// Good
trackFeatureUsage('export-profitability-csv');
trackFeatureUsage('bulk-delete-tasks');

// Bad
trackFeatureUsage('button-click');
trackFeatureUsage('action-1');
```

### 3. Provide Upgrade Paths

When hiding features, tell users how to access them:

```tsx
{!showAdvanced && level === 'basic' && (
  <p className="text-sm text-gray-500">
    Passez au niveau Intermédiaire pour accéder aux filtres avancés.
    <Link to="/settings">Modifier</Link>
  </p>
)}
```

### 4. Don't Over-Hide

Even in **Basic** mode, show core functionality. Only hide truly advanced features.

### 5. Combine with CASL Permissions

Feature flags control **UI complexity**, not **authorization**:

```tsx
const canExport = useCan('export', 'Data');        // Permission check
const showExport = useFeatureFlag('showDataExport'); // UI complexity

// Only show if both permitted AND appropriate for level
{canExport && showExport && <ExportButton />}
```

---

## Migration Guide

### Refactoring Existing Components

**Before:**
```tsx
const MyComponent = () => {
  return (
    <>
      <BasicFeatures />
      <AdvancedFilters />
      <AnalyticsCharts />
      <ExportButton />
    </>
  );
};
```

**After:**
```tsx
const MyComponent = () => {
  const showAdvanced = useFeatureFlag('showAdvancedFilters');
  const showAnalytics = useFeatureFlag('showAnalytics');
  const showExport = useFeatureFlag('showDataExport');

  return (
    <>
      <BasicFeatures />

      <AdaptiveSection
        requiredFeature="showAdvancedFilters"
        title="Filtres avancés"
        collapsible={true}
      >
        <AdvancedFilters />
      </AdaptiveSection>

      {showAnalytics && <AnalyticsCharts />}
      {showExport && <ExportButton />}
    </>
  );
};
```

---

## Testing

### Test Different Levels

Use the settings UI to switch between levels and verify:

1. **Basic Mode:**
   - Only essential features visible
   - Contextual hints appear
   - Advanced sections collapsed/hidden

2. **Medium Mode:**
   - More features available
   - Advanced sections collapsible
   - Hints still available

3. **Expert Mode:**
   - All features visible
   - No hints or guidance
   - Advanced sections always expanded

### Test Feature Tracking

Monitor usage in browser console:

```typescript
const { trackFeatureUsage } = useExperienceLevel();
trackFeatureUsage('test-feature');
// Check user_profiles.feature_usage in database
```

---

## Roadmap

Future enhancements:

- [ ] **Role-based defaults**: Auto-set experience level based on user role
- [ ] **Onboarding wizard**: Guide new users through level selection
- [ ] **Analytics dashboard**: Show admin which features are most used
- [ ] **A/B testing**: Test different default levels for new users
- [ ] **Custom levels**: Allow organizations to define their own levels
- [ ] **Keyboard shortcut overlay**: Show shortcuts panel in expert mode

---

## Examples

See these files for full implementation examples:

- **Context & Hooks**: `src/contexts/ExperienceLevelContext.tsx`
- **Adaptive Components**: `src/components/adaptive/`
- **Settings UI**: `src/components/settings/ExperienceLevelSelector.tsx`
- **Integration Example**: `src/components/ProfitabilityDashboard.adaptive-example.tsx`

---

## Troubleshooting

### Hints Not Showing

- Check if `showContextualHelp` is enabled for your level
- Verify hint hasn't been dismissed: check `user_profiles.dismissed_hints`
- Ensure hint `targetLevel` includes current level

### Feature Not Gating

- Confirm feature flag is checking the right feature name
- Check if feature exists in `EXPERIENCE_LEVELS` config
- Verify `ExperienceLevelProvider` is mounted

### Level Not Persisting

- Check database migration applied successfully
- Verify Supabase connection and RLS policies
- Check for errors in browser console

---

## Support

For questions or issues:
1. Check this documentation
2. Review example components
3. Inspect browser console for errors
4. Check database `user_profiles` table structure
