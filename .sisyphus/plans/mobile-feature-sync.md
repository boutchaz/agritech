# Mobile Feature Sync Plan: Web → Mobile (All 67 Missing Features)

## Context

The web app (`project/`) has 67 features not present in the mobile app (`mobile/`). The NestJS backend already exposes all necessary API endpoints — this is purely a frontend sync. The mobile app uses Expo Router (file-based), TanStack Query, Zustand, react-i18next, and a custom theme system. Every new screen follows this pattern:

1. **API service** → `mobile/src/lib/api/<domain>.ts` (calls NestJS via `api.get/post/patch/delete`)
2. **Types** → `mobile/src/types/<domain>.ts` (TypeScript interfaces)
3. **Hooks** → `mobile/src/hooks/use<Domain>.ts` (TanStack Query wrappers)
4. **Screen** → `mobile/app/(drawer)/(<group>)/<screen>.tsx` (Expo Router file)
5. **Layout** → Update `_layout.tsx` in the parent group to register the new screen
6. **Drawer** → Update `_layout.tsx` drawer nav if adding a new top-level section
7. **i18n** → Add keys to all 3 locales (en, fr, ar)
8. **Permissions** → Add CASL subject/action checks via `useAbility()` where needed

### Web API Services Already Available (81 files in `project/src/lib/api/`)

All backend endpoints exist. Mobile API layer needs thin wrappers calling the same endpoints.

---

## Phase 1: Shared Infrastructure (Foundation)

### 1.1 Missing API Service Files
Create these in `mobile/src/lib/api/` — wrapping existing NestJS endpoints:

| File | Endpoints Wrapped |
|------|-------------------|
| `orchards.ts` | orchards CRUD |
| `trees.ts` | tree management CRUD |
| `crops.ts` | crop cycles CRUD |
| `biological-assets.ts` | biological assets CRUD |
| `pruning.ts` | pruning records CRUD |
| `quality-control.ts` | quality control CRUD |
| `campaigns.ts` | campaigns CRUD |
| `production-intelligence.ts` | production intelligence |
| `reception-batches.ts` | reception batches CRUD |
| `suppliers.ts` | suppliers CRUD |
| `piece-work.ts` | piece work tracking |
| `compliance.ts` | compliance/certifications/corrective actions |
| `marketplace.ts` | marketplace orders + quote requests |
| `lab-services.ts` | lab services |
| `infrastructure.ts` | infrastructure |
| `utilities.ts` | utilities |
| `accounting-extended.ts` | accounts, journal, ledger, reports, balance sheet, P&L, cash flow, trial balance, aged payables/receivables, payments, purchase orders, sales orders, quotes, customers |
| `settings.ts` | all settings endpoints (account, AI, cost centers, fiscal years, legal, modules, preferences, subscription, users, work units, documents, files, dashboard, bio assets, account mappings, danger zone) |
| `ai-alerts.ts` | AI alerts per parcel |
| `ai-plan.ts` | AI plan per parcel |
| `ai-recommendations.ts` | AI recommendations per parcel |
| `ai-weather.ts` | AI weather per parcel |
| `satellite-extended.ts` | satellite heatmap, timeseries |
| `analytics.ts` | dashboard analytics |
| `chat.ts` | AI chat |
| `live-dashboard.ts` | live dashboard data |
| `tasks-extended.ts` | calendar view, kanban view data |

### 1.2 Missing Type Files
Create these in `mobile/src/types/`:

