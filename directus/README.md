# Directus CMS Configuration

This directory contains Directus CMS configuration for managing agricultural content dynamically.

## 📁 Structure

```
directus/
├── config.ts                 # Directus client configuration
├── schemas/                  # Collection schemas (JSON)
│   ├── tree-categories.schema.json
│   ├── trees.schema.json
│   └── plantation-types.schema.json
├── scripts/                  # Management scripts
│   ├── create-collections.ts # Creates collections in Directus
│   └── sync-from-supabase.ts # Syncs data from Supabase to Directus
├── hooks/                    # React hooks for Directus
│   └── useDirectusTreeManagement.ts
└── collections/              # Generated collection definitions
```

## 🚀 Setup

1. **Install dependencies:**
   ```bash
   cd directus
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Directus credentials
   ```

3. **Create collections in Directus:**
   ```bash
   npm run create-collections
   ```

4. **Sync data from Supabase (optional):**
   ```bash
   npm run sync-from-supabase
   ```

## 📝 Environment Variables

Create a `.env` file with:

```env
DIRECTUS_URL=http://localhost:8055
DIRECTUS_ADMIN_EMAIL=admin@example.com
DIRECTUS_ADMIN_PASSWORD=your-password
DIRECTUS_ADMIN_TOKEN=your-admin-token

# For frontend
VITE_DIRECTUS_URL=http://localhost:8055
```

## 🔧 Scripts

### Create Collections
Creates Directus collections based on JSON schemas:

```bash
npm run create-collections
```

This will:
- Create `tree_categories` collection
- Create `trees` collection
- Create `plantation_types` collection
- Set up relationships between collections

### Sync from Supabase
Syncs existing data from Supabase to Directus:

```bash
npm run sync-from-supabase
```

This will:
- Fetch all tree categories and trees from Supabase
- Fetch all plantation types from Supabase
- Create/update items in Directus

### Run All
Run both scripts in sequence:

```bash
npm run sync
```

## 🎨 Collections

### tree_categories
- Organization-scoped tree categories
- One-to-many relationship with trees
- Fields: id, category, organization_id, status, dates

### trees
- Individual tree types within categories
- Many-to-one relationship with tree_categories
- Fields: id, name, category_id, status, dates

### plantation_types
- Plantation density and spacing configurations
- Organization-scoped
- Fields: id, type, spacing, trees_per_ha, organization_id, status, dates

## 🔌 Frontend Integration

### Using React Hooks

```typescript
import { useDirectusTreeCategories, useDirectusPlantationTypes } from '@/directus/hooks/useDirectusTreeManagement';

function TreeManagement() {
  const { currentOrganization } = useAuth();

  const {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    addTree,
    updateTree,
    deleteTree
  } = useDirectusTreeCategories(currentOrganization?.id);

  const {
    plantationTypes,
    addPlantationType,
    updatePlantationType,
    deletePlantationType
  } = useDirectusPlantationTypes(currentOrganization?.id);

  // Use the data and functions...
}
```

### Direct API Usage

```typescript
import { readItems, createItem } from '@directus/sdk';
import directus from '@/directus/config';

// Fetch items
const categories = await directus.request(
  readItems('tree_categories', {
    filter: { organization_id: { _eq: orgId } }
  })
);

// Create item
const newCategory = await directus.request(
  createItem('tree_categories', {
    category: 'New Category',
    organization_id: orgId,
    status: 'published'
  })
);
```

## 🔄 Data Flow

1. **Supabase → Directus (Initial Sync)**
   - Run `npm run sync-from-supabase` to populate Directus with existing data

2. **Directus CMS → Frontend**
   - Content managers use Directus UI to manage content
   - Frontend fetches from Directus API

3. **Frontend → Directus**
   - Users can also create/edit content from the app
   - Changes are saved to Directus

## 🔐 Permissions

Set up appropriate permissions in Directus:

1. **Public Role:** Read-only access to published items
2. **Authenticated Role:** CRUD on items for their organization
3. **Admin Role:** Full access to all collections

## 📚 Schema Management

To add a new collection:

1. Create schema JSON in `schemas/` directory
2. Add to `create-collections.ts` script
3. Run `npm run create-collections`

### Schema Template

```json
{
  "collection": "collection_name",
  "meta": {
    "collection": "collection_name",
    "icon": "icon_name",
    "note": "Description",
    "display_template": "{{field_name}}"
  },
  "schema": {
    "name": "collection_name"
  },
  "fields": [...]
}
```

## 🐛 Troubleshooting

### Collection already exists
If you see "already exists" errors, the collections are already created. Use the sync script instead.

### Authentication errors
Make sure your `DIRECTUS_ADMIN_TOKEN` is correct and has admin privileges.

### Missing data
Run the sync script to populate Directus with data from Supabase.
