---
description: Scaffold a new frontend page with route, API service, hooks, and components
---

# Scaffold Frontend Page

You are scaffolding a new page for the AgriTech React frontend. The user will provide a feature name and description.

## Input: $ARGUMENTS

## Steps

### 1. Determine page details
Parse the user's input to determine:
- **Feature name** (kebab-case for route, PascalCase for components)
- **Route group**: (production), (inventory), (accounting), (workforce), (settings), (core)
- **Page type**: list page, detail page, form page, or dashboard page
- **API endpoint** it connects to (e.g., `/api/v1/feature-name`)
- **Key data fields** to display

### 2. Create API service

Create `project/src/lib/api/{feature-name}.ts`:
```typescript
import { apiClient } from './client';

export interface {Entity} {
  id: string;
  organization_id: string;
  // ... fields
  created_at: string;
  updated_at: string;
}

export interface Create{Entity}Input {
  // ... required fields
}

export const {featureName}Api = {
  getAll: async (organizationId: string, filters?: Record<string, string>) => {
    const params = new URLSearchParams(filters);
    const response = await apiClient.get(`/api/v1/{feature-name}?${params}`, {
      headers: { 'X-Organization-Id': organizationId },
    });
    return response.data;
  },

  getById: async (organizationId: string, id: string) => {
    const response = await apiClient.get(`/api/v1/{feature-name}/${id}`, {
      headers: { 'X-Organization-Id': organizationId },
    });
    return response.data;
  },

  create: async (data: Create{Entity}Input, organizationId: string) => {
    const response = await apiClient.post('/api/v1/{feature-name}', data, {
      headers: { 'X-Organization-Id': organizationId },
    });
    return response.data;
  },

  update: async (id: string, data: Partial<Create{Entity}Input>, organizationId: string) => {
    const response = await apiClient.put(`/api/v1/{feature-name}/${id}`, data, {
      headers: { 'X-Organization-Id': organizationId },
    });
    return response.data;
  },

  delete: async (id: string, organizationId: string) => {
    const response = await apiClient.delete(`/api/v1/{feature-name}/${id}`, {
      headers: { 'X-Organization-Id': organizationId },
    });
    return response.data;
  },
};
```

### 3. Create query hooks

Create `project/src/hooks/use{Entity}.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {featureName}Api } from '@/lib/api/{feature-name}';

export const use{EntityPlural} = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['{feature-name}', organizationId],
    queryFn: () => {featureName}Api.getAll(organizationId!),
    enabled: !!organizationId,
  });
};

export const use{Entity} = (organizationId: string | null, id: string | null) => {
  return useQuery({
    queryKey: ['{feature-name}', organizationId, id],
    queryFn: () => {featureName}Api.getById(organizationId!, id!),
    enabled: !!organizationId && !!id,
  });
};

export const useCreate{Entity} = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, organizationId }: { data: any; organizationId: string }) =>
      {featureName}Api.create(data, organizationId),
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['{feature-name}', organizationId] });
    },
  });
};

export const useUpdate{Entity} = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, organizationId }: { id: string; data: any; organizationId: string }) =>
      {featureName}Api.update(id, data, organizationId),
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['{feature-name}', organizationId] });
    },
  });
};

export const useDelete{Entity} = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, organizationId }: { id: string; organizationId: string }) =>
      {featureName}Api.delete(id, organizationId),
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ['{feature-name}', organizationId] });
    },
  });
};
```

### 4. Create the route file

Create `project/src/routes/_authenticated/({group})/{feature-name}.tsx`:
```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { use{EntityPlural} } from '@/hooks/use{Entity}';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_authenticated/({group})/{feature-name}')({
  component: {Entity}Page,
});

function {Entity}Page() {
  const { t } = useTranslation();
  const { organizationId } = useAuth();
  const { data, isLoading } = use{EntityPlural}(organizationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('{featureName}.title', '{EntityPlural}')}</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('{featureName}.create', 'New {Entity}')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t('common.loading', 'Loading...')}</div>
        </div>
      ) : data?.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Card content */}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <p className="text-muted-foreground mb-4">
            {t('{featureName}.empty', 'No {entity-plural} yet')}
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('{featureName}.create', 'New {Entity}')}
          </Button>
        </div>
      )}
    </div>
  );
}
```

### 5. Add translations
Add keys to `project/src/locales/en/common.json`, `fr/common.json`, and `ar/common.json`:
```json
"{featureName}": {
  "title": "{Entity Plural}",
  "create": "New {Entity}",
  "edit": "Edit {Entity}",
  "delete": "Delete {Entity}",
  "empty": "No {entity plural} yet",
  "fields": {
    "name": "Name"
  }
}
```

### 6. Regenerate routes
```bash
cd project && npx tsr generate
```

### 7. Remind the user
- Add navigation link in sidebar config (`src/config/sidebar-nav.ts`)
- Wrap with `<Can>` if permission-gated
- Create form component if needed (use `/scaffold-form`)