| File | Types |
|------|-------|
| `orchards.ts` | Orchard, CreateOrchardInput, etc. |
| `trees.ts` | Tree, TreeManagementRecord, etc. |
| `crops.ts` | CropCycle, Campaign, etc. |
| `quality-control.ts` | QualityControlRecord, etc. |
| `pruning.ts` | PruningRecord, etc. |
| `compliance.ts` | Certification, CorrectiveAction, etc. |
| `marketplace.ts` | MarketplaceOrder, QuoteRequest, etc. |
| `accounting-extended.ts` | Account, JournalEntry, LedgerEntry, BalanceSheet, ProfitLoss, CashFlow, TrialBalance, etc. |
| `settings.ts` | CostCenter, FiscalYear, WorkUnit, ModuleConfig, etc. |
| `ai.ts` | AIAlert, AIPlan, AIRecommendation, AIWeatherInsight |
| `satellite-extended.ts` | SatelliteHeatmapData, SatelliteTimeseriesPoint |
| `analytics.ts` | AnalyticsData, KPIData |

### 1.3 Missing Hook Files
Create these in `mobile/src/hooks/`:

| File | Hooks |
|------|-------|
| `useOrchards.ts` | useOrchards, useOrchard, useCreateOrchard, etc. |
| `useTrees.ts` | useTrees, useTree, useCreateTreeRecord, etc. |
| `useCropCycles.ts` | useCropCycles, useCropCycle, useCreateCropCycle, etc. |
| `useQualityControl.ts` | useQualityRecords, useCreateQualityRecord |
| `usePruning.ts` | usePruningRecords, useCreatePruningRecord |
| `useCampaigns.ts` | useCampaigns, useCampaign |
| `useCompliance.ts` | useCertifications, useCertification, useCorrectiveActions |
| `useMarketplace.ts` | useMarketplaceOrders, useQuoteRequests |
| `useAccountingExtended.ts` | useAccounts, useJournalEntries, useGeneralLedger, useBalanceSheet, useProfitLoss, useCashFlow, useTrialBalance, useAgedPayables, useAgedReceivables, usePayments, usePurchaseOrders, useSalesOrders, useQuotes, useCustomers |
| `useSettings.ts` | useCostCenters, useFiscalYears, useWorkUnits, useModuleConfig, useUsers, useOrganizationSettings, etc. |
| `useAI.ts` | useAIAlerts, useAIPlan, useAIRecommendations, useAIWeather |
| `useSatelliteExtended.ts` | useSatelliteHeatmap, useSatelliteTimeseries |
| `useAnalytics.ts` | useAnalytics, useKPIs |
| `useChat.ts` | useChatMessages, useSendChatMessage |
| `useLiveDashboard.ts` | useLiveDashboardData |
| `useTasksExtended.ts` | useTasksCalendar, useTasksKanban |
| `usePieceWork.ts` | usePieceWorkRecords |
| `useDayLaborers.ts` | useDayLaborers |
| `useEmployees.ts` | useEmployees |

### 1.4 Shared UI Components (Reusable Across Features)
Create in `mobile/src/components/`:

| Component | Purpose |
|-----------|---------|
| `DataTable.tsx` | Sortable, filterable table for list views (settings, accounting) |
| `ChartCard.tsx` | Wrapper for chart.js / victory-native charts |
| `FilterBar.tsx` | Reusable horizontal filter chips (already partially exists in entries) |
| `EmptyState.tsx` | Standardized empty state with icon + text + CTA |
| `DetailSection.tsx` | Labeled key-value display for detail screens |
| `StatusBadge.tsx` | Colored status badge (partially exists, standardize) |
| `StatCard.tsx` | KPI number card for dashboards |
| `DatePicker.tsx` | Date range picker for filters |
| `SearchInput.tsx` | Debounced search input |
| `TabView.tsx` | Reusable segmented/tab control (extract from parcel detail pattern) |

---

## Phase 2: Production Module Extensions (15 features)

### 2.1 Parcel AI Sub-screens (5 screens)
**Location**: `mobile/app/(drawer)/(production)/parcel/[id]/`

