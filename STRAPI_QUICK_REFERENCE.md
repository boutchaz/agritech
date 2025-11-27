# Strapi Migration - Quick Reference Card

## 🎯 The Rule: Static vs Dynamic

```
┌─────────────────────────────────────────────┐
│  If it's CONFIGURED → Strapi CMS            │
│  If it's CREATED by users → Supabase        │
└─────────────────────────────────────────────┘
```

## ✅ Move to Strapi: 25 Tables

### Agricultural (8)
- crop_types, crop_categories, crop_varieties
- tree_categories, trees
- plantation_types, test_types
- product_categories

### Financial (5)
- currencies, taxes, cost_categories
- account_templates, cost_centers

### Task Management (3)
- task_categories, task_templates, work_units

### Inventory (3)
- item_groups, product_subcategories, warehouses

### Security (3)
- role_templates, permissions, permission_groups

### Content (3)
- analysis_recommendations
- [new] blog_posts, help_articles

## ❌ Keep in Supabase: 81 Tables

All transactional, user-generated, real-time data:
- User data (4 tables)
- Farm operations (2 tables)
- Financial transactions (18 tables)
- Inventory operations (17 tables)
- Task execution (13 tables)
- Crop operations (3 tables)
- Satellite data (8 tables)
- CRM (2 tables)
- Assets (3 tables)
- Security (5 tables)
- System (6 tables)

## 🚀 Migration Order

```
Phase 1 (Week 1-2):    currencies, work_units, *_categories (6 tables)
Phase 2 (Week 3-4):    crop_types, trees, varieties (5 tables)
Phase 3 (Week 5-6):    task templates, item_groups (5 tables)
Phase 4 (Week 7-8):    account templates, permissions (9 tables)
```

## 💻 Code Pattern

### Before
```typescript
const { data } = await supabase
  .from('crop_types')
  .select('*');
```

### After
```typescript
const data = await fetch(`${STRAPI_URL}/api/crop-types`)
  .then(res => res.json())
  .then(({ data }) => data.map(item => ({
    id: item.id,
    ...item.attributes
  })));
```

## 🔑 Key Benefits

| Benefit | Impact |
|---------|--------|
| Content Management | Non-technical staff manage reference data |
| Caching | 90%+ faster frontend loads |
| Versioning | Draft/publish workflow |
| API Docs | Auto-generated OpenAPI |
| Database Size | 50% reduction in Supabase DB |
| Scalability | Independent scaling |

## ⚠️ Critical Steps

1. ✓ Backup both databases
2. ✓ Test migration in dev first
3. ✓ Use feature flags
4. ✓ Update app code BEFORE dropping tables
5. ✓ Monitor API performance

## 📊 Success Criteria

- [ ] All 25 tables migrated
- [ ] Zero data loss
- [ ] API < 200ms (cached)
- [ ] No breaking changes
- [ ] Strapi admin accessible
- [ ] 50% Supabase DB reduction

## 📚 Full Documentation

- [STRAPI_MIGRATION_GUIDE.md](./STRAPI_MIGRATION_GUIDE.md) - Complete guide
- [STRAPI_MIGRATION_SUMMARY.md](./STRAPI_MIGRATION_SUMMARY.md) - Detailed summary
- [STRAPI_ARCHITECTURE.md](./STRAPI_ARCHITECTURE.md) - Architecture patterns

---
**Last Updated**: 2025-11-27
