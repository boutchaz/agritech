---
description: Scaffold a react-hook-form + zod form with dialog, validation, and API integration
---

# Scaffold Form Component

You are scaffolding a form component for the AgriTech React frontend using react-hook-form + zod.

## Input: $ARGUMENTS

## Steps

### 1. Determine form details
Parse the user's input to determine:
- **Entity name** (PascalCase)
- **Fields** with types and validation rules
- **Mode**: create-only, edit-only, or create+edit (default)
- **Layout**: dialog (default) or full page
- **Related entities** (dropdowns from other queries, e.g., farms, parcels)

### 2. Create the form component

Create `project/src/components/{Entity}/{Entity}Form.tsx`:

```typescript
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCreate{Entity}, useUpdate{Entity} } from '@/hooks/use{Entity}';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// --- Schema ---
const create{Entity}Schema = (t: (key: string) => string) =>
  z.object({
    // Define fields here based on entity requirements
    name: z.string().min(1, t('{featureName}.validation.nameRequired')),
    description: z.string().optional(),
    // Add more fields...
  });

type {Entity}FormData = z.infer<ReturnType<typeof create{Entity}Schema>>;

// --- Props ---
interface {Entity}FormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: {Entity} | null; // null = create mode
  onSuccess?: () => void;
}

// --- Component ---
export function {Entity}Form({ open, onOpenChange, editingItem, onSuccess }: {Entity}FormProps) {
  const { t } = useTranslation();
  const { organizationId } = useAuth();
  const isEditing = !!editingItem;

  const schema = useMemo(() => create{Entity}Schema(t), [t]);
  const createMutation = useCreate{Entity}();
  const updateMutation = useUpdate{Entity}();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{Entity}FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Reset form when dialog opens or editingItem changes
  useEffect(() => {
    if (open) {
      reset(
        editingItem
          ? { name: editingItem.name, description: editingItem.description || '' }
          : { name: '', description: '' },
      );
    }
  }, [open, editingItem, reset]);

  const onSubmit = async (data: {Entity}FormData) => {
    if (!organizationId) return;
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data,
          organizationId,
        });
        toast.success(t('{featureName}.updated', '{Entity} updated'));
      } else {
        await createMutation.mutateAsync({ data, organizationId });
        toast.success(t('{featureName}.created', '{Entity} created'));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || t('common.error', 'An error occurred'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('{featureName}.edit', 'Edit {Entity}')
              : t('{featureName}.create', 'New {Entity}')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label={t('{featureName}.fields.name', 'Name')}
            error={errors.name?.message}
            required
          >
            <Input {...register('name')} placeholder={t('{featureName}.fields.namePlaceholder', 'Enter name')} />
          </FormField>

          <FormField
            label={t('{featureName}.fields.description', 'Description')}
            error={errors.description?.message}
          >
            <Textarea {...register('description')} rows={3} />
          </FormField>

          {/* Add more FormField entries for each field */}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('common.saving', 'Saving...')
                : isEditing
                  ? t('common.save', 'Save')
                  : t('common.create', 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. For select/dropdown fields with related entities

Add this pattern inside the component:
```typescript
// Fetch related data for dropdowns
const { data: farms = [] } = useFarms(organizationId);

// In the form:
<FormField label={t('fields.farm', 'Farm')} error={errors.farm_id?.message} required>
  <Select onValueChange={(val) => setValue('farm_id', val)} value={watch('farm_id')}>
    <SelectTrigger>
      <SelectValue placeholder={t('fields.selectFarm', 'Select a farm')} />
    </SelectTrigger>
    <SelectContent>
      {farms.map((farm) => (
        <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</FormField>
```

### 4. For cascading selects (e.g., farm → parcels)

```typescript
const watchedFarmId = watch('farm_id');
const { data: parcels = [] } = useParcels(organizationId, watchedFarmId);

useEffect(() => {
  if (watchedFarmId) setValue('parcel_id', '');
}, [watchedFarmId]);
```

### 5. Wire up in the page component

Show how to integrate the form in the parent page:
```typescript
const [formOpen, setFormOpen] = useState(false);
const [editingItem, setEditingItem] = useState<{Entity} | null>(null);

// Open for create
<Button onClick={() => { setEditingItem(null); setFormOpen(true); }}>New</Button>

// Open for edit
<Button onClick={() => { setEditingItem(item); setFormOpen(true); }}>Edit</Button>

// Render
<{Entity}Form
  open={formOpen}
  onOpenChange={setFormOpen}
  editingItem={editingItem}
/>
```

### 6. Add delete confirmation

If the page needs delete functionality, add an AlertDialog pattern:
```typescript
const [deletingItem, setDeletingItem] = useState<{Entity} | null>(null);
const deleteMutation = useDelete{Entity}();

<AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
  <AlertDialogContent>
    <AlertDialogTitle>{t('{featureName}.deleteConfirm', 'Delete {Entity}?')}</AlertDialogTitle>
    <AlertDialogDescription>{t('common.cannotUndo', 'This action cannot be undone.')}</AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
      <AlertDialogAction
        onClick={async () => {
          await deleteMutation.mutateAsync({ id: deletingItem!.id, organizationId: organizationId! });
          toast.success(t('{featureName}.deleted', '{Entity} deleted'));
          setDeletingItem(null);
        }}
      >
        {t('common.delete', 'Delete')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 7. Add translations for form
Add to `project/src/locales/en/common.json`:
```json
"{featureName}": {
  "validation": {
    "nameRequired": "Name is required"
  },
  "created": "{Entity} created successfully",
  "updated": "{Entity} updated successfully",
  "deleted": "{Entity} deleted successfully",
  "deleteConfirm": "Delete this {entity}?",
  "fields": {
    "name": "Name",
    "namePlaceholder": "Enter name",
    "description": "Description"
  }
}
```
