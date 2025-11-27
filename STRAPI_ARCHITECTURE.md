# AgriTech Architecture: Supabase + Strapi CMS

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    (React + TypeScript)                          │
└──────────────┬─────────────────────────────┬────────────────────┘
               │                             │
               │                             │
    ┌──────────▼──────────┐       ┌─────────▼──────────┐
    │   STRAPI CMS API    │       │   SUPABASE API     │
    │  (Reference Data)   │       │ (Operational Data) │
    └──────────┬──────────┘       └─────────┬──────────┘
               │                             │
               │                             │
    ┌──────────▼──────────┐       ┌─────────▼──────────┐
    │  PostgreSQL (CMS)   │       │  PostgreSQL (Main) │
    │   - crop_types      │       │   - farms          │
    │   - currencies      │       │   - crops          │
    │   - templates       │       │   - invoices       │
    │   - taxonomies      │       │   - transactions   │
    └─────────────────────┘       └────────────────────┘
```

---

## 📊 Data Flow Patterns

### Pattern 1: Reference Data Lookup
```
User creates new crop
    ↓
Frontend loads crop types from Strapi (cached)
    ↓
User selects crop type (ID: 5)
    ↓
Frontend saves to Supabase crops table
    {
      name: "Tomato Field A",
      crop_type_id: 5,  ← References Strapi
      parcel_id: uuid,
      planted_date: "2025-01-15"
    }
    ↓
Supabase stores crop with crop_type_id = 5
```

### Pattern 2: Display with Relations
```
User views crop list
    ↓
Frontend fetches crops from Supabase
    [{crop_id: uuid, crop_type_id: 5, ...}]
    ↓
Frontend enriches with Strapi data (from cache)
    crop_type_id: 5 → {id: 5, name: "Tomato", variety: "Cherry"}
    ↓
Display: "Tomato (Cherry) - Field A"
```

---

## 🔄 API Integration Strategy

### Strapi API (Static/Reference Data)

```typescript
// services/cms.service.ts
export class CmsService {
  private baseUrl = import.meta.env.VITE_STRAPI_URL;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 3600000; // 1 hour

  async getCropTypes() {
    return this.fetchCached('crop-types', {
      populate: ['category', 'image'],
      sort: ['name:asc']
    });
  }

  async getCurrencies() {
    return this.fetchCached('currencies', {
      sort: ['code:asc']
    });
  }

