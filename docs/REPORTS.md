# Parcel Report Generation

This feature allows users to generate customized PDF reports for their parcels with various templates.

## Features

- **Multiple Report Templates**:
  - Analyse Complète de Parcelle (Full Parcel Analysis)
  - Rapport d'Analyse du Sol (Soil Analysis Report)
  - Rapport d'Imagerie Satellite (Satellite Imagery Report)

- **Report Components**:
  - Parcel overview (name, area, soil type)
  - Health metrics (NDVI, irrigation, yield)
  - Soil analysis (pH, nutrients, organic matter)
  - Satellite data and indices
  - AI-powered recommendations

- **Report Management**:
  - Generate reports on-demand
  - View report generation history
  - Download generated reports as PDF
  - Track report status (pending, completed, failed)

## Database Schema

### parcel_reports table
```sql
- id: UUID (Primary Key)
- parcel_id: UUID (Foreign Key to parcels)
- template_id: TEXT
- title: TEXT
- generated_at: TIMESTAMP
- generated_by: UUID (Foreign Key to auth.users)
- status: TEXT (pending | completed | failed)
- file_url: TEXT (Storage path to PDF)
- metadata: JSONB (Report data)
```

## Usage

### Frontend Component

The `ParcelReportGenerator` component is integrated into the ParcelCard "Rapports" tab:

```tsx
<ParcelReportGenerator
  parcelId={parcel.id}
  parcelName={parcel.name}
  parcelData={{
    parcel,
    metrics: { ... },
    analysis: { ... }
  }}
/>
```

### Generating a Report

1. Navigate to a parcel's "Rapports" tab
2. Click "Nouveau Rapport" button
3. Select a report template
4. Report is generated automatically
5. Download the PDF when ready

## Backend API

### Supabase Edge Function

**Endpoint**: `/functions/v1/generate-parcel-report`

**Method**: POST

**Request Body**:
```json
{
  "parcel_id": "uuid",
  "template_id": "parcel-analysis",
  "parcel_data": {
    "parcel": { ... },
    "metrics": { ... },
    "analysis": { ... }
  }
}
```

**Response**:
```json
{
  "success": true,
  "report": {
    "id": "uuid",
    "title": "Report Title",
    "status": "completed"
  }
}
```

## Deployment

### Apply Database Migrations

```bash
# Local development
npx supabase db reset

# Production
npx supabase db push
```

### Deploy Edge Function

```bash
npx supabase functions deploy generate-parcel-report
```

## Future Enhancements

1. **PDF Generation**: Integrate Puppeteer/Playwright for HTML to PDF conversion
2. **Email Reports**: Automatically email generated reports
3. **Scheduled Reports**: Generate reports on a schedule
4. **Custom Templates**: Allow users to create custom report templates
5. **Multi-Parcel Reports**: Generate comparative reports across multiple parcels
6. **Export Formats**: Support Excel, Word, and other formats
7. **Report Sharing**: Share reports with external stakeholders

## Notes

- Reports are stored in the `reports` storage bucket
- RLS policies ensure users can only access reports for their organization's parcels
- The Edge Function currently stores HTML content; PDF conversion needs to be implemented
- Report generation is tracked in the database for audit purposes