| Screen | Route | Complexity |
|--------|-------|------------|
| AI Alerts | `ai-alerts.tsx` | Medium — list of AI-generated alerts per parcel |
| AI Calibration | `calibration/index.tsx` (exists partially) | Low — already has calibration directory |
| AI Plan | `ai-plan.tsx` | High — plan with summary, action items |
| AI Recommendations | `ai-recommendations.tsx` | Medium — list of recommendations with cards |
| AI Weather | `ai-weather.tsx` | Medium — weather insights + recommendations |

**Update**: `parcel/[id]/_layout.tsx` — add new tabs to PARCEL_TABS array.

### 2.2 Parcel Satellite Sub-screens (2 screens)
**Location**: `mobile/app/(drawer)/(production)/parcel/[id]/satellite/`

| Screen | Route | Complexity |
|--------|-------|------------|
| Satellite Heatmap | `heatmap.tsx` | High — map/heatmap rendering (react-native-maps) |
| Satellite Timeseries | `timeseries.tsx` | Medium — line chart of indices over time |

**Update**: `parcel/[id]/satellite.tsx` — add sub-navigation between views.

### 2.3 Production Entities (6 screens)
**Location**: `mobile/app/(drawer)/(production)/`

| Screen | Route | Complexity |
|--------|-------|------------|
| Orchards List | `orchards.tsx` | Low — standard CRUD list |
| Trees List | `trees.tsx` | Low — standard CRUD list |
| Crop Cycles List | `crop-cycles.tsx` | Low — standard CRUD list |
| Biological Assets | `biological-assets.tsx` | Low — standard CRUD list |
| Pruning Records | `pruning.tsx` | Low — list + create form |
| Quality Control | `quality-control.tsx` | Low — list + create form |
| Campaigns | `campaigns.tsx` | Low — list + create form |

**Update**: `(production)/_layout.tsx` — register new screens.

### 2.4 Production Aggregate Views (7 screens)
**Location**: `mobile/app/(drawer)/(production)/`

| Screen | Route | Complexity |
|--------|-------|------------|
| Production Intelligence | `intelligence.tsx` | High — AI-powered insights dashboard |
| Aggregate Profitability | `profitability.tsx` | Medium — charts + tables |
| Aggregate Quality Control | `quality-control-aggregate.tsx` | Medium — summary cards |
| Aggregate Satellite | `satellite-analysis.tsx` | High — map + index visualization |
| Aggregate Soil Analysis | `soil-analysis.tsx` | Medium — charts |
| Aggregate Crop Cycles | `crop-cycles-aggregate.tsx` | Low — list view |
| Aggregate Harvests | `harvests-aggregate.tsx` | Low — list view |

---

## Phase 3: Inventory Module Extensions (6 features)

**Location**: `mobile/app/(drawer)/(inventory)/`

| Screen | Route | Complexity |
|--------|-------|------------|
| Stock Groups | `groups.tsx` | Low — list + create |
| Stock Reception | `reception.tsx` | Medium — multi-step form |
| Stock Reports | `reports.tsx` | Medium — summary tables |
| Stock Inventory (stock-taking) | `stock-taking.tsx` | Medium — count + reconcile |
| Suppliers | `suppliers.tsx` | Low — standard CRUD list |
| Reception Batches | `reception-batches.tsx` | Low — list + detail |

**Update**: `(inventory)/_layout.tsx` — register new screens.

---

## Phase 4: Workforce Module Extensions (5 features)

**Location**: `mobile/app/(drawer)/(workforce)/`

| Screen | Route | Complexity |
|--------|-------|------------|
| Day Laborers | `day-laborers.tsx` | Low — list + daily tracking |
| Employees | `employees.tsx` | Low — list + detail |
| Piece Work Tracking | `piece-work.tsx` | Medium — tracking form |
| Tasks Calendar | `tasks-calendar.tsx` | High — calendar view (react-native-calendars) |
| Tasks Kanban | `tasks-kanban.tsx` | High — drag-drop kanban (react-native-gesture-handler) |

**Update**: `(workforce)/_layout.tsx` — register new screens.

---

## Phase 5: Accounting Module (17 features)

