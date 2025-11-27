# Reference Data Migration to Strapi CMS

## Overview

This document describes the migration of reference/lookup data from Supabase to Strapi CMS for the AgriTech platform. This migration centralizes the management of static reference data in a dedicated CMS while maintaining the operational data in Supabase.

## Migrated Collections

### 1. Tree Categories (`tree_categories`)
- **Purpose**: Categories for organizing tree species
- **Fields**:
  - `name` (string, required)
  - `description` (text, optional)
  - `organization_id` (string, optional - for multi-tenancy)
- **Relations**: One-to-Many with `trees`
- **Strapi API**: `/api/tree-categories`

### 2. Trees (`trees`)
- **Purpose**: Catalog of tree species
- **Fields**:
  - `name` (string, required)
  - `characteristics` (JSON, optional)
- **Relations**: Many-to-One with `tree_categories`
- **Strapi API**: `/api/trees`

### 3. Plantation Types (`plantation_types`)
- **Purpose**: Types of plantation configurations
- **Fields**:
  - `name` (string, required)
  - `description` (text, optional)
  - `configuration` (JSON, optional)
  - `spacing` (string, optional)
  - `trees_per_ha` (integer, optional)
  - `organization_id` (string, optional - for multi-tenancy)
- **Strapi API**: `/api/plantation-types`

### 4. Test Types (`test_types`)
- **Purpose**: Types of soil/crop tests available
- **Fields**:
  - `name` (string, required)
  - `description` (text, optional)
  - `parameters` (JSON, optional)
- **Strapi API**: `/api/test-types`

### 5. Product Categories (`product_categories`)
- **Purpose**: Product classification system
- **Fields**:
  - `name` (string, required, unique)
  - `description` (text, optional)
- **Relations**: One-to-Many with `product_subcategories`
- **Strapi API**: `/api/product-categories`

### 6. Product Subcategories (`product_subcategories`)
- **Purpose**: Product subcategories belonging to main categories
- **Fields**:
  - `name` (string, required)
  - `description` (text, optional)
- **Relations**: Many-to-One with `product_categories`
- **Strapi API**: `/api/product-subcategories`

## Architecture

### Before Migration (Current)
```
Frontend (React)
    ↓
useTreeCategories hook
    ↓
Direct Supabase Query
    ↓
Supabase Database (RLS policies)
```

### After Migration (Target)
```
Frontend (React)
    ↓
useTreeCategories hook (updated)
    ↓
AgriTech API (NestJS)
    ↓
Strapi CMS API (with API token)
    ↓
Strapi Database (PostgreSQL)
```

## Strapi Collection Types Created

All collection types are located in `cms/src/api/`:

```
cms/src/api/
├── tree-category/
│   ├── content-types/tree-category/
│   │   └── schema.json
│   ├── controllers/tree-category.ts
│   ├── services/tree-category.ts
│   └── routes/tree-category.ts
├── tree/
│   └── content-types/tree/schema.json
├── plantation-type/
│   └── content-types/plantation-type/schema.json
├── test-type/
│   └── content-types/test-type/schema.json
├── product-category/
│   └── content-types/product-category/schema.json
└── product-subcategory/
    └── content-types/product-subcategory/schema.json
```

## Migration Steps

### Step 1: Start Strapi CMS

```bash
cd cms
npm install
npm run develop
```

Strapi will:
1. Read the schema.json files
2. Automatically create database tables
3. Create API endpoints for each collection

### Step 2: Configure Strapi API Permissions

1. Open Strapi admin at `http://localhost:1337/admin`
2. Go to **Settings** → **Users & Permissions Plugin** → **Roles** → **Public**
3. Enable the following permissions for each collection:
   - `find` (GET /api/collection-name)
   - `findOne` (GET /api/collection-name/:id)
   - For authenticated access, configure **Authenticated** role instead

### Step 3: Create API Token

1. Go to **Settings** → **API Tokens**
2. Click **Create new API Token**
3. Name: `agritech-api-token`
4. Token type: **Full access** or **Custom** (with read permissions)
5. Copy the generated token and save it securely

### Step 4: Configure AgriTech API

Add Strapi configuration to `agritech-api/.env`:

```env
STRAPI_API_URL=http://localhost:1337/api
STRAPI_API_TOKEN=your_token_here
```

### Step 5: Data Migration

Create a migration script to transfer existing data from Supabase to Strapi:

```bash
cd agritech-api
npm run migrate:reference-data
```

This script will:
1. Fetch all reference data from Supabase
2. Transform data to match Strapi format
3. POST data to Strapi API
4. Verify migration success