  private async fetchCached(endpoint: string, params?: object) {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const qs = params ? `?${new URLSearchParams(params)}` : '';
    const response = await fetch(`${this.baseUrl}/api/${endpoint}${qs}`);
    const { data } = await response.json();

    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### Supabase API (Operational Data)

```typescript
// services/farm.service.ts
export class FarmService {
  async getCrops(farmId: string) {
    const { data, error } = await supabase
      .from('crops')
      .select(`
        *,
        parcel:parcels(name, area),
        harvest_records(quantity, date)
      `)
      .eq('farm_id', farmId)
      .order('planted_date', { ascending: false });

    if (error) throw error;

    // Enrich with Strapi reference data
    const cropTypes = await cmsService.getCropTypes();

    return data.map(crop => ({
      ...crop,
      crop_type: cropTypes.find(t => t.id === crop.crop_type_id)
    }));
  }
}
```

---

## 🎯 Data Categorization

### Strapi CMS - "What Can Exist"
> **Definition**: Templates, catalogs, taxonomies, rules

| Category | Examples | Update Frequency |
|----------|----------|------------------|
| **Agricultural Catalogs** | Crop types, varieties, tree species | Quarterly |
| **Financial Rules** | Tax rates, currencies, account templates | Monthly |
| **Task Templates** | Task categories, work units | Quarterly |
| **Inventory Catalogs** | Item groups, product categories | Monthly |
| **System Configuration** | Permissions, role templates | Rarely |

**Characteristics**:
- ✓ Managed by admins
- ✓ Referenced by operational data
- ✓ Changes infrequently
- ✓ No user-specific data
- ✓ Can be cached aggressively

---

### Supabase - "What Actually Happened"
> **Definition**: Transactions, events, user-created data, real-time state

| Category | Examples | Update Frequency |
|----------|----------|------------------|
| **Transactions** | Invoices, payments, orders | Real-time |
| **Operations** | Tasks, work records, harvests | Daily |
| **Assets** | Farms, parcels, crops | Weekly |
| **Time-Series** | Satellite data, sensor readings | Continuous |
| **Security** | User roles, permissions, audit logs | Daily |

**Characteristics**:
- ✓ User-generated
- ✓ High volume
- ✓ Requires ACID compliance
- ✓ Multi-tenant (RLS)
- ✓ Real-time updates

---

## 🔐 Security Model

### Strapi CMS
```javascript
// Public read access for reference data
// Admin-only write access

// permissions config
{
  "crop-type": {
    "find": { "enabled": true },      // Public
    "findOne": { "enabled": true },   // Public
    "create": { "enabled": false },   // Admin only
    "update": { "enabled": false },   // Admin only
    "delete": { "enabled": false }    // Admin only
  }
}
```

### Supabase
```sql
-- Row-Level Security for multi-tenant data

-- Users can only see their organization's data
CREATE POLICY "Users see own org data" ON crops
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can only modify their own data
CREATE POLICY "Users modify own org data" ON crops
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

---

## 📈 Performance Optimization

### Frontend Caching Strategy

```typescript
// Context provider for reference data
export const ReferenceDataContext = createContext({});

export function ReferenceDataProvider({ children }) {
  const [data, setData] = useState({
    cropTypes: [],
    currencies: [],
    taskCategories: [],
    // ... all reference data
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load all reference data on app init
    async function loadReferenceData() {
      const [cropTypes, currencies, taskCategories] = await Promise.all([
        cmsService.getCropTypes(),
        cmsService.getCurrencies(),
        cmsService.getTaskCategories()
      ]);

      setData({ cropTypes, currencies, taskCategories });
      setLoading(false);
    }

    loadReferenceData();
  }, []);

  return (
    <ReferenceDataContext.Provider value={{ data, loading }}>
      {children}
    </ReferenceDataContext.Provider>
  );
}

// Usage in components
function CropForm() {
  const { data } = useContext(ReferenceDataContext);
  const { cropTypes } = data;

  return (
    <Select>
      {cropTypes.map(type => (
        <Option key={type.id} value={type.id}>
          {type.name}
        </Option>
      ))}
    </Select>
  );
}
```

### Backend Optimization

```typescript
// API aggregation endpoint
// Combine Strapi + Supabase data server-side

app.get('/api/crops/:id', async (req, res) => {
  const { id } = req.params;

  // Parallel fetch
  const [crop, cropType, varieties] = await Promise.all([
    supabase.from('crops').select('*').eq('id', id).single(),
    strapi.find('crop-types', crop.crop_type_id),
    strapi.find('crop-varieties', { crop_type_id: crop.crop_type_id })
  ]);

  res.json({
    ...crop,
    crop_type: cropType,
    available_varieties: varieties
  });
});
```

---

## 🔄 Migration Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    BEFORE MIGRATION                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend ──────► Supabase ──────► PostgreSQL           │
│                      │                  │                │
│                      │            ┌─────▼─────┐         │
│                      │            │ crop_types│         │
│                      │            │ currencies│         │
│                      │            │ crops     │         │
│                      │            │ invoices  │         │
│                      │            └───────────┘         │
│                                                          │
└─────────────────────────────────────────────────────────┘

                         ▼▼▼

┌─────────────────────────────────────────────────────────┐
│                    DURING MIGRATION                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                   ┌────────────┐                        │
│  Frontend ───────►│ Feature    │                        │
│                   │ Flag       │                        │
│                   └──┬──────┬──┘                        │
│                      │      │                            │
│              flag=ON │      │ flag=OFF                   │
│                      ▼      ▼                            │
│                  Strapi  Supabase                        │
│                      │      │                            │
│                  (new)    (legacy)                       │
│                                                          │
└─────────────────────────────────────────────────────────┘

                         ▼▼▼

┌─────────────────────────────────────────────────────────┐
│                    AFTER MIGRATION                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│              ┌──────────────┐   ┌─────────────┐         │
│  Frontend ──►│    Strapi    │   │  Supabase   │         │
│              │  (Reference) │   │(Operational)│         │
│              └──────┬───────┘   └──────┬──────┘         │
│                     │                  │                 │
│                     ▼                  ▼                 │
│              ┌──────────┐       ┌──────────┐            │
│              │PostgreSQL│       │PostgreSQL│            │
│              │          │       │          │            │
│              │crop_types│       │crops     │            │
│              │currencies│       │invoices  │            │
│              │templates │       │tasks     │            │
│              └──────────┘       └──────────┘            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Deployment Architecture

### Development Environment
```yaml
# docker-compose.local.yml
services:
  strapi:
    image: strapi/strapi
    ports: [1337:1337]
    environment:
      DATABASE_CLIENT: postgres
      DATABASE_HOST: strapi-db

  supabase:
    image: supabase/postgres
    ports: [5432:5432]

  frontend:
    build: ./project
    environment:
      VITE_STRAPI_URL: http://cms.local.thebzlab.online
      VITE_SUPABASE_URL: http://agritech.local.thebzlab.online
```

### Production Environment
```
┌────────────────────────────────────────────┐
│              Cloudflare CDN                 │
│         (Static assets + Strapi)            │
└──────────┬─────────────────────────────────┘
           │
           ▼
┌──────────────────────┬─────────────────────┐
│   Strapi CMS         │   Frontend App      │
│   (Dokploy)          │   (Dokploy)         │
│   cms.thebzlab.com   │   app.thebzlab.com  │
└──────────┬───────────┴──────────┬──────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌─────────────────────┐
│ Strapi DB        │   │  Supabase           │
│ (PostgreSQL)     │   │  (Managed Service)  │
└──────────────────┘   └─────────────────────┘
```

---

## 🎓 Best Practices

### 1. Use Strapi for Configuration
```typescript
// ❌ BAD: Hardcode in code
const TAX_RATE = 0.20;

// ✅ GOOD: Store in Strapi
const tax = await strapi.find('taxes', { code: 'VAT' });
const TAX_RATE = tax.rate;
```

### 2. Cache Strapi Responses
```typescript
// ❌ BAD: Fetch on every request
async function renderCropList() {
  const cropTypes = await strapi.find('crop-types');
  // ...
}

// ✅ GOOD: Cache and refresh
const cropTypesCache = useMemo(() => {
  return strapi.find('crop-types');
}, []); // Load once on mount
```

### 3. Combine Related Fetches
```typescript
// ❌ BAD: Multiple serial requests
const cropType = await strapi.find('crop-types', id);
const varieties = await strapi.find('varieties', { crop_type: id });

// ✅ GOOD: Single request with populate
const cropType = await strapi.find('crop-types', id, {
  populate: ['varieties']
});
```

### 4. Handle Strapi Downtime Gracefully
```typescript
// ❌ BAD: App breaks if Strapi down
const cropTypes = await strapi.find('crop-types');

// ✅ GOOD: Fallback to local storage
let cropTypes;
try {
  cropTypes = await strapi.find('crop-types');
  localStorage.setItem('cropTypes', JSON.stringify(cropTypes));
} catch (error) {
  cropTypes = JSON.parse(localStorage.getItem('cropTypes') || '[]');
  showWarning('Using cached data');
}
```

---

## 📊 Monitoring & Observability

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Strapi API Response Time | < 100ms | > 500ms |
| Cache Hit Rate | > 90% | < 70% |
| Strapi Availability | 99.9% | < 99% |
| Supabase Query Time | < 200ms | > 1s |
| Failed Strapi Fetches | < 0.1% | > 1% |

### Logging Strategy

```typescript
// Log Strapi fetch failures
logger.error('Strapi fetch failed', {
  endpoint: 'crop-types',
  error: error.message,
  fallback: 'using_cache',
  impact: 'user_sees_cached_data'
});

// Log cache performance
logger.info('Reference data loaded', {
  source: 'strapi',
  cached: true,
  load_time_ms: 45,
  items_count: 156
});
```

---

**Next**: See [STRAPI_MIGRATION_GUIDE.md](./STRAPI_MIGRATION_GUIDE.md) for detailed migration steps
