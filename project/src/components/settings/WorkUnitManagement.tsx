/**
 * Work Unit Management Component
 *
 * Allows organization admins to manage work units (Arbre, Caisse, Kg, Litre, etc.)
 * used for piece-work payment tracking
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Filter,
  BarChart3,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type {
  WorkUnit,
  WorkUnitInsertDto,
  WorkUnitUpdateDto,
  UnitCategory,
} from '@/types/work-units';
import { UNIT_CATEGORIES } from '@/types/work-units';

// =====================================================
// VALIDATION SCHEMA
// =====================================================

// Base schema type (validation messages will be added dynamically)
const baseWorkUnitSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase(),
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional(),
  name_fr: z.string().max(100).optional(),
  unit_category: z.enum(['count', 'weight', 'volume', 'area', 'length']),
  base_unit: z.string().max(20).optional(),
  conversion_factor: z.number().positive().optional(),
  allow_decimal: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type WorkUnitFormData = z.infer<typeof baseWorkUnitSchema>;

// =====================================================
// MAIN COMPONENT
// =====================================================

export function WorkUnitManagement() {
  const { currentOrganization, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<WorkUnit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<UnitCategory | 'all'>('all');

  const isAdmin = hasRole(['organization_admin', 'system_admin']);

  // Get translated category labels
  const getCategoryLabel = (category: UnitCategory) => {
    return t(`workUnits.categories.${category}`);
  };

  // Create schema with translated messages
  const workUnitSchemaWithTranslations = z.object({
    code: z.string()
      .min(1, t('workUnits.validation.codeRequired'))
      .max(20, t('workUnits.validation.codeMaxLength'))
      .toUpperCase(),
    name: z.string()
      .min(1, t('workUnits.validation.nameRequired'))
      .max(100, t('workUnits.validation.nameMaxLength')),
    name_ar: z.string().max(100).optional(),
    name_fr: z.string().max(100).optional(),
    unit_category: z.enum(['count', 'weight', 'volume', 'area', 'length']),
    base_unit: z.string().max(20).optional(),
    conversion_factor: z.number().positive().optional(),
    allow_decimal: z.boolean().default(false),
    is_active: z.boolean().default(true),
  });

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const { data: workUnits = [], isLoading } = useQuery({
    queryKey: ['work-units', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('work_units')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('unit_category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as WorkUnit[];
    },
    enabled: !!currentOrganization?.id,
  });

  // =====================================================
  // MUTATIONS
  // =====================================================

  const createMutation = useMutation({
    mutationFn: async (data: WorkUnitFormData) => {
      if (!currentOrganization?.id) throw new Error(t('workUnits.errors.noOrganization'));

      const insertData: WorkUnitInsertDto = {
        organization_id: currentOrganization.id,
        ...data,
      };

      const { data: newUnit, error } = await supabase
        .from('work_units')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return newUnit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-units'] });
      setIsDialogOpen(false);
      form.reset();
      toast.success(t('workUnits.create.success'));
    },
    onError: (error) => {
      toast.error(t('workUnits.create.failed'), {
        description: error instanceof Error ? error.message : t('workUnits.create.failedDescription'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WorkUnitFormData }) => {
      const updateData: WorkUnitUpdateDto = data;

      const { data: updatedUnit, error } = await supabase
        .from('work_units')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedUnit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-units'] });
      setIsDialogOpen(false);
      setEditingUnit(null);
      form.reset();
      toast.success(t('workUnits.update.success'));
    },
    onError: (error) => {
      toast.error(t('workUnits.update.failed'), {
        description: error instanceof Error ? error.message : t('workUnits.update.failedDescription'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('work_units')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-units'] });
      toast.success(t('workUnits.delete.success'));
    },
    onError: (error) => {
      toast.error(t('workUnits.delete.failed'), {
        description: error instanceof Error ? error.message : t('workUnits.delete.failedDescription'),
      });
    },
  });

  const seedDefaultUnitsMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.id) throw new Error(t('workUnits.errors.noOrganization'));

      const { error } = await supabase.rpc('seed_default_work_units', {
        p_organization_id: currentOrganization.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-units'] });
      toast.success(t('workUnits.seed.success'));
    },
    onError: (error) => {
      toast.error(t('workUnits.seed.failed'), {
        description: error instanceof Error ? error.message : t('workUnits.seed.failedDescription'),
      });
    },
  });

  // =====================================================
  // FORM HANDLING
  // =====================================================

  const form = useForm<WorkUnitFormData>({
    resolver: zodResolver(workUnitSchemaWithTranslations),
    defaultValues: {
      code: '',
      name: '',
      name_ar: '',
      name_fr: '',
      unit_category: 'count',
      allow_decimal: false,
      is_active: true,
    },
  });

  const handleOpenDialog = (unit?: WorkUnit) => {
    if (unit) {
      setEditingUnit(unit);
      form.reset({
        code: unit.code,
        name: unit.name,
        name_ar: unit.name_ar || '',
        name_fr: unit.name_fr || '',
        unit_category: unit.unit_category,
        base_unit: unit.base_unit || '',
        conversion_factor: unit.conversion_factor || undefined,
        allow_decimal: unit.allow_decimal,
        is_active: unit.is_active,
      });
    } else {
      setEditingUnit(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUnit(null);
    form.reset();
  };

  const onSubmit = (data: WorkUnitFormData) => {
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(t('workUnits.delete.confirm'))) {
      deleteMutation.mutate(id);
    }
  };

  // =====================================================
  // FILTERING
  // =====================================================

  const filteredUnits = workUnits.filter((unit) => {
    const matchesSearch =
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.name_fr?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || unit.unit_category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Group by category
  const unitsByCategory = filteredUnits.reduce((acc, unit) => {
    if (!acc[unit.unit_category]) {
      acc[unit.unit_category] = [];
    }
    acc[unit.unit_category].push(unit);
    return acc;
  }, {} as Record<UnitCategory, WorkUnit[]>);

  // =====================================================
  // RENDER
  // =====================================================

  if (!isAdmin) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">
          {t('workUnits.accessDenied')}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('workUnits.title')}</h2>
          <p className="text-muted-foreground">
            {t('workUnits.description')}
          </p>
        </div>
        <div className="flex gap-2">
          {workUnits.length === 0 && (
            <Button
              onClick={() => seedDefaultUnitsMutation.mutate()}
              disabled={seedDefaultUnitsMutation.isPending}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('workUnits.loadDefaults')}
            </Button>
          )}
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('workUnits.addUnit')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('workUnits.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as UnitCategory | 'all')}
        >
          <option value="all">{t('workUnits.allCategories')}</option>
          {UNIT_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {getCategoryLabel(cat.value)}
            </option>
          ))}
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('workUnits.stats.totalUnits')}</p>
              <p className="text-2xl font-bold">{workUnits.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('workUnits.stats.active')}</p>
              <p className="text-2xl font-bold">
                {workUnits.filter((u) => u.is_active).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Filter className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('workUnits.stats.categories')}</p>
              <p className="text-2xl font-bold">
                {Object.keys(unitsByCategory).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Units List */}
      {isLoading ? (
        <Card className="p-6">
          <p className="text-center text-muted-foreground">{t('workUnits.loading')}</p>
        </Card>
      ) : filteredUnits.length === 0 ? (
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            {t('workUnits.empty')} {workUnits.length === 0 && t('workUnits.emptyHint')}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(unitsByCategory).map(([category, units]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 capitalize">{getCategoryLabel(category as UnitCategory)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {units.map((unit) => (
                  <Card key={unit.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{unit.name}</h4>
                          {!unit.is_active && (
                            <Badge variant="secondary">{t('workUnits.inactive')}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {t('workUnits.code')}: <span className="font-mono font-medium">{unit.code}</span>
                        </p>
                        {unit.name_fr && (
                          <p className="text-sm text-muted-foreground">FR: {unit.name_fr}</p>
                        )}
                        {unit.name_ar && (
                          <p className="text-sm text-muted-foreground">AR: {unit.name_ar}</p>
                        )}
                        {unit.usage_count > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {t('workUnits.used', { count: unit.usage_count })}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(unit)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(unit.id)}
                          disabled={unit.usage_count > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? t('workUnits.dialog.editTitle') : t('workUnits.dialog.createTitle')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="code"
                render={({ field }) => (
                  <div>
                    <label className="text-sm font-medium">{t('workUnits.form.code')} *</label>
                    <Input {...field} placeholder={t('workUnits.form.codePlaceholder')} maxLength={20} />
                    {form.formState.errors.code && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.code.message}
                      </p>
                    )}
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="unit_category"
                render={({ field }) => (
                  <div>
                    <label className="text-sm font-medium">{t('workUnits.form.category')} *</label>
                    <Select {...field}>
                      {UNIT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {getCategoryLabel(cat.value)}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="name"
              render={({ field }) => (
                <div>
                  <label className="text-sm font-medium">{t('workUnits.form.nameEn')} *</label>
                  <Input {...field} placeholder={t('workUnits.form.nameEnPlaceholder')} />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="name_fr"
                render={({ field }) => (
                  <div>
                    <label className="text-sm font-medium">{t('workUnits.form.nameFr')}</label>
                    <Input {...field} placeholder={t('workUnits.form.nameFrPlaceholder')} />
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <div>
                    <label className="text-sm font-medium">{t('workUnits.form.nameAr')}</label>
                    <Input {...field} placeholder={t('workUnits.form.nameArPlaceholder')} dir="rtl" />
                  </div>
                )}
              />
            </div>

            <div className="flex items-center gap-6">
              <Controller
                control={form.control}
                name="allow_decimal"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="allow_decimal"
                    />
                    <label htmlFor="allow_decimal" className="text-sm font-medium">
                      {t('workUnits.form.allowDecimal')}
                    </label>
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="is_active"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium">
                      {t('workUnits.form.active')}
                    </label>
                  </div>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                <X className="h-4 w-4 mr-2" />
                {t('workUnits.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                {editingUnit ? t('workUnits.update') : t('workUnits.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