### Step 6: Update AgriTech API

Create a Strapi service wrapper in AgriTech API to proxy requests to Strapi:

**Location**: `agritech-api/src/modules/reference-data/`

- `strapi.service.ts` - Generic Strapi HTTP client
- `reference-data.service.ts` - Business logic for reference data
- `reference-data.controller.ts` - REST endpoints

**Endpoints to create**:
- `GET /api/v1/tree-categories`
- `GET /api/v1/trees`
- `GET /api/v1/plantation-types`
- `GET /api/v1/test-types`
- `GET /api/v1/product-categories`

### Step 7: Update Frontend Hooks

Update hooks to call AgriTech API instead of Supabase:

**Files to modify**:
- `project/src/hooks/useTreeManagement.ts`
- `project/src/hooks/useMultiTenantLookups.ts`

**Changes**:
- Replace direct Supabase queries with API calls
- Use new API client wrappers
- Maintain existing hook interfaces (no breaking changes)

## Multi-Tenancy Considerations

### Current Supabase Approach
- Uses `organization_id` column
- Row-Level Security (RLS) policies enforce access
- Each organization sees only their data

### Strapi Approach (Options)

**Option 1: Keep organization_id field**
- Add `organization_id` as string field in Strapi
- Filter by `organization_id` in AgriTech API before returning data
- Simpler, but Strapi admin shows all data

**Option 2: Use Strapi Multi-Tenancy Plugin**
- Install plugin like `@strapi-plugin/multi-tenant`
- More complex setup
- Better isolation in Strapi admin

**Recommendation**: Use Option 1 initially, with filtering in AgriTech API layer.

## API Token Security

### Best Practices

1. **Environment Variables**: Store token in `.env` files, never commit
2. **Token Rotation**: Regularly rotate API tokens
3. **Least Privilege**: Use custom tokens with minimum required permissions
4. **Network Security**: Use HTTPS in production
5. **Rate Limiting**: Configure rate limits in Strapi settings

### Example AgriTech API Configuration

```typescript
// agritech-api/src/modules/reference-data/strapi.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class StrapiService {
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get('STRAPI_API_URL');
    this.apiToken = this.configService.get('STRAPI_API_TOKEN');
  }

  async get(endpoint: string, params?: any) {
    const response = await axios.get(`${this.apiUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
      params,
    });
    return response.data;
  }
}
```

## Testing

### Strapi API Testing

```bash
# Test tree categories endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:1337/api/tree-categories

# Test with population
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:1337/api/tree-categories?populate=trees"
```

### Integration Testing

1. Verify Strapi collections are accessible
2. Test AgriTech API proxy endpoints
3. Test frontend hooks with new API
4. Verify multi-tenancy filtering works correctly

## Rollback Plan

If issues arise, rollback is straightforward:

1. **Frontend**: Revert hook changes (git revert)
2. **AgriTech API**: Stop using Strapi endpoints
3. **Data**: Reference data remains in Supabase (not deleted)
4. **Strapi**: Can be stopped without affecting core system

## Benefits

1. **Centralized Management**: All reference data in one CMS
2. **User-Friendly Admin**: Strapi provides intuitive UI for non-technical users
3. **API Documentation**: Auto-generated Swagger/OpenAPI docs
4. **Versioning**: Strapi supports draft/publish workflows
5. **Scalability**: Offloads reference data queries from main database
6. **Performance**: Strapi includes built-in caching

## Future Enhancements

1. **Content Versioning**: Enable draft/publish for approval workflows
2. **Internationalization**: Add multi-language support
3. **Media Management**: Attach images/files to reference data
4. **Webhooks**: Notify AgriTech API of data changes
5. **GraphQL**: Use Strapi GraphQL API for more efficient queries

## Maintenance

### Adding New Reference Data Collections

1. Create schema in `cms/src/api/new-collection/content-types/new-collection/schema.json`
2. Restart Strapi (or use admin UI to create)
3. Configure permissions in Strapi admin
4. Create AgriTech API proxy endpoint
5. Create frontend hook

### Updating Existing Collections

1. Modify `schema.json`
2. Restart Strapi (auto-migration occurs)
3. Update TypeScript types in frontend
4. Update API DTOs in AgriTech API

## Support

For issues or questions:
- Strapi Documentation: https://docs.strapi.io
- AgriTech Team: [contact info]
- GitHub Issues: [repo URL]

---

**Migration Status**: ✅ Strapi Collections Created, ⏳ Pending Implementation & Testing
**Last Updated**: 2025-11-27
