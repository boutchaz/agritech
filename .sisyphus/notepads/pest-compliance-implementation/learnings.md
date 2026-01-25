# Pest/Disease Alert System - Migration Implementation

## Completed Tasks

### 1. Migration File Created: `20260125000000_add_pest_disease_alerts.sql`
- **Location**: `project/supabase/migrations/20260125000000_add_pest_disease_alerts.sql`
- **Size**: 366 lines
- **Status**: ✅ Complete

### 2. Performance Alerts Table Extension
Extended existing `performance_alerts` table with 5 new columns:
- `pest_type TEXT` - Type of pest detected
- `disease_type TEXT` - Type of disease detected
- `affected_area_percentage NUMERIC(5,2)` - Percentage affected (0-100) with CHECK constraint
- `detection_method TEXT` - Method used (visual_inspection, trap_monitoring, lab_test, field_scout, automated_sensor, worker_report)
- `confidence_score NUMERIC(3,2)` - Confidence level (0-1) with CHECK constraint

All columns include COMMENT ON COLUMN documentation.

### 3. Pest/Disease Library Table
Created reference table `pest_disease_library` with:
- **Columns**: id (UUID PK), name, type (pest/disease), crop_types (TEXT[]), symptoms, treatment, prevention, severity, image_url, is_active, created_at, updated_at
- **Indexes**: 4 indexes (type, severity, active, crop_types GIN)
- **Constraints**: UNIQUE(name, type), CHECK on severity
- **RLS**: Enabled with read/write policies
- **Seed Data**: 6 common pests/diseases inserted:
  - Aphids (pest)
  - Powdery Mildew (disease)
  - Spider Mites (pest)
  - Blight (disease)
  - Whiteflies (pest)
  - Root Rot (disease)

### 4. Pest/Disease Reports Table
Created `pest_disease_reports` table with:
- **Columns**: 
  - Core: id (UUID PK), organization_id, farm_id, parcel_id, reporter_id
  - Reference: pest_disease_id (FK to library)
  - Data: severity, affected_area_percentage, photo_urls (TEXT[]), location (GEOGRAPHY), notes
  - Status: status (pending/verified/treated/resolved/dismissed)
  - Verification: verified_by, verified_at, treatment_applied, treatment_date
  - Timestamps: created_at, updated_at
- **Indexes**: 9 indexes (org, farm, parcel, reporter, pest_disease, severity, status, created, location GIST)
- **RLS**: Enabled with 4 policies (read, create, update, delete) - organization-level access
- **Realtime**: Added to supabase_realtime publication

### 5. RLS Policies
**pest_disease_library**:
- Read: Active records visible to all, inactive only to admins/service_role
- Write: Admins and service_role only

**pest_disease_reports**:
- Read: Organization members can see their org's reports
- Create: Organization members can create reports
- Update: Organization members can update their org's reports
- Delete: Organization members can delete their org's reports

### 6. Helper Functions
Created 2 PL/pgSQL functions:

**create_alert_from_pest_report(p_report_id UUID)**
- Creates a performance_alert from a pest_disease_report
- Automatically sets alert_type to 'quality_issue'
- Sets confidence_score to 0.8
- Includes reporter name and notes in alert message
- Returns alert_id

**update_pest_report_status(p_report_id UUID, p_status TEXT, p_verified_by UUID, p_treatment_applied TEXT)**
- Updates report status and verification/treatment info
- Automatically sets verified_at when status='verified'
- Automatically sets treatment_date when treatment_applied is provided
- Returns BOOLEAN indicating success

Both functions have GRANT EXECUTE to authenticated users.

## Schema Patterns Followed

✅ UUID primary keys with gen_random_uuid() defaults
✅ organization_id on all tables for multi-tenancy
✅ created_at/updated_at TIMESTAMPTZ with NOW() defaults
✅ CHECK constraints for enum-like fields
✅ COMMENT ON COLUMN for documentation
✅ Proper indexes on foreign keys and frequently queried columns
✅ RLS policies following org_read_*, org_write_*, org_update_*, org_delete_* pattern
✅ ALTER TABLE for extending existing tables (not DROP/CREATE)
✅ IF NOT EXISTS clauses for idempotency
✅ Realtime publication for real-time updates

## Key Design Decisions

1. **Pest/Disease Library as Reference Table**: Allows reuse of common pests/diseases across organizations and provides standardized treatment/prevention info

2. **Separate Reports Table**: Keeps worker observations separate from alerts, allowing verification workflow before escalation

3. **Geography Type for Location**: Uses PostGIS GEOGRAPHY(POINT, 4326) for GPS coordinates with GIST index for spatial queries

4. **Photo URLs as TEXT Array**: Allows multiple photos per report, stored as URLs (actual files in cloud storage)

5. **Status Workflow**: pending → verified → treated → resolved (or dismissed)

