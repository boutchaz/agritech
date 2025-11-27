# Strapi CMS Migration - Reference Data Summary

## What Has Been Done

### ✅ Completed Tasks

1. **Analyzed Current Database Structure**
   - Reviewed all 6 reference data tables in Supabase
   - Documented fields, relations, and multi-tenancy requirements
   - Identified hooks and components using this data

2. **Created Strapi Collection Types**
   - Created schema.json files for all 6 collections:
     - `tree-category` → `/cms/src/api/tree-category/`
     - `tree` → `/cms/src/api/tree/`
     - `plantation-type` → `/cms/src/api/plantation-type/`
     - `test-type` → `/cms/src/api/test-type/`
     - `product-category` → `/cms/src/api/product-category/`
     - `product-subcategory` → `/cms/src/api/product-subcategory/`

3. **Configured Relations**
   - `tree_category` → One-to-Many → `trees`
   - `product_category` → One-to-Many → `product_subcategories`

4. **Created Initial Controllers & Routes**
   - Tree category controller with auto-populate of related trees
   - Standard CRUD routes for all collections

5. **Created Migration Documentation**
   - Comprehensive guide at `/REFERENCE_DATA_STRAPI_MIGRATION.md`
   - Step-by-step instructions
   - Architecture diagrams
   - Security best practices

## What Still Needs to Be Done

### 🔄 Next Steps (In Order)

#### 1. Start and Configure Strapi (15-30 minutes)

```bash
cd cms
npm install
npm run develop
```

- Access admin at http://localhost:1337/admin
- Create first admin user
- Verify all 6 collections appear in Content Manager

#### 2. Configure API Permissions (10 minutes)

In Strapi Admin:
- Settings → Users & Permissions → Roles → Public/Authenticated
- Enable `find` and `findOne` for all 6 collections
- Consider using Authenticated role for better security

#### 3. Create API Token (5 minutes)

- Settings → API Tokens → Create new token
- Name: `agritech-api-token`
- Type: Full access or Custom (read-only)
- Save token securely

#### 4. Create Data Migration Script (1-2 hours)

Create: `agritech-api/scripts/migrate-reference-data.ts`

```typescript
// Pseudo-code structure:
async function migrateReferenceData() {
  // 1. Fetch from Supabase
  const categories = await supabase.from('tree_categories').select('*');

  // 2. Transform to Strapi format
  const transformed = categories.map(cat => ({
    data: {
      name: cat.category, // Map 'category' to 'name'
      organization_id: cat.organization_id,
    }
  }));

  // 3. POST to Strapi
  for (const item of transformed) {
    await strapiClient.post('/tree-categories', item);
  }
}
```

**Collections to migrate**:
- tree_categories (multi-tenant)
- trees (with category relations)
- plantation_types (multi-tenant)
- test_types (global)
- product_categories (global, unique name)
- product_subcategories (with category relations)

#### 5. Create Strapi Service in AgriTech API (2-3 hours)

**Files to create**:

```
agritech-api/src/modules/reference-data/
├── reference-data.module.ts
├── strapi.service.ts (HTTP client for Strapi)
├── reference-data.service.ts (business logic)
├── reference-data.controller.ts (REST endpoints)
└── dto/
    ├── tree-category.dto.ts
    ├── plantation-type.dto.ts
    └── ... (DTOs for all collections)
```

**Key service methods**:
```typescript
@Injectable()
export class StrapiService {
  async getTreeCategories(organizationId?: string) {
    let url = '/tree-categories?populate=trees';
    if (organizationId) {
      url += `&filters[organization_id][$eq]=${organizationId}`;
    }
    return this.get(url);
  }
}
```

#### 6. Create AgriTech API Endpoints (1 hour)

**Endpoints to create**:
- `GET /api/v1/reference-data/tree-categories`
- `GET /api/v1/reference-data/trees`
- `GET /api/v1/reference-data/plantation-types`
- `GET /api/v1/reference-data/test-types`
- `GET /api/v1/reference-data/product-categories`
- `GET /api/v1/reference-data/product-subcategories`

All endpoints should:
- Use JWT authentication
- Filter by organization_id from request headers
- Transform Strapi response to match frontend expectations

#### 7. Update Frontend Hooks (2-3 hours)

**Files to modify**:

`project/src/hooks/useTreeManagement.ts`:
```typescript
// Before (direct Supabase):
const { data } = await supabase
  .from('tree_categories')
  .select('*')
  .eq('organization_id', organizationId);

// After (API call):
const data = await apiClient.get(
  '/api/v1/reference-data/tree-categories',
  {},
  organizationId
);
```

**Hooks to update**:
- `useTreeCategories()` - Lines 31-174
- `usePlantationTypes()` - Lines 176-276
- `useProductCategories()` - In useMultiTenantLookups.ts
- `useTestTypes()` - In useMultiTenantLookups.ts

#### 8. Testing (2-3 hours)

