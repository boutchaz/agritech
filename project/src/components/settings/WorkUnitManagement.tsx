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
  Filter,
  BarChart3,
  Boxes,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { FilterBar, ListPageLayout, ResponsiveList } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/radix-select';
import { Switch } from '@/components/ui/switch';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  workUnitsApi,
  type CreateWorkUnitInput,
  type UpdateWorkUnitInput,
  type UnitCategory as ApiUnitCategory,
} from '@/lib/api/work-units';
import { SectionLoader } from '@/components/ui/loader';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import type {
  WorkUnit,
  UnitCategory,
} from '@/types/work-units';
import { UNIT_CATEGORIES } from '@/types/work-units';

// =====================================================
// VALIDATION SCHEMA
// =====================================================

// Base schema type (validation messages will be added dynamically)
const _baseWorkUnitSchema = z.object({
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

type WorkUnitFormInput = z.input<typeof _baseWorkUnitSchema>;
type WorkUnitFormData = z.output<typeof _baseWorkUnitSchema>;

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

  const { data: workUnits = [], isLoading, isFetching } = useQuery({
    queryKey: ['work-units', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const data = await workUnitsApi.getAll({}, currentOrganization.id);
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

        const createData: CreateWorkUnitInput = {
          code: data.code,
          name: data.name,
          unit_category: data.unit_category as ApiUnitCategory,
          description: undefined,
          base_rate: undefined,
          is_active: data.is_active ?? true,
      };

      return await workUnitsApi.create(createData, currentOrganization.id);
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
      if (!currentOrganization?.id) throw new Error(t('workUnits.errors.noOrganization'));

      const updateData: UpdateWorkUnitInput = {
        name: data.name,
        unit_category: data.unit_category as ApiUnitCategory,
        is_active: data.is_active,
      };

      return await workUnitsApi.update(id, updateData, currentOrganization.id);
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
      if (!currentOrganization?.id) throw new Error(t('workUnits.errors.noOrganization'));
      return await workUnitsApi.delete(id, currentOrganization.id);
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

      const { DEFAULT_WORK_UNITS } = await import('@/types/work-units');
      const promises = DEFAULT_WORK_UNITS.map((unit) => {
        const payload: CreateWorkUnitInput = {
          code: unit.code,
          name: unit.name,
          unit_category: unit.unit_category as ApiUnitCategory,
          is_active: true,
        };

        return workUnitsApi.create(payload, currentOrganization.id);
      });

      await Promise.all(promises);
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

  const form = useForm<WorkUnitFormInput, unknown, WorkUnitFormData>({
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

  const renderActions = (unit: WorkUnit, buttonSize: 'sm' | 'icon' = 'icon') => (
    <div className="flex justify-end gap-2">
      <Button
        size={buttonSize}
        variant="ghost"
        onClick={() => handleOpenDialog(unit)}
        className="h-9 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 shadow-sm transition-all hover:text-emerald-600 dark:border-slate-800 dark:bg-slate-900"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        size={buttonSize}
        variant="ghost"
        onClick={() => handleDelete(unit.id)}
        disabled={unit.usage_count > 0}
        className="h-9 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 shadow-sm transition-all hover:text-rose-600 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-900"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderCard = (unit: WorkUnit) => (
    <Card className="group/unit rounded-3xl border-slate-100 shadow-sm transition-all hover:shadow-md dark:border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="truncate font-black uppercase tracking-tight text-slate-900 dark:text-white">{unit.name}</h4>
              {!unit.is_active && (
                <Badge className="h-4 border-none bg-rose-50 px-1.5 py-0 text-[8px] font-black tracking-widest text-rose-600">INACTIVE</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">{t('workUnits.code')}</span>
                <span className="font-mono text-[10px] font-black text-blue-600 dark:text-blue-400">{unit.code}</span>
              </div>
              {unit.usage_count > 0 && (
                <div className="space-y-0.5">
                  <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Usage</span>
                  <span className="text-[10px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">{t('workUnits.used', { count: unit.usage_count })}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {unit.name_fr && (
                <Badge variant="outline" className="border-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-400">FR: {unit.name_fr}</Badge>
              )}
              {unit.name_ar && (
                <Badge variant="outline" className="border-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-400">AR: {unit.name_ar}</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {renderActions(unit)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTableHeader = (
    <TableRow>
      <TableHead className="py-3 px-4 text-left font-medium">{t('workUnits.form.nameEn')}</TableHead>
      <TableHead className="py-3 px-4 text-left font-medium">{t('workUnits.code')}</TableHead>
      <TableHead className="py-3 px-4 text-left font-medium">{t('workUnits.form.nameFr')}</TableHead>
      <TableHead className="py-3 px-4 text-left font-medium">{t('workUnits.form.nameAr')}</TableHead>
      <TableHead className="py-3 px-4 text-left font-medium">{t('workUnits.stats.active')}</TableHead>
      <TableHead className="py-3 px-4 text-left font-medium">Usage</TableHead>
      <TableHead className="py-3 px-4 text-right font-medium">{t('common.actions', 'Actions')}</TableHead>
    </TableRow>
  );

  const renderTable = (unit: WorkUnit) => (
    <>
      <TableCell className="py-3 px-4 font-medium">{unit.name}</TableCell>
      <TableCell className="py-3 px-4">
        <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">{unit.code}</span>
      </TableCell>
      <TableCell className="py-3 px-4 text-muted-foreground">{unit.name_fr || '-'}</TableCell>
      <TableCell className="py-3 px-4 text-muted-foreground">{unit.name_ar || '-'}</TableCell>
      <TableCell className="py-3 px-4">
        <Badge variant={unit.is_active ? 'default' : 'secondary'}>
          {unit.is_active ? t('workUnits.stats.active') : t('common.inactive', 'Inactive')}
        </Badge>
      </TableCell>
      <TableCell className="py-3 px-4 text-muted-foreground">
        {unit.usage_count > 0 ? t('workUnits.used', { count: unit.usage_count }) : '-'}
      </TableCell>
      <TableCell className="py-3 px-4">{renderActions(unit, 'sm')}</TableCell>
    </>
  );

  // =====================================================
  // RENDER
  // =====================================================

  if (!isAdmin) {
    return (
      <Card className="rounded-3xl border-slate-100 p-8 shadow-sm">
        <EmptyState
          variant="inline"
          icon={Boxes}
          title={t('workUnits.title')}
          description={t('workUnits.accessDenied')}
        />
      </Card>
    );
  }

  return (
    <>
      <ListPageLayout
        className="space-y-8 animate-in fade-in duration-500"
        header={
          <div className="flex flex-col justify-between gap-6 border-b border-slate-100 pb-8 dark:border-slate-800 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-2.5 dark:bg-emerald-900/30">
                  <Boxes className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  {t('workUnits.title')}
                </h2>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('workUnits.description')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {workUnits.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => seedDefaultUnitsMutation.mutate()}
                  disabled={seedDefaultUnitsMutation.isPending}
                  className="h-12 rounded-2xl border-slate-200 px-6 text-xs font-black uppercase tracking-widest transition-all hover:bg-slate-50 dark:border-slate-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('workUnits.loadDefaults')}
                </Button>
              )}
              <Button
                variant="default"
                onClick={() => handleOpenDialog()}
                className="h-12 rounded-2xl bg-emerald-600 px-8 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-all duration-300 hover:bg-emerald-700 dark:shadow-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('workUnits.addUnit')}
              </Button>
            </div>
          </div>
        }
        filters={
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <FilterBar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder={t('workUnits.searchPlaceholder')}
                className="w-full"
              />
            </div>
            <div className="sm:w-64">
              <Select
                value={filterCategory}
                onValueChange={(val) => setFilterCategory(val as UnitCategory | 'all')}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-white text-[10px] font-black uppercase tracking-widest shadow-sm border-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all" className="font-bold text-[10px] uppercase tracking-widest">{t('workUnits.allCategories')}</SelectItem>
                  {UNIT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="font-bold text-[10px] uppercase tracking-widest">
                      {getCategoryLabel(cat.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
        stats={
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              { label: t('workUnits.stats.totalUnits'), value: workUnits.length, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
              { label: t('workUnits.stats.active'), value: workUnits.filter((u) => u.is_active).length, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
              { label: t('workUnits.stats.categories'), value: Object.keys(unitsByCategory).length, icon: Filter, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30' },
            ].map((stat) => (
              <Card key={stat.label} className="group overflow-hidden rounded-3xl border-slate-100 shadow-sm transition-all hover:shadow-md dark:border-slate-700">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className={cn('rounded-2xl border border-transparent p-2.5 shadow-sm transition-transform duration-500 group-hover:scale-110', stat.bg)}>
                      <stat.icon className={cn('h-5 w-5', stat.color)} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-black uppercase leading-none tracking-widest text-slate-400 dark:text-slate-500">{stat.label}</span>
                      <div className="tabular-nums text-xl font-black text-slate-900 dark:text-white">{stat.value}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        {isLoading ? (
          <div className="py-20">
            <SectionLoader />
          </div>
        ) : filteredUnits.length === 0 ? (
          <EmptyState
            variant="card"
            icon={Boxes}
            title={t('workUnits.empty')}
            description={workUnits.length === 0 ? t('workUnits.emptyHint') : t('workUnits.searchPlaceholder')}
            action={workUnits.length === 0 ? {
              label: t('workUnits.addUnit'),
              onClick: () => handleOpenDialog(),
            } : undefined}
          />
        ) : (
          <div className="space-y-10">
            {Object.entries(unitsByCategory).map(([category, units]) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    {getCategoryLabel(category as UnitCategory)}
                  </h3>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                  <Badge variant="secondary" className="h-5 bg-slate-100 px-2 py-0 text-[9px] font-black text-slate-500 dark:bg-slate-800">{units.length}</Badge>
                </div>

                <ResponsiveList
                  items={units}
                  isLoading={isLoading}
                  isFetching={isFetching}
                  keyExtractor={(unit) => unit.id}
                  renderCard={renderCard}
                  renderTable={renderTable}
                  renderTableHeader={renderTableHeader}
                  emptyIcon={Boxes}
                  emptyMessage={t('workUnits.empty')}
                />
              </div>
            ))}
          </div>
        )}
      </ListPageLayout>

      {/* Create/Edit Dialog - Redesigned Modal */}
      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        size="2xl"
        className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white dark:bg-slate-900"
      >
          <DialogHeader className="p-8 pb-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
                <Boxes className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                {editingUnit ? t('workUnits.dialog.editTitle') : t('workUnits.dialog.createTitle')}
              </DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Controller
                control={form.control}
                name="code"
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t('workUnits.form.code')} *</Label>
                    <Input {...field} placeholder={t('workUnits.form.codePlaceholder')} maxLength={20} className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 font-bold px-5 focus:ring-emerald-500/20" />
                    {form.formState.errors.code && (
                      <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">
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
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t('workUnits.form.category')} *</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 font-bold px-5 text-xs uppercase tracking-tight">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {UNIT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value} className="font-bold text-[10px] uppercase tracking-widest">
                            {getCategoryLabel(cat.value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="name"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t('workUnits.form.nameEn')} *</Label>
                  <Input {...field} placeholder={t('workUnits.form.nameEnPlaceholder')} className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 font-bold px-5 focus:ring-emerald-500/20" />
                  {form.formState.errors.name && (
                    <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tight">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Controller
                control={form.control}
                name="name_fr"
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t('workUnits.form.nameFr')}</Label>
                    <Input {...field} placeholder={t('workUnits.form.nameFrPlaceholder')} className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 font-bold px-5 focus:ring-emerald-500/20" />
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{t('workUnits.form.nameAr')}</Label>
                    <Input {...field} placeholder={t('workUnits.form.nameArPlaceholder')} dir="rtl" className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 font-bold px-5 focus:ring-emerald-500/20" />
                  </div>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-8 p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
              <Controller
                control={form.control}
                name="allow_decimal"
                render={({ field }) => (
                  <div className="flex items-center justify-between group">
                    <Label htmlFor="allow_decimal" className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest cursor-pointer group-hover:text-emerald-600 transition-colors">
                      {t('workUnits.form.allowDecimal')}
                    </Label>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="allow_decimal"
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <div className="flex items-center justify-between group">
                    <Label htmlFor="is_active" className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest cursor-pointer group-hover:text-emerald-600 transition-colors">
                      {t('workUnits.form.active')}
                    </Label>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="is_active"
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                )}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={handleCloseDialog} className="h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('workUnits.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="h-12 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none transition-all"
              >
                <Check className="h-4 w-4 mr-2" />
                {editingUnit ? t('workUnits.updateLabel') : t('workUnits.createLabel')}
              </Button>
            </div>
          </form>
      </ResponsiveDialog>
    </>
  );
}