6. **Confidence Score**: Allows tracking detection certainty, useful for ML integration later

7. **Affected Area Percentage**: Quantifies severity beyond just severity level, useful for prioritization

## Testing Recommendations

1. Test RLS policies with different user roles
2. Verify indexes are used in query plans
3. Test geography queries with actual coordinates
4. Verify realtime updates work for pest_disease_reports
5. Test function execution permissions
6. Verify seed data inserted correctly

## Future Enhancements

- Add treatment recommendation engine based on pest_disease_id
- Add photo upload/storage integration
- Add automated alert creation triggers
- Add pest/disease identification via image ML
- Add treatment effectiveness tracking
- Add seasonal pest/disease patterns

## NestJS Module Implementation - Pest/Disease Alerts API

### Completed Tasks

#### 1. Module Structure Created
- **Location**: `agritech-api/src/modules/pest-alerts/`
- **Files**:
  - `pest-alerts.module.ts` - Module definition with imports
  - `pest-alerts.service.ts` - Business logic and database operations
  - `pest-alerts.controller.ts` - REST API endpoints
  - `dto/create-pest-report.dto.ts` - Create report validation
  - `dto/update-pest-report.dto.ts` - Update report validation
  - `dto/pest-report-response.dto.ts` - Response types

#### 2. DTOs Implemented
**CreatePestReportDto**:
- Enums: `PestReportSeverity` (low, medium, high, critical)
- Enums: `DetectionMethod` (visual_inspection, trap_monitoring, lab_test, field_scout, automated_sensor, worker_report)
- Nested: `LocationDto` for GPS coordinates with validation
- Validators: `@IsUUID`, `@IsEnum`, `@IsNumber`, `@Min`, `@Max`, `@IsArray`, `@IsString`
- Optional fields: affected_area_percentage, detection_method, photo_urls, location, notes

**UpdatePestReportDto**:
- Enum: `PestReportStatus` (pending, verified, treated, resolved, dismissed)
- Fields: status (required), treatment_applied (optional)

**Response DTOs**:
- `PestReportResponseDto` - Full report with joined data (pest_disease, farm, parcel, reporter, verifier)
- `PestDiseaseLibraryDto` - Library reference data

#### 3. Service Methods Implemented
**getLibrary(organizationId)**: Fetch active pest/disease library entries
**getReports(organizationId)**: Get all reports with joined data, ordered by created_at DESC
**getReport(organizationId, reportId)**: Get single report with full details
**createReport(userId, organizationId, dto)**: 
- Validates farm/parcel belong to organization
- Validates pest_disease_id exists in library
- Converts GPS location to PostGIS POINT format
- Sends notifications to organization admins
- Returns created report with joined data

**updateReport(userId, organizationId, reportId, dto)**:
- Uses `update_pest_report_status` RPC function
- Automatically sets verified_by and timestamps
- Sends notification to reporter on verified/treated status
- Returns updated report with joined data

**deleteReport(organizationId, reportId)**: Soft delete with organization check

**escalateToAlert(userId, organizationId, reportId)**:
- Uses `create_alert_from_pest_report` RPC function
- Creates performance_alert from pest_disease_report
- Sends notifications to organization admins
- Returns alert_id

#### 4. Controller Endpoints Implemented
- `GET /pest-alerts/library` - Get pest/disease reference library
- `GET /pest-alerts/reports` - Get all reports for organization
- `GET /pest-alerts/reports/:id` - Get single report
- `POST /pest-alerts/reports` - Create new report (201 Created)
- `PATCH /pest-alerts/reports/:id` - Update report status (200 OK)
- `DELETE /pest-alerts/reports/:id` - Delete report (204 No Content)
- `POST /pest-alerts/reports/:id/escalate` - Escalate to performance alert (200 OK)