**Location**: `mobile/app/(drawer)/(accounting)/`

This is the largest single module. Many screens are read-only report views.

| Screen | Route | Complexity |
|--------|-------|------------|
| Chart of Accounts | `accounts.tsx` | Low — tree/list view |
| General Ledger | `general-ledger.tsx` | Medium — filterable table |
| Journal Entries | `journal.tsx` | Medium — filterable table + create |
| Invoices List | `invoices/index.tsx` | Low — list + filters |
| Invoice Detail | `invoices/[id].tsx` | Medium — full invoice view |
| Payments | `payments.tsx` | Low — list + create |
| Customers | `customers.tsx` | Low — standard CRUD |
| Purchase Orders | `purchase-orders.tsx` | Low — list + detail |
| Sales Orders | `sales-orders.tsx` | Low — list + detail |
| Quotes/Estimates | `quotes.tsx` | Low — list + detail |
| Balance Sheet | `balance-sheet.tsx` | Medium — financial report |
| Profit & Loss | `profit-loss.tsx` | Medium — financial report |
| Cash Flow | `cash-flow.tsx` | Medium — financial report |
| Trial Balance | `trial-balance.tsx` | Medium — financial report |
| Aged Payables | `aged-payables.tsx` | Medium — aging table |
| Aged Receivables | `aged-receivables.tsx` | Medium — aging table |
| Reports | `reports.tsx` | Medium — report list + generation |
| Reports Analysis | `reports-analysis.tsx` | High — charts + data |

**New sub-directory**: `mobile/app/(drawer)/(accounting)/invoices/` for invoice detail.
**Update**: `(accounting)/_layout.tsx` — register all screens.

---

## Phase 6: Settings Module Extensions (16 features)

**Location**: `mobile/app/(drawer)/(settings)/`

| Screen | Route | Complexity |
|--------|-------|------------|
| Account Settings | `account.tsx` | Low — form |
| Account Mappings | `account-mappings.tsx` | Medium — mapping table |
| AI Settings | `ai.tsx` | Low — toggle/form |
| Biological Assets Settings | `biological-assets.tsx` | Low — form |
| Cost Centers | `cost-centers.tsx` | Low — CRUD list |
| Danger Zone | `danger-zone.tsx` | Low — destructive actions |
| Dashboard Settings | `dashboard.tsx` | Low — widget config |
| Documents | `documents.tsx` | Low — file list |
| Files | `files.tsx` | Low — file manager |
| Fiscal Years | `fiscal-years.tsx` | Low — list |
| Legal | `legal.tsx` | Low — info display |
| Modules | `modules.tsx` | Low — toggle list |
| Preferences | `preferences.tsx` | Low — form |
| Subscription | `subscription.tsx` | Low — plan display |
| Users Management | `users.tsx` | Medium — CRUD + role assignment |
| Work Units | `work-units.tsx` | Low — CRUD list |

**Update**: `(settings)/_layout.tsx` — register all screens.

---

## Phase 7: Compliance Module (3 features — NEW section)

**Location**: `mobile/app/(drawer)/(compliance)/` (NEW drawer group)

| Screen | Route | Complexity |
|--------|-------|------------|
| Compliance Dashboard | `index.tsx` | Medium — summary cards |
| Certifications List | `certifications/index.tsx` | Low — list |
| Certification Detail | `certifications/[id].tsx` | Medium — full cert view |
| Corrective Actions | `corrective-actions/index.tsx` | Low — list |

**New**: Create `(compliance)/` drawer group, `_layout.tsx`, register in drawer `_layout.tsx`.
**Update**: `mobile/app/(drawer)/_layout.tsx` — add compliance to NAV_SECTIONS.

---

## Phase 8: Core & Misc Module (8 features)

### 8.1 Core (3 screens)
**Location**: `mobile/app/(drawer)/(tabs)/` or new `(core)/` group