**Test checklist**:
- [ ] Strapi admin UI loads correctly
- [ ] All collections visible in Content Manager
- [ ] API tokens work with curl/Postman
- [ ] Data migration script completes successfully
- [ ] AgriTech API endpoints return correct data
- [ ] Multi-tenancy filtering works (organization_id)
- [ ] Frontend hooks fetch data correctly
- [ ] TreeManagement.tsx component works
- [ ] No console errors in browser
- [ ] Performance is acceptable

#### 9. Update Environment Variables

**agritech-api/.env**:
```env
STRAPI_API_URL=http://localhost:1337/api
STRAPI_API_TOKEN=your_generated_token_here
```

**For production**:
```env
STRAPI_API_URL=https://cms.agritech.example.com/api
STRAPI_API_TOKEN=production_token_here
```

## File Summary

### Created Files

1. **Strapi Schemas** (6 files):
   - `/cms/src/api/tree-category/content-types/tree-category/schema.json`
   - `/cms/src/api/tree/content-types/tree/schema.json`
   - `/cms/src/api/plantation-type/content-types/plantation-type/schema.json`
   - `/cms/src/api/test-type/content-types/test-type/schema.json`
   - `/cms/src/api/product-category/content-types/product-category/schema.json`
   - `/cms/src/api/product-subcategory/content-types/product-subcategory/schema.json`

2. **Strapi Controllers/Services/Routes**:
   - `/cms/src/api/tree-category/controllers/tree-category.ts`
   - `/cms/src/api/tree-category/services/tree-category.ts`
   - `/cms/src/api/tree-category/routes/tree-category.ts`
   - (Similar structure for other collections - create as needed)

3. **Documentation**:
   - `/REFERENCE_DATA_STRAPI_MIGRATION.md` - Comprehensive guide
   - `/STRAPI_MIGRATION_SUMMARY_REFERENCE_DATA.md` - This file

### Files to Create (Next Steps)

1. **Migration Script**:
   - `agritech-api/scripts/migrate-reference-data.ts`

2. **AgriTech API Module**:
   - `agritech-api/src/modules/reference-data/reference-data.module.ts`
   - `agritech-api/src/modules/reference-data/strapi.service.ts`
   - `agritech-api/src/modules/reference-data/reference-data.service.ts`
   - `agritech-api/src/modules/reference-data/reference-data.controller.ts`
   - `agritech-api/src/modules/reference-data/dto/*.dto.ts`

3. **Frontend API Client**:
   - `project/src/lib/api/reference-data.ts`

### Files to Modify

1. **Frontend Hooks**:
   - `project/src/hooks/useTreeManagement.ts`
   - `project/src/hooks/useMultiTenantLookups.ts`

2. **AgriTech API App Module**:
   - `agritech-api/src/app.module.ts` (register ReferenceDataModule)

3. **Environment Variables**:
   - `agritech-api/.env`
   - `agritech-api/.env.example`

## Quick Start Commands

```bash
# 1. Start Strapi CMS
cd cms
npm install
npm run develop
# → Open http://localhost:1337/admin

# 2. After configuring Strapi, run migration
cd agritech-api
npm run migrate:reference-data

# 3. Start AgriTech API
npm run start:dev

# 4. Start Frontend
cd project
npm run dev

# 5. Test in browser
# → Navigate to http://localhost:5173/tree-management
```

## Estimated Time

- **Completed**: ~2 hours (analysis + schema creation)
- **Remaining**: ~10-15 hours
  - Strapi setup: 30 min
  - Migration script: 2 hours
  - AgriTech API: 3 hours
  - Frontend hooks: 3 hours
  - Testing: 3 hours
  - Documentation updates: 1 hour

## Decision Points

### Should You Keep Data in Supabase?

**Yes, initially**:
- Keep Supabase tables as backup
- Allows easy rollback
- Can compare data for verification

**No, eventually**:
- After migration is stable and tested
- Remove Supabase tables to avoid confusion
- Update database migrations to reflect removal

### Public vs Authenticated API Access?

**Recommendation**: Use **Authenticated** role
- More secure
- Prevents public API abuse
- AgriTech API acts as gatekeeper with JWT

## Success Criteria

Migration is considered complete when:
1. ✅ All 6 collections are in Strapi
2. ✅ Data migrated successfully from Supabase
3. ✅ AgriTech API endpoints return correct data
4. ✅ Frontend components work without errors
5. ✅ Multi-tenancy filtering works correctly
6. ✅ Performance is acceptable (<500ms response times)
7. ✅ No breaking changes to existing features
8. ✅ Tests pass

## Support & Resources

- **Strapi Docs**: https://docs.strapi.io/dev-docs/intro
- **Strapi API Docs**: https://docs.strapi.io/dev-docs/api/rest
- **Migration Guide**: `/REFERENCE_DATA_STRAPI_MIGRATION.md`
- **AgriTech Docs**: [internal wiki]

---

**Status**: 🟡 In Progress (30% complete)
**Next Action**: Start Strapi and configure API permissions
**Estimated Completion**: 10-15 hours of development time