All endpoints:
- Use `@UseGuards(JwtAuthGuard)` for authentication
- Use `@UseGuards(PoliciesGuard)` with `@CheckPolicies` for authorization
- Include Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`)
- Filter by organization_id from `x-organization-id` header
- Use proper HTTP status codes

#### 5. Module Registration
- Added `PestAlertsModule` to `app.module.ts` imports
- Module imports: `DatabaseModule`, `NotificationsModule`
- Module exports: `PestAlertsService` (for potential reuse)

#### 6. Integration Points
**DatabaseService**: Supabase admin client for database operations
**NotificationsService**: 
- `createNotification()` - Single user notification
- `createNotificationsForUsers()` - Bulk notifications to admins
- Notification types: 'general' (used for pest alerts)

**CASL Authorization**:
- Action.Read, Action.Create, Action.Update, Action.Delete on 'Farm' subject
- Organization-level access control via RLS policies

#### 7. Error Handling Patterns
- `NotFoundException` - Report/resource not found (404)
- `BadRequestException` - Invalid farm/parcel/pest_disease_id (400)
- `InternalServerErrorException` - Database errors (500)
- Try/catch blocks around notification sending (non-blocking failures)
- Proper error logging with `Logger`

#### 8. Database Query Patterns
**Organization Filtering**: All queries include `.eq('organization_id', organizationId)`
**Joined Data**: Use Supabase `.select()` with nested syntax:
```typescript
.select(`
  *,
  pest_disease:pest_disease_library(id, name, type, symptoms, treatment, prevention),
  farm:farms(id, name),
  parcel:parcels(id, name),
  reporter:user_profiles(id, first_name, last_name)
`)
```

**PostGIS Location**: Convert DTO location to WKT format:
```typescript
locationValue = `POINT(${dto.location.longitude} ${dto.location.latitude})`;
```

**RPC Functions**: Use `.rpc()` for helper functions:
- `update_pest_report_status(p_report_id, p_status, p_verified_by, p_treatment_applied)`
- `create_alert_from_pest_report(p_report_id)`

#### 9. Notification Workflow
**On Report Creation**:
- Fetch organization admins from `organization_users` table
- Send bulk notification with pest/disease name, parcel name, severity
- Include report_id, pest_disease_id, severity in notification data

**On Status Update (verified/treated)**:
- Send notification to original reporter
- Include report_id and new status in notification data

**On Escalation to Alert**:
- Send bulk notification to organization admins
- Include report_id, alert_id, severity in notification data

#### 10. Build Verification
- ✅ TypeScript compilation successful
- ✅ No LSP errors in module files
- ✅ Module registered in app.module.ts
- ✅ All imports resolved correctly

### Key Patterns Followed

1. **DTO Validation**: class-validator decorators on all input DTOs
2. **Swagger Documentation**: Complete API documentation with @Api* decorators
3. **Organization Isolation**: All queries filtered by organization_id
4. **Error Handling**: Proper HTTP exceptions with descriptive messages
5. **Logging**: Logger.log() for success, Logger.error() for failures, Logger.warn() for non-critical issues
6. **Async/Await**: All database operations use async/await
7. **Type Safety**: No `any` types except for notification type enum (existing limitation)
8. **Authorization**: CASL policies on all endpoints except library (read-only reference data)
9. **HTTP Status Codes**: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error

### Testing Recommendations

1. Test organization isolation (users can't access other org's reports)
2. Test farm/parcel validation (reject invalid IDs)
3. Test pest_disease_id validation (reject invalid library IDs)
4. Test GPS location conversion to PostGIS format
5. Test notification delivery to admins and reporters
6. Test RPC function calls (update_pest_report_status, create_alert_from_pest_report)
7. Test authorization with different roles (farm_manager, farm_worker, viewer)
8. Test status workflow transitions (pending → verified → treated → resolved)
9. Test escalation to performance alert
10. Test error handling for database failures

### Future Enhancements

- Add filtering/pagination to GET /reports endpoint
- Add search by severity, status, pest_disease_id
- Add date range filtering for reports
- Add photo upload integration (currently accepts URLs)
- Add bulk report creation for field scouts
- Add report analytics (most common pests, affected areas)
- Add treatment effectiveness tracking
- Add automated alert creation based on severity thresholds
- Add ML-based pest/disease identification from photos

## Frontend API Client & Hooks Implementation

### Completed Tasks

#### 1. API Client File Created: `project/src/lib/api/pest-alerts.ts`
- **Location**: `project/src/lib/api/pest-alerts.ts`
- **Size**: 180 lines
- **Status**: ✅ Complete

**Exports**:
- Types: `LocationDto`, `PestReportSeverity`, `DetectionMethod`, `PestReportStatus`, `CreatePestReportDto`, `UpdatePestReportDto`, `PestDiseaseLibraryItem`, `PestReportResponseDto`, `EscalateToAlertResponse`
- API client object: `pestAlertsApi` with 7 methods

**API Methods**:
1. `getPestDiseaseLibrary(organizationId)` - GET `/api/v1/pest-alerts/library`
2. `getPestReports(organizationId)` - GET `/api/v1/pest-alerts/reports`
3. `getPestReport(organizationId, reportId)` - GET `/api/v1/pest-alerts/reports/:id`
4. `createPestReport(organizationId, data)` - POST `/api/v1/pest-alerts/reports`
5. `updatePestReport(organizationId, reportId, data)` - PATCH `/api/v1/pest-alerts/reports/:id`
6. `deletePestReport(organizationId, reportId)` - DELETE `/api/v1/pest-alerts/reports/:id`
7. `escalatePestReport(organizationId, reportId)` - POST `/api/v1/pest-alerts/reports/:id/escalate`

**Key Design Decisions**:
- Uses `apiClient` from `api-client.ts` (fetch-based, not axios)
- All methods accept `organizationId` as first parameter for multi-tenancy
- Response types include joined data (pest_disease, farm, parcel, reporter, verifier)
- Location stored as GeoJSON format with coordinates array
- All endpoints use `/api/v1/pest-alerts` base path

#### 2. TanStack Query Hooks File Created: `project/src/hooks/usePestAlerts.ts`
- **Location**: `project/src/hooks/usePestAlerts.ts`
- **Size**: 180 lines
- **Status**: ✅ Complete

**Query Hooks** (3 total):
1. `usePestDiseaseLibrary(organizationId)` - Fetch reference library
   - Query key: `['pest-alerts', 'library', organizationId]`
   - Enabled: `!!organizationId`
   - Stale time: 5 minutes
   - Returns: `PestDiseaseLibraryItem[]`

2. `usePestReports(organizationId)` - Fetch all reports
   - Query key: `['pest-alerts', 'reports', organizationId]`
   - Enabled: `!!organizationId`
   - Stale time: 5 minutes
   - Returns: `PestReportResponseDto[]`

3. `usePestReport(organizationId, reportId)` - Fetch single report
   - Query key: `['pest-alerts', 'report', reportId]`
   - Enabled: `!!reportId && !!organizationId`
   - Stale time: 5 minutes
   - Returns: `PestReportResponseDto | null`

**Mutation Hooks** (4 total):
1. `useCreatePestReport()` - Create new report
   - Invalidates: `['pest-alerts', 'reports', organizationId]`
   - Success toast: "Pest report created successfully"
   - Error toast: Shows error message

2. `useUpdatePestReport()` - Update report status
   - Invalidates: `['pest-alerts', 'report', reportId]`, `['pest-alerts', 'reports', organizationId]`
   - Success toast: "Pest report updated successfully"
   - Error toast: Shows error message

3. `useDeletePestReport()` - Delete report
   - Invalidates: `['pest-alerts', 'reports', organizationId]`
   - Success toast: "Pest report deleted successfully"
   - Error toast: Shows error message

4. `useEscalatePestReport()` - Escalate to alert
   - Invalidates: `['pest-alerts', 'report', reportId]`, `['pest-alerts', 'reports', organizationId]`
   - Success toast: "Pest report escalated to alert successfully"
   - Error toast: Shows error message

**Key Patterns Followed**:
- All queries use `staleTime: 5 * 60 * 1000` (5 minutes)
- All queries use `enabled` guard for conditional execution
- All mutations use `useQueryClient()` for invalidation
- All mutations have `onSuccess` and `onError` handlers
- Error handling uses `sonner` toast notifications
- Unused variables prefixed with `_` to avoid linting warnings
- Query keys follow pattern: `['pest-alerts', 'scope', organizationId]`

#### 3. Build Verification
- ✅ TypeScript compilation successful (`pnpm --filter agriprofy type-check`)
- ✅ No type errors in new files
- ✅ All imports resolved correctly
- ✅ Proper integration with existing API client and TanStack Query patterns

### Integration Points

**API Client Integration**:
- Uses `apiClient` from `project/src/lib/api-client.ts`
- Leverages existing `getApiHeaders()` and organization ID handling
- Follows existing pattern of passing `organizationId` to all methods

**TanStack Query Integration**:
- Uses `useQuery` for GET requests
- Uses `useMutation` for POST/PATCH/DELETE requests
- Uses `useQueryClient` for cache invalidation
- Follows existing patterns from `useHarvests.ts`, `useDeliveries.ts`

**Error Handling**:
- Uses `sonner` toast for user feedback
- Catches errors in mutation handlers
- Displays user-friendly error messages

### Testing Recommendations

1. Test query hooks with different organization IDs
2. Test mutation hooks with valid/invalid data
3. Verify query invalidation after mutations
4. Test error handling with network failures
5. Verify toast notifications appear correctly
6. Test conditional query execution with `enabled` flag
7. Test stale time behavior (5 minute cache)

### Future Enhancements

- Add filtering/pagination to `usePestReports()` hook
- Add search by severity, status, pest_disease_id
- Add date range filtering for reports
- Add bulk operations (create multiple reports)
- Add report analytics hook (most common pests, affected areas)
- Add real-time updates via Supabase subscriptions
- Add optimistic updates for mutations

## Frontend UI Implementation - Pest/Disease Alerts

### Completed Tasks

#### 1. UI Components Created
- **PestAlertCard.tsx**: Card component for displaying individual reports with severity/status badges and photos.
- **PestReportsList.tsx**: Grid layout for reports with loading skeletons and empty states.
- **CreatePestReportDialog.tsx**: Form dialog for creating new reports using `react-hook-form` and `zod`.

#### 2. Routes Created
- **Dashboard**: `project/src/routes/_authenticated/pest-alerts/index.tsx`
  - Displays summary statistics (Active, Critical, Resolved)
  - Provides search and filtering (Severity, Status)
  - Lists all reports
- **Detail View**: `project/src/routes/_authenticated/pest-alerts/$reportId.tsx`
  - Shows full report details
  - Displays photo gallery
  - Provides actions: Update Status, Escalate to Alert
  - Shows history timeline

#### 3. Key Implementation Details
- **Form Handling**: Used `react-hook-form` with `zod` validation.
- **UI Library**: Used `shadcn/ui` components (Card, Dialog, Button, Badge, Select, Input, Textarea).
- **Icons**: Used `lucide-react` for consistent iconography.
- **Routing**: Used `TanStack Router` for navigation and parameter handling.
- **State Management**: Used `TanStack Query` hooks for data fetching and mutations.

#### 4. Learnings & Gotchas
- **Component Imports**: `shadcn/ui` components have mixed casing (`Input.tsx` vs `select.tsx`). `Select` component has a native version and a Radix version (`radix-select.tsx`).
- **Form Wrapper**: `Form` component was missing, so `FormField` wrapper was used with manual error handling.
- **Type Safety**: `HierarchyFarm` type uses `farm_id`/`farm_name` instead of `id`/`name`.
- **Route Registration**: New routes need to be registered in the route tree (handled by codegen usually).

#### 5. Verification
- ✅ UI components follow design system
- ✅ Forms validate correctly
- ✅ Data fetching works with loading states
- ✅ Mutations trigger toast notifications and query invalidation

## Compliance Tracking System - Database Migration

### Completed Tasks

#### 1. Migration File Created: `20260125000001_add_compliance_tracking.sql`
- **Location**: `project/supabase/migrations/20260125000001_add_compliance_tracking.sql`
- **Size**: 21 KB (650+ lines)
- **Status**: ✅ Complete

#### 2. Certifications Table
Created `certifications` table with:
- **Columns**: 
  - Core: id (UUID PK), organization_id (FK), created_at, updated_at
  - Certification: certification_type (CHECK), certification_number, issued_date, expiry_date
  - Status: status (CHECK: active, expired, pending_renewal, suspended)
  - Details: issuing_body, scope, documents (JSONB), audit_schedule (JSONB)
- **Indexes**: 4 indexes (org, type, status, expiry_date)
- **Constraints**: UNIQUE(organization_id, certification_type, certification_number), CHECK on certification_type and status
- **Certification Types Supported**: GlobalGAP, HACCP, ISO9001, ISO14001, Organic, FairTrade, Rainforest, USDA_Organic
- **RLS**: Enabled with 4 policies (read, create, update, delete) - organization-level access

#### 3. Compliance Checks Table
Created `compliance_checks` table with:
- **Columns**:
  - Core: id (UUID PK), organization_id (FK), certification_id (FK), created_at, updated_at
  - Check Details: check_type (CHECK), check_date, status (CHECK), auditor_name
  - Results: findings (JSONB), corrective_actions (JSONB), score (0-100)
  - Scheduling: next_check_date
- **Indexes**: 5 indexes (org, cert, type, status, date)
- **Check Types**: pesticide_usage, traceability, worker_safety, record_keeping, environmental, quality_control
- **Status Values**: compliant, non_compliant, needs_review, in_progress
- **RLS**: Enabled with 4 policies (read, create, update, delete) - organization-level access

#### 4. Compliance Requirements Table
Created `compliance_requirements` reference table with:
- **Columns**:
  - Core: id (UUID PK), created_at, updated_at
  - Reference: certification_type (CHECK), requirement_code, requirement_description
  - Details: category, verification_method, frequency, is_critical (BOOLEAN)
- **Indexes**: 4 indexes (type, code, category, critical)
- **Constraints**: UNIQUE(certification_type, requirement_code)
- **RLS**: Enabled with read-only policy (all users can read, admins can write)
- **Seed Data**: 20 requirements total
  - GlobalGAP: 10 requirements (AF.1.1, AF.2.1, CB.4.1, CB.5.1, CB.7.1, FV.5.1, FV.6.1, SA.1.1, SA.2.1, SA.3.1)
  - HACCP: 5 requirements (CCP1-CCP5)
  - ISO 9001: 5 requirements (QMS.1-QMS.5)

#### 5. Compliance Evidence Table
Created `compliance_evidence` table with:
- **Columns**:
  - Core: id (UUID PK), compliance_check_id (FK), created_at, updated_at
  - Evidence: evidence_type (CHECK), file_url, description
  - Metadata: uploaded_by (FK to user_profiles), uploaded_at
- **Indexes**: 4 indexes (check, type, uploaded_by, uploaded_at)
- **Evidence Types**: document, photo, video, inspection_report, test_result, record, certificate, other
- **RLS**: Enabled with 3 policies (read, create, delete) - organization-level access via compliance_check

#### 6. RLS Policies
**certifications**:
- Read: Organization members can see their org's certifications
- Create: Organization members can create certifications
- Update: Organization members can update their org's certifications
- Delete: Organization members can delete their org's certifications

**compliance_checks**:
- Read: Organization members can see their org's checks
- Create: Organization members can create checks
- Update: Organization members can update their org's checks
- Delete: Organization members can delete their org's checks

**compliance_requirements**:
- Read: All authenticated users can read (reference data)
- Write: Admins and service_role only

**compliance_evidence**:
- Read: Organization members can see evidence for their org's checks
- Create: Organization members can upload evidence
- Delete: Organization members can delete evidence

#### 7. Realtime Publication
Added all three tables to `supabase_realtime` publication:
- `certifications`
- `compliance_checks`
- `compliance_evidence`

#### 8. Seed Data
Inserted 20 compliance requirements across 3 certification standards:

**GlobalGAP (10 requirements)**:
- AF.1.1: Traceability system (CRITICAL)
- AF.2.1: Record keeping (CRITICAL)
- CB.4.1: Fertilizer application records (CRITICAL)
- CB.5.1: Irrigation water quality testing
- CB.7.1: Integrated pest management plan (CRITICAL)
- FV.5.1: Harvest hygiene procedures (CRITICAL)
- FV.6.1: Post-harvest handling
- SA.1.1: Worker safety training (CRITICAL)
- SA.2.1: Personal protective equipment (CRITICAL)
- SA.3.1: Child labor prevention (CRITICAL)

**HACCP (5 requirements - all CRITICAL)**:
- CCP1: Receiving raw materials inspection
- CCP2: Storage temperature monitoring
- CCP3: Processing temperature control
- CCP4: Metal detection
- CCP5: Final product testing

**ISO 9001 (5 requirements)**:
- QMS.1: Quality management system documentation (CRITICAL)
- QMS.2: Management review
- QMS.3: Customer satisfaction monitoring
- QMS.4: Internal audit program (CRITICAL)
- QMS.5: Personnel competence and training

## Schema Patterns Followed

✅ UUID primary keys with gen_random_uuid() defaults
✅ organization_id on all tables for multi-tenancy
✅ created_at/updated_at TIMESTAMPTZ with NOW() defaults
✅ CHECK constraints for enum-like fields (certification_type, status, check_type, evidence_type)
✅ COMMENT ON TABLE and COMMENT ON COLUMN for documentation
✅ Proper indexes on foreign keys and frequently queried columns
✅ RLS policies following org_read_*, org_write_*, org_update_*, org_delete_* pattern
✅ IF NOT EXISTS clauses for idempotency
✅ Realtime publication for real-time updates
✅ JSONB columns for flexible data (documents, audit_schedule, findings, corrective_actions)
✅ UNIQUE constraints for preventing duplicates

## Key Design Decisions

1. **Certifications as Core Entity**: Separate table for certifications allows tracking multiple certifications per organization with independent audit schedules

2. **Compliance Checks as Audit Records**: Separate table from certifications allows tracking multiple audits per certification over time

3. **Compliance Requirements as Reference Data**: Global reference table allows reuse across organizations and provides standardized requirement definitions

4. **Evidence as Supporting Documents**: Separate table allows attaching multiple documents/photos to each compliance check

5. **JSONB for Flexible Data**: 
   - `documents`: Array of {url, type, uploaded_at} for certification documents
   - `audit_schedule`: {next_audit_date, audit_frequency, auditor_name} for scheduling
   - `findings`: Array of {requirement_code, finding_description, severity} for audit findings
   - `corrective_actions`: Array of {action_description, due_date, responsible_person, status} for tracking remediation

6. **Status Workflow**: 
   - Certifications: active → pending_renewal → expired (or suspended)
   - Compliance Checks: in_progress → compliant/non_compliant/needs_review

7. **Critical Requirements Flag**: Allows distinguishing between critical requirements (failure = non-compliance) and non-critical requirements

8. **Verification Method & Frequency**: Provides guidance on how to verify each requirement and how often

## Testing Recommendations

1. Test RLS policies with different user roles and organizations
2. Verify indexes are used in query plans for common queries
3. Test JSONB data insertion and querying
4. Verify realtime updates work for all three tables
5. Test seed data inserted correctly with no conflicts
6. Test unique constraints (organization_id, certification_type, certification_number)
7. Test CHECK constraints for enum values
8. Test foreign key cascading on organization deletion

## Future Enhancements

- Add compliance dashboard with certification expiry alerts
- Add automated email notifications for upcoming audits
- Add compliance score calculation based on check results
- Add compliance trend analysis and reporting
- Add integration with external audit management systems
- Add document storage and versioning
- Add compliance timeline/history view
- Add bulk import of requirements from standard templates
- Add compliance checklist generation from requirements
- Add audit scheduling automation


## Compliance DTOs Implementation (2026-01-25)

### Files Created
1. `create-certification.dto.ts` - Full certification creation with nested DTOs
2. `update-certification.dto.ts` - PartialType wrapper for updates
3. `create-compliance-check.dto.ts` - Compliance check with findings and corrective actions
4. `update-compliance-check.dto.ts` - PartialType wrapper for updates
5. `create-evidence.dto.ts` - Evidence upload DTO

### Key Patterns Applied
- **Enums for Type Safety**: All certification types, statuses, check types, and evidence types defined as enums matching database schema
- **Nested DTOs**: DocumentDto, AuditScheduleDto, FindingDto, CorrectiveActionDto for complex JSONB fields
- **Validation Decorators**: 
  - `@IsEnum()` for all enum fields
  - `@IsDateString()` for ISO 8601 date fields
  - `@IsUUID()` for foreign keys
  - `@IsNotEmpty()` for required strings
  - `@IsOptional()` for optional fields
  - `@ValidateNested()` + `@Type()` for nested objects/arrays
  - `@Min()` / `@Max()` for numeric constraints (score 0-100)
- **Swagger Documentation**: All fields documented with `@ApiProperty` and `@ApiPropertyOptional`
- **PartialType Pattern**: Update DTOs extend PartialType(CreateDto) for consistency

### Database Schema Alignment
- Certification types: GlobalGAP, HACCP, ISO9001, ISO14001, Organic, FairTrade, Rainforest, USDA_Organic
- Certification statuses: active, expired, pending_renewal, suspended
- Check types: pesticide_usage, traceability, worker_safety, record_keeping, environmental, quality_control
- Check statuses: compliant, non_compliant, needs_review, in_progress
- Evidence types: document, photo, video, inspection_report, test_result, record, certificate, other

### Build Verification
- TypeScript compilation shows decorator warnings (expected with experimentalDecorators)
- Build passes successfully with no blocking errors
- All 5 DTO files created in `agritech-api/src/modules/compliance/dto/`

### Next Steps
- Create compliance.service.ts with CRUD operations
- Create compliance.controller.ts with REST endpoints
- Register ComplianceModule in app.module.ts

## Compliance Service Implementation (2026-01-25)

### File Created
- `compliance.service.ts` (574 lines) - Complete compliance tracking service

### Service Structure
**Certification Operations (5 methods):**
- `findAllCertifications()` - Get all certs for org, ordered by expiry date
- `findOneCertification()` - Get single cert with org validation
- `createCertification()` - Create with date validation and duplicate check
- `updateCertification()` - Update with org ownership verification
- `removeCertification()` - Delete with org filtering

**Compliance Check Operations (5 methods):**
- `findAllChecks()` - Get all checks with certification join
- `findOneCheck()` - Get single check with certification and evidence joins
- `createCheck()` - Create with certification ownership validation
- `updateCheck()` - Update with org verification
- `removeCheck()` - Delete with org filtering

**Requirements Operations (1 method):**
- `findRequirements()` - Query requirements by certification type (optional filter)

**Evidence Operations (1 method):**
- `createEvidence()` - Upload evidence with check ownership validation

**Dashboard Statistics (1 method):**
- `getDashboardStats()` - Returns:
  - Total certifications count
  - Active certifications count
  - Expiring soon count (within 90 days)
  - Recent checks (last 30 days, limit 10)
  - Non-compliant checks count
  - Average compliance score (rounded to 2 decimals)

### Security Patterns Applied
- **Organization-level filtering**: ALL queries filter by `organization_id` from JWT
- **Ownership validation**: Foreign key relationships verified before create/update
- **Duplicate prevention**: Unique constraint check on certification type + number
- **Date validation**: Expiry date must be after issued date

### Error Handling Patterns
- `NotFoundException` for missing resources (PGRST116 code)
- `BadRequestException` for validation failures
- `InternalServerErrorException` for database errors
- Logger integration for all operations

### Supabase Query Patterns
- Admin client injection via DatabaseService
- `.select()` with joins for related data
- `.single()` for single record queries
- `.eq()` for filtering by organization_id (CRITICAL)
- `.order()` for sorting results
- `.gte()` / `.lte()` for date range filtering

### Dashboard Statistics Logic
- Expiring soon: Active certs with expiry_date <= 90 days from now
- Recent checks: Last 30 days, ordered by check_date DESC, limit 10
- Average score: Sum of all scores / count of checks with non-null scores
- Non-compliant: Count of checks with status = 'non_compliant'

### Build Verification
- TypeScript decorator warnings (expected with experimentalDecorators)
- Service compiles successfully
- No blocking errors in build process

### Next Steps
- Create compliance.controller.ts with REST endpoints
- Create compliance.module.ts and register in app.module.ts
- Add Swagger decorators to controller

## Compliance Controller Implementation (2026-01-25)

### File Created
- `compliance.controller.ts` (391 lines) - Complete REST API controller

### Endpoint Structure (14 endpoints)

**Certification Endpoints (5):**
- `GET /compliance/certifications` - List all certifications
- `GET /compliance/certifications/:id` - Get single certification
- `POST /compliance/certifications` - Create certification
- `PATCH /compliance/certifications/:id` - Update certification
- `DELETE /compliance/certifications/:id` - Delete certification (204 No Content)

**Compliance Check Endpoints (5):**
- `GET /compliance/checks` - List all checks with certification join
- `GET /compliance/checks/:id` - Get single check with evidence
- `POST /compliance/checks` - Create compliance check
- `PATCH /compliance/checks/:id` - Update check
- `DELETE /compliance/checks/:id` - Delete check (204 No Content)

**Requirements Endpoints (1):**
- `GET /compliance/requirements?certification_type=GlobalGAP` - Query requirements (optional filter)

**Evidence Endpoints (1):**
- `POST /compliance/evidence` - Upload evidence

**Dashboard Endpoints (1):**
- `GET /compliance/dashboard` - Get compliance statistics

### Security Implementation
- **JWT Authentication**: `@UseGuards(JwtAuthGuard)` on controller level
- **CASL Authorization**: `@UseGuards(PoliciesGuard)` + `@CheckPolicies()` on protected endpoints
- **Permission Checks**: All endpoints require `Action.Read/Create/Update/Delete` on `'Farm'` resource
- **Organization Filtering**: All endpoints extract `x-organization-id` from request headers

### Swagger Documentation
- `@ApiTags('compliance')` - Groups endpoints under "compliance" in Swagger UI
- `@ApiOperation()` - Summary and description for each endpoint
- `@ApiResponse()` - Status codes and descriptions (200, 201, 204, 400, 401, 403, 404)
- `@ApiParam()` - Path parameter documentation
- `@ApiQuery()` - Query parameter documentation (certification_type filter)
- `@ApiBearerAuth()` - JWT token requirement
- Dashboard response schema documented with nested object structure

### HTTP Status Codes
- `200 OK` - Successful GET/PATCH operations
- `201 Created` - Successful POST operations
- `204 No Content` - Successful DELETE operations (with `@HttpCode(HttpStatus.NO_CONTENT)`)
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Missing/invalid JWT token
- `403 Forbidden` - Insufficient permissions (CASL)
- `404 Not Found` - Resource not found

### Request Flow Pattern
1. JWT guard validates token
2. CASL guard checks permissions (for protected endpoints)
3. Extract `x-organization-id` from headers
4. Extract `user.id` from request (for create operations)
5. Call service method with organization context
6. Return response or throw exception

### TypeScript Decorator Warnings
- Decorator signature warnings (expected with experimentalDecorators)
- Build passes successfully despite warnings
- No blocking compilation errors

### Next Steps
- Create compliance.module.ts
- Register ComplianceModule in app.module.ts
- Test endpoints with Swagger UI

## ComplianceModule Registration in app.module.ts (2026-01-25)

### Changes Made
1. **Import statement added** (line 82):
   ```typescript
   import { ComplianceModule } from './modules/compliance/compliance.module';
   ```

2. **Module registered in imports array** (line 179):
   ```typescript
   ComplianceModule,
   ```

### Registration Pattern
- Followed existing pattern from PestAlertsModule
- Added after PestAlertsModule in the imports array
- Placed in "Admin & Analytics" section with other feature modules

### Module Structure Verified
- `compliance.module.ts` exists with proper structure:
  - Imports: DatabaseModule
  - Controllers: ComplianceController
  - Providers: ComplianceService
  - Exports: ComplianceService

### Build Verification
- TypeScript decorator warnings (expected, non-blocking)
- Build passes successfully
- Module properly registered and available

### Complete Compliance Module Files
1. ✅ DTOs (5 files):
   - create-certification.dto.ts
   - update-certification.dto.ts
   - create-compliance-check.dto.ts
   - update-compliance-check.dto.ts
   - create-evidence.dto.ts

2. ✅ Service (1 file):
   - compliance.service.ts (574 lines, 13 methods)

3. ✅ Controller (1 file):
   - compliance.controller.ts (391 lines, 14 endpoints)

4. ✅ Module (1 file):
   - compliance.module.ts (13 lines)

5. ✅ Registration:
   - app.module.ts (ComplianceModule added)

### API Endpoints Available
All endpoints now accessible at `/compliance/*`:
- Certifications: GET, POST, PATCH, DELETE
- Checks: GET, POST, PATCH, DELETE
- Requirements: GET (with optional filter)
- Evidence: POST
- Dashboard: GET

### Next Steps
- Test endpoints via Swagger UI at `/api/docs`
- Verify JWT authentication works
- Test CASL authorization with different roles
- Create frontend integration
