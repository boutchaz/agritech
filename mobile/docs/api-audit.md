# Mobile API Endpoint Gap Audit

**Generated**: 2026-03-19
**Web Hooks Scanned**: 96
**Status Summary**: 2 EXISTS | 17 MISSING | 77 PARTIAL

Audit notes: `EXISTS` means covered by `mobile/src/lib/api.ts`; `PARTIAL` means backend route exists but mobile wrapper is incomplete/missing scope; `MISSING` means no mobile endpoint path (or hook is direct Supabase/external/local-only).

## Domain: Core
| Hook Name | Domain | Supabase Query Summary | Mobile API Endpoint | Status | Priority |
|---|---|---|---|---|---|
| useAIAlerts | Core | Uses `aiAlertsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/ai-alerts`). | PARTIAL | MEDIUM |
| useAIDiagnostics | Core | Uses `aiCalibrationApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/ai-calibration`). | PARTIAL | MEDIUM |
| useAIPlan | Core | Uses `aiPlanApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/ai-plan`). | PARTIAL | MEDIUM |
| useAIReports | Core | Uses `aiReportsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/ai-reports`). | PARTIAL | MEDIUM |
| useActivityTracking | Core | Uses `usersApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/users`). | PARTIAL | MEDIUM |
| useAddons | Core | Uses `addonsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/addons`). | PARTIAL | MEDIUM |
| useAuth | Core | No query; returns `AuthContext` state. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useAuthQueries | Core | Uses `farmsApi`, `parcelsApi`, `usersApi` REST wrappers; no direct Supabase in hook. | `/farms` + `/parcels` exist; `/users/me*` missing in mobile client | PARTIAL | MEDIUM |
| useChat | Core | Uses `chatApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/chat`). | PARTIAL | MEDIUM |
| useDashboardSummary | Core | Fetches dashboard summary via `dashboardService` (backend dashboard endpoint). | No `dashboardApi` in mobile client (backend `GET /dashboard/summary` exists) | PARTIAL | MEDIUM |
| useLiveMetrics | Core | Fetches live metrics/summary/heatmap via `liveDashboardService` (dashboard live endpoints). | No `dashboardApi` in mobile client (backend live dashboard endpoints exist) | PARTIAL | MEDIUM |
| useModuleBasedDashboard | Core | UI/local utility hook with no backend query. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/(various)`). | PARTIAL | MEDIUM |
| useModuleConfig | Core | Uses `moduleConfigApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/module-config`). | PARTIAL | MEDIUM |
| useModules | Core | Uses `modulesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/modules`). | PARTIAL | MEDIUM |
| useNotifications | Core | Direct REST calls to `/api/v1/notifications/read-all`, `/api/v1/notifications/unread/count`; no direct Supabase in hook. | No `notificationsApi` in mobile client (backend `/notifications/*` exists) | PARTIAL | MEDIUM |
| useSubscription | Core | UI/local utility hook with no backend query. | No `subscriptionsApi` in mobile client (backend `/subscriptions/*` exists) | PARTIAL | MEDIUM |
| useSubscriptionCheck | Core | Direct REST calls to `/api/v1/subscriptions/check`; no direct Supabase in hook. | No `subscriptionsApi` in mobile client (backend `POST /subscriptions/check` exists) | PARTIAL | MEDIUM |
| useZaiTTS | Core | Uses `chatApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/chat`). | PARTIAL | MEDIUM |

## Domain: Production
| Hook Name | Domain | Supabase Query Summary | Mobile API Endpoint | Status | Priority |
|---|---|---|---|---|---|
| useAICalibration | Production | Uses `aiCalibrationApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/ai-calibration`). | PARTIAL | HIGH |
| useAIRecommendations | Production | Uses `aiRecommendationsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/ai-recommendations`). | PARTIAL | HIGH |
| useAnalyses | Production | Uses `analysesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/analyses`). | PARTIAL | HIGH |
| useAnalysesQuery | Production | Uses `analysesApi`, `parcelsApi` REST wrappers; no direct Supabase in hook. | `/parcels*` exists in mobile, broader web methods absent. | PARTIAL | HIGH |
| useCachedSatelliteTimeSeries | Production | Uses `satelliteApi`, `satelliteIndicesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/satellite`). | PARTIAL | HIGH |
| useCalibrationSocket | Production | Uses browser `fetch`/socket APIs; no direct Supabase in hook. | Socket events only; depends on calibration endpoints not wrapped in mobile api.ts | PARTIAL | HIGH |
| useCalibrationV2 | Production | Uses `calibrationV2Api` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/calibration-v2`). | PARTIAL | HIGH |
| useCompliance | Production | Uses `complianceApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/compliance`). | PARTIAL | HIGH |
| useCropTemplates | Production | Direct REST calls to `/api/v1/crop-templates`; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/(various)`). | PARTIAL | HIGH |
| useCrops | Production | Uses `cropsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/crops`). | PARTIAL | HIGH |
| useF3Recalibration | Production | Uses `calibrationV2Api` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/calibration-v2`). | PARTIAL | HIGH |
| useFarmHierarchy | Production | Uses `farmHierarchyApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/farm-hierarchy`). | PARTIAL | HIGH |
| useHarvests | Production | Uses `deliveriesApi`, `harvestsApi` REST wrappers; no direct Supabase in hook. | `/organizations/:orgId/harvests/*` via `harvestsApi` (deliveries missing) | PARTIAL | HIGH |
| useLabServices | Production | Uses `labServicesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/lab-services`). | PARTIAL | HIGH |
| useLatestSatelliteIndices | Production | Uses `satelliteIndicesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/satellite-indices`). | PARTIAL | HIGH |
| useParcelData | Production | No remote query; maintains local parcel + soil/climate mock state. | No API call (local in-memory parcel model only) | MISSING | HIGH |
| useParcels | Production | Uses `parcelsApi` REST wrappers; no direct Supabase in hook. | `/parcels*` exists in mobile, broader web methods absent. | PARTIAL | HIGH |
| useParcelsQuery | Production | UI/local utility hook with no backend query. | `/parcels` + `/farms` reads exist; create/update/delete + applications missing in mobile client | PARTIAL | HIGH |
| useParcelsWithDetails | Production | Uses `farmsApi`, `parcelsApi` REST wrappers; no direct Supabase in hook. | `/farms`, `/farms/:id`, `/parcels` via mobile `farmsApi` + `parcelsApi` | EXISTS | HIGH |
| usePestAlerts | Production | Uses `pestAlertsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/pest-alerts`). | PARTIAL | HIGH |
| useProductionIntelligence | Production | Uses `productionIntelligenceApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/production-intelligence`). | PARTIAL | HIGH |
| useRecommendations | Production | Calls AI edge-function recommendation pipeline (non-NestJS, non-Supabase in hook). | Edge Function path, not NestJS/mobile API | MISSING | HIGH |
| useSatelliteIndices | Production | UI/local utility hook with no backend query. | No satellite API wrapper in mobile client (backend `/satellite-*` exists) | PARTIAL | HIGH |
| useSoilAnalyses | Production | Uses `parcelsApi`, `soilAnalysesApi` REST wrappers; no direct Supabase in hook. | `/parcels*` exists in mobile, broader web methods absent. | PARTIAL | HIGH |
| useSourceDataMetadata | Production | Uses `sourceDataApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/source-data`). | PARTIAL | HIGH |
| useStructures | Production | Uses `structuresApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/structures`). | PARTIAL | HIGH |
| useTreeManagement | Production | Uses `plantationTypesApi`, `treeCategoriesApi`, `treesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/plantation-types`). | PARTIAL | HIGH |
| useWeatherAnalytics | Production | UI/local utility hook with no backend query. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/(various)`). | PARTIAL | HIGH |
| useWeatherForecast | Production | Fetches 15-day forecast from OpenWeather; no Supabase/NestJS query. | External OpenWeather endpoint only | MISSING | HIGH |

## Domain: Workforce
| Hook Name | Domain | Supabase Query Summary | Mobile API Endpoint | Status | Priority |
|---|---|---|---|---|---|
| useAssignableUsers | Workforce | Uses `organizationUsersApi`, `tasksApi` REST wrappers; no direct Supabase in hook. | `/tasks/*` partially covered by mobile `tasksApi`. | PARTIAL | HIGH |
| useTaskAssignments | Workforce | Uses `taskAssignmentsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/task-assignments`). | PARTIAL | HIGH |
| useTasks | Workforce | Uses `tasksApi` REST wrappers; no direct Supabase in hook. | `/tasks/*` via mobile `tasksApi` (categories/assignment flows still absent) | PARTIAL | HIGH |
| useWorkers | Workforce | Uses `workersApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/workers`). | PARTIAL | HIGH |

## Domain: Inventory
| Hook Name | Domain | Supabase Query Summary | Mobile API Endpoint | Status | Priority |
|---|---|---|---|---|---|
| useFarmStockLevels | Inventory | Uses `itemsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/items`). | PARTIAL | HIGH |
| useInventory | Inventory | Uses `itemsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/items`). | PARTIAL | HIGH |
| useItemFarmUsage | Inventory | Uses `itemsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/items`). | PARTIAL | HIGH |
| useItems | Inventory | Uses `itemsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/items`). | PARTIAL | HIGH |
| useOpeningStock | Inventory | Uses `openingStockApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/opening-stock`). | PARTIAL | HIGH |
| useReceptionBatches | Inventory | Uses `receptionBatchesApi`, `warehousesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/reception-batches`). | PARTIAL | HIGH |
| useStockEntries | Inventory | Uses `stockEntriesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/stock-entries`). | PARTIAL | HIGH |
| useSuppliers | Inventory | Uses `suppliersApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/suppliers`). | PARTIAL | HIGH |
| useWarehouses | Inventory | Uses `warehousesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/warehouses`). | PARTIAL | HIGH |

## Domain: Accounting
| Hook Name | Domain | Supabase Query Summary | Mobile API Endpoint | Status | Priority |
|---|---|---|---|---|---|
| useAccountMappings | Accounting | Uses `accountMappingsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/account-mappings`). | PARTIAL | HIGH |
| useAccountingPayments | Accounting | Uses `paymentsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/payments`). | PARTIAL | HIGH |
| useAccounts | Accounting | Uses `accountingApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/accounting`). | PARTIAL | HIGH |
| useAgriculturalAccounting | Accounting | Uses `biologicalAssetsApi`, `campaignsApi`, `cropCycleStagesApi` + more REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/biological-assets`). | PARTIAL | HIGH |
| useCostCenters | Accounting | Uses `costCentersApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/cost-centers`). | PARTIAL | HIGH |
| useCurrency | Accounting | UI/local utility hook with no backend query. | No endpoint needed (reads organization currency in auth context) | PARTIAL | HIGH |
| useCustomers | Accounting | Uses `customersApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/customers`). | PARTIAL | HIGH |
| useFinancialReports | Accounting | Uses `financialReportsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/financial-reports`). | PARTIAL | HIGH |
| useInvoices | Accounting | Uses `invoicesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/invoices`). | PARTIAL | HIGH |
| useJournalEntries | Accounting | Uses `journalEntriesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/journal-entries`). | PARTIAL | HIGH |
| usePayments | Accounting | Uses `paymentRecordsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/payment-records`). | PARTIAL | HIGH |
| useProfitabilityQuery | Accounting | Uses `profitabilityApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/profitability`). | PARTIAL | HIGH |
| usePurchaseOrders | Accounting | Uses `purchaseOrdersApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/purchase-orders`). | PARTIAL | HIGH |
| useQuotes | Accounting | Uses `quotesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/quotes`). | PARTIAL | HIGH |
| useSalesOrders | Accounting | Uses `salesOrdersApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/sales-orders`). | PARTIAL | HIGH |
| useTaxes | Accounting | Uses `taxesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/taxes`). | PARTIAL | HIGH |

## Domain: Settings
| Hook Name | Domain | Supabase Query Summary | Mobile API Endpoint | Status | Priority |
|---|---|---|---|---|---|
| useDocumentTemplates | Settings | Uses `documentTemplatesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/document-templates`). | PARTIAL | MEDIUM |
| useFarmRoles | Settings | Uses `farmRolesApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/farm-roles`). | PARTIAL | MEDIUM |
| useLocalizedReferenceData | Settings | UI/local utility hook with no backend query. | Not covered in mobile `src/lib/api.ts`. | MISSING | MEDIUM |
| useOnboardingPersistence | Settings | No server query; persists onboarding draft in `localStorage`. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useOrganizationAISettings | Settings | Uses `organizationAISettingsApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/organization-aisettings`). | PARTIAL | MEDIUM |
| useReferenceData | Settings | Uses `referenceDataApi` REST wrappers; no direct Supabase in hook. | No dedicated mobile wrapper; backend endpoint family exists (e.g. `/reference-data`). | PARTIAL | MEDIUM |
| useRoleBasedAccess | Settings | Reads current user role/permissions (`GET /api/v1/auth/me/role`) for permission checks. | `/auth/me/role` via `authApi.getUserRole` | EXISTS | MEDIUM |
| useStorage | Settings | Uses `storageApi` REST wrappers; no direct Supabase in hook. | Only upload is covered via mobile `filesApi.uploadImage` | PARTIAL | MEDIUM |
| useTifUpload | Settings | Uses `storageApi` REST wrappers; no direct Supabase in hook. | Only upload is covered via mobile `filesApi.uploadImage` | PARTIAL | MEDIUM |

## Domain: Misc
| Hook Name | Domain | Supabase Query Summary | Mobile API Endpoint | Status | Priority |
|---|---|---|---|---|---|
| useFormErrors | Misc | UI/local utility hook with no backend query. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useMapProvider | Misc | UI/local utility hook with no backend query. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useMediaQuery | Misc | UI/local utility hook with no backend query. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useMultiTenantLookups | Misc | Direct Supabase CRUD on `crop_types`, `product_categories`, `task_categories`, `test_types` scoped by `organization_id`. | No mobile endpoint; direct `authSupabase.from(...)` in hook | MISSING | LOW |
| useNetworkStatus | Misc | Uses browser `fetch`/socket APIs; no direct Supabase in hook. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useOrgQuery | Misc | UI/local utility hook with no backend query. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useQueryData | Misc | UI/local utility hook with no backend query. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useSensorData | Misc | Uses browser `fetch`/socket APIs; no direct Supabase in hook. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useSidebarLayout | Misc | UI/local utility hook with no backend query. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useTextToSpeech | Misc | UI/local utility hook with no backend query. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
| useVoiceInput | Misc | UI/local utility hook with no backend query. | Not covered in mobile `src/lib/api.ts`. | MISSING | LOW |
