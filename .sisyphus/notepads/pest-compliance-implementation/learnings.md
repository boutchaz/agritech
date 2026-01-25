
## Compliance UI Implementation (2026-01-25)

### Completed Tasks

#### 1. UI Components Created
- **CertificationCard.tsx**: Card component for displaying individual certifications with status badges and expiry dates.
- **ComplianceChecksList.tsx**: Data table for displaying compliance checks with status badges and scores.
- **CreateCertificationDialog.tsx**: Form dialog for creating new certifications using `react-hook-form` and `zod`.
- **Progress.tsx**: Added shadcn/ui Progress component for dashboard score visualization.

#### 2. Routes Created
- **Dashboard**: `project/src/routes/_authenticated/compliance/index.tsx`
  - Displays summary statistics (Score, Active, Expiring, Non-compliant)
  - Shows recent compliance checks
  - Provides quick actions and audit preparation checklist
- **List View**: `project/src/routes/_authenticated/compliance/certifications.tsx`
  - Lists all certifications in a responsive grid
  - Provides filtering by type and status
  - Includes search functionality
- **Detail View**: `project/src/routes/_authenticated/compliance/certifications/$certId.tsx`
  - Shows full certification details (scope, dates, issuing body)
  - Lists associated compliance checks
  - Displays documents and audit schedule
  - Provides delete/edit actions

#### 3. Key Implementation Details
- **Form Handling**: Adapted `CreateCertificationDialog` to use the project's custom `FormField` and `DatePicker` components instead of standard shadcn `Form` components.
- **Date Handling**: Used `DatePicker` component which is specialized (takes `availableDates`) but works for general dates when `availableDates` is empty.
- **Navigation**: Used `TanStack Router` for navigation between dashboard, list, and detail views.
- **Data Fetching**: Used `useCompliance` hooks (`useCertifications`, `useCertification`, `useComplianceChecks`, `useComplianceDashboard`) for all data operations.
- **Responsive Design**: Implemented responsive layouts with summary cards and data tables that adapt to screen size.

#### 4. Learnings & Gotchas
- **Custom UI Components**: The project uses a custom `FormField` implementation that differs from the standard shadcn `Form` wrapper. Forms must be built using `Controller` + `FormField` pattern.
- **DatePicker Specifics**: The `DatePicker` component is built for satellite imagery selection (accepts `availableDates`) but can be repurposed for general date selection by passing an empty array.
- **Route Registration**: New routes need to be registered in the route tree (handled by codegen).
- **Type Safety**: Full type safety achieved using DTOs from `compliance.ts` API definition.

## GlobalGAP PDF Report Generator (2026-01-25)

### Implementation Details

#### 1. Service Created: `compliance-reports.service.ts`
- **Location**: `agritech-api/src/modules/compliance/compliance-reports.service.ts`
- **Dependencies**: 
  - `jspdf` - PDF generation library
  - `jspdf-autotable` - Table generation plugin for jsPDF
  - `ComplianceService` - For fetching certification, requirements, and checks data

#### 2. PDF Report Structure
The generated PDF includes:
- **Header**: Organization name and certification details (number, issuing body, validity dates, status, scope)
- **Requirements Checklist**: Table of all GlobalGAP requirements with code, description, category, and critical flag
- **Compliance Checks**: Table of all checks with date, type, auditor, score, and status
- **Non-conformities & Corrective Actions**: Detailed section for non-compliant checks with findings and corrective actions
- **Summary**: Overall statistics (average score, total checks, compliant/non-compliant counts, total requirements)
- **Footer**: Generation timestamp and page numbers

#### 3. Key Implementation Patterns
- **Type Safety**: Defined explicit interfaces for `ComplianceRequirement`, `ComplianceCheck`, and `Certification` to ensure type safety
- **Error Handling**: Proper error handling with `NotFoundException` for missing certifications and `InternalServerErrorException` for generation failures
- **PDF Pagination**: Automatic page breaks when content exceeds page height (270 units)
- **Table Styling**: Used `jspdf-autotable` with striped theme and custom column widths for better readability
- **Text Wrapping**: Used `pdf.splitTextToSize()` for long text content (findings, corrective actions)

#### 4. Controller Endpoint
- **Route**: `GET /compliance/certifications/:id/report/pdf`
- **Response**: Binary PDF file with proper headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="globalgap-report-{id}.pdf"`
  - `Content-Length: {buffer.length}`
- **Authorization**: Protected with `JwtAuthGuard` and `PoliciesGuard` (requires `Read` permission on `Farm`)

#### 5. Module Registration
- Added `ComplianceReportsService` to `ComplianceModule` providers and exports
- Injected `ComplianceReportsService` into `ComplianceController` constructor

#### 6. Dependencies Installed
```bash
pnpm --filter agritech-api add jspdf jspdf-autotable
```

### Learnings & Gotchas

1. **jsPDF TypeScript Types**: jsPDF includes its own TypeScript definitions, no need for `@types/jspdf`. However, `jspdf-autotable` also includes its own types (no `@types/jspdf-autotable` package exists).

2. **AutoTable Type Casting**: The `autoTable` function modifies the jsPDF instance by adding a `lastAutoTable` property. Need to cast to `any` to access `(pdf as any).lastAutoTable.finalY` for getting the Y position after table rendering.

3. **Buffer Conversion**: jsPDF's `output('arraybuffer')` returns an ArrayBuffer, which needs to be converted to Buffer using `Buffer.from()` for NestJS response.

4. **Response Handling**: When returning binary data (PDF), must use `@Res()` decorator and manually set headers and send the buffer. Cannot use standard return value.

5. **Organization Validation**: The service properly validates that the certification belongs to the organization by using `findOneCertification(organizationId, certificationId)` which includes organization filtering.

6. **Certification Type Validation**: Added explicit check to ensure the certification is a GlobalGAP certification before generating the report.

7. **Data Filtering**: Compliance checks are filtered by `certification_id` since `findAllChecks()` returns all checks for the organization. Used type assertion `(check as any).certification_id` since the type doesn't include the foreign key.

### Testing Recommendations

1. Test with certification that has no checks (should show "No compliance checks recorded yet")
2. Test with certification that has non-compliant checks (should show non-conformities section)
3. Test with long requirement descriptions (should wrap properly in table)
4. Test with many checks (should paginate correctly)
5. Test with non-GlobalGAP certification (should return 404)
6. Test with invalid certification ID (should return 404)
7. Test with certification from different organization (should return 404)