| Screen | Route | Complexity |
|--------|-------|------------|
| Analytics | `analytics.tsx` (tab or drawer) | High — KPI dashboard with charts |
| AI Chat | `chat.tsx` (standalone or modal) | High — streaming chat interface |
| Live Dashboard | `live-dashboard.tsx` | High — real-time data, WebSocket/SSE |

### 8.2 Misc (5 screens)
**Location**: `mobile/app/(drawer)/(misc)/`

| Screen | Route | Complexity |
|--------|-------|------------|
| Infrastructure | `infrastructure.tsx` | Low — list |
| Lab Services | `lab-services.tsx` | Medium — list + request |
| Marketplace Orders | `marketplace/orders.tsx` | Low — list |
| Quote Requests Sent | `marketplace/quote-requests-sent.tsx` | Low — list |
| Quote Requests Received | `marketplace/quote-requests-received.tsx` | Low — list |
| Utilities | `utilities.tsx` | Low — utility list |

**Update**: `(misc)/_layout.tsx` — register all screens + sub-routes.

---

## Phase 9: Drawer Navigation Updates

### Update `mobile/app/(drawer)/_layout.tsx`:
- Add **Compliance** section to NAV_SECTIONS with permission `{ action: 'read', subject: 'Certification' }`
- Add **Analytics** to overview section or business section
- Add **AI Chat** as a floating action or quick-access item

### Update `mobile/app/(drawer)/_layout.tsx` Drawer.Screen registrations:
- Add `<Drawer.Screen name="(compliance)" />`

---

## Phase 10: i18n — All 3 Languages

For every new screen, add translation keys to:
- `mobile/src/locales/en/`
- `mobile/src/locales/fr/`
- `mobile/src/locales/ar/`

Namespaces to update: `common`, `navigation`, and domain-specific namespaces as needed.

---

## Execution Order (Recommended)

| Order | Phase | Features | Est. Effort |
|-------|-------|----------|-------------|
| 1 | Phase 1 | Shared infrastructure (API, types, hooks, components) | Large — foundation for everything |
| 2 | Phase 2 | Production extensions (15 screens) | Large |
| 3 | Phase 3 | Inventory extensions (6 screens) | Medium |
| 4 | Phase 4 | Workforce extensions (5 screens) | Medium (calendar/kanban are complex) |
| 5 | Phase 5 | Accounting module (17 screens) | Large |
| 6 | Phase 6 | Settings extensions (16 screens) | Medium (mostly forms) |
| 7 | Phase 7 | Compliance module (3 screens) | Small |
| 8 | Phase 8 | Core & Misc (8 screens) | Medium (AI chat + analytics are complex) |
| 9 | Phase 9 | Drawer navigation updates | Small |
| 10 | Phase 10 | i18n keys (all 3 languages) | Ongoing — done per feature |

**Total**: 67 new screens + ~27 API services + ~19 type files + ~19 hook files + ~10 shared components

---

## Key Technical Decisions

1. **Charting library**: Need to pick one for charts (balance sheet, P&L, analytics, satellite timeseries). Options: `victory-native`, `react-native-chart-kit`, `react-native-svg-charts`. Recommend `victory-native` (most mature).
2. **Calendar**: For tasks calendar view. Need `react-native-calendars`.
3. **Kanban**: For tasks kanban. Need `react-native-gesture-handler` + `react-native-reanimated` for drag-drop.
4. **Maps**: For satellite heatmap. Need `react-native-maps` (already likely a dependency).
5. **Real-time**: For live dashboard. Options: WebSocket via `socket.io-client` or SSE. Check what NestJS uses.
6. **AI Chat streaming**: For AI chat screen. Need streaming response handling — check if NestJS chat endpoint uses SSE or WebSocket.

## Out of Scope

- New backend endpoints — all endpoints already exist
- New database tables — no schema changes needed
- PWA / Service Worker — separate initiative
- New design system — use existing mobile patterns
