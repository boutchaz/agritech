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
  Boxes,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/radix-select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { workUnitsApi } from '@/lib/api/work-units';
import { SectionLoader } from '@/components/ui/loader';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

type WorkUnitFormData = z.infer<typeof _baseWorkUnitSchema>;

// =====================================================
// MAIN COMPONENT
// =====================================================

export function WorkUnitManagement() {
  const { currentOrganization, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const _showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

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

      const createData = {
        code: data.code,
        name: data.name,
        unit_category: data.unit_category,
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

      const updateData = {
        name: data.name,
        unit_category: data.unit_category,
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
      const promises = DEFAULT_WORK_UNITS.map((unit) =>
        workUnitsApi.create(
          {
            code: unit.code,
            name: unit.name,
            unit_category: unit.unit_category,
            is_active: true,
          },
          currentOrganization.id
        )
      );

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
      <Card className="rounded-3xl border-slate-100 p-8 shadow-sm">
        <p className="text-slate-500 font-medium">
          {t('workUnits.accessDenied')}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
              <Boxes className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
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
              className="h-12 px-6 rounded-2xl border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('workUnits.loadDefaults')}
            </Button>
          )}
          <Button 
            variant="default"
            onClick={() => handleOpenDialog()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg shadow-emerald-100 dark:shadow-none transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('workUnits.addUnit')}
          </Button>
        </div>
      </div>

      {/* Filters & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Stats Column */}
        <div className="lg:col-span-4 grid grid-cols-1 gap-4 order-2 lg:order-1">
          {[
            { label: t('workUnits.stats.totalUnits'), value: workUnits.length, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: t('workUnits.stats.active'), value: workUnits.filter((u) => u.is_active).length, icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: t('workUnits.stats.categories'), value: Object.keys(unitsByCategory).length, icon: Filter, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30' },
          ].map((stat, idx) => (
            <Card key={idx} className="rounded-3xl border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-2xl shadow-sm border border-transparent group-hover:scale-110 transition-transform duration-500", stat.bg)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{stat.label}</span>
                    <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{stat.value}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Column */}
        <div className="lg:col-span-8 order-1 lg:order-2 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder={t('workUnits.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-14 pl-11 pr-5 rounded-2xl bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm focus:ring-emerald-500/20 font-bold"
              />
            </div>
            <div className="sm:w-64">
              <Select
                value={filterCategory}
                onValueChange={(val) => setFilterCategory(val as UnitCategory | 'all')}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm font-black uppercase tracking-widest text-[10px]">
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

          {/* Units List */}
          {isLoading ? (
            <div className="py-20">
              <SectionLoader />
            </div>
          ) : filteredUnits.length === 0 ? (
            <Card className="rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 p-12 text-center">
              <Boxes className="mx-auto h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {t('workUnits.empty')}
              </h3>
              <p className="text-sm font-medium text-slate-400 mt-2 max-w-sm mx-auto">
                {workUnits.length === 0 && t('workUnits.emptyHint')}
              </p>
            </Card>
          ) : (
            <div className="space-y-10">
              {Object.entries(unitsByCategory).map(([category, units]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-3 px-1">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                      {getCategoryLabel(category as UnitCategory)}
                    </h3>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-[9px] px-2 py-0 h-5">{units.length}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {units.map((unit) => (
                      <Card key={unit.id} className="rounded-3xl border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group/unit">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{unit.name}</h4>
                                {!unit.is_active && (
                                  <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[8px] tracking-widest px-1.5 py-0 h-4">INACTIVE</Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-0.5">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{t('workUnits.code')}</span>
                                  <span className="text-[10px] font-mono font-black text-blue-600 dark:text-blue-400">{unit.code}</span>
                                </div>
                                {unit.usage_count > 0 && (
                                  <div className="space-y-0.5">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Usage</span>
                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{t('workUnits.used', { count: unit.usage_count })}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2 pt-1">
                                {unit.name_fr && (
                                  <Badge variant="outline" className="text-[8px] font-black tracking-widest border-slate-100 text-slate-400 uppercase">FR: {unit.name_fr}</Badge>
                                )}
                                {unit.name_ar && (
                                  <Badge variant="outline" className="text-[8px] font-black tracking-widest border-slate-100 text-slate-400 uppercase">AR: {unit.name_ar}</Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenDialog(unit)}
                                className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-emerald-600 border border-slate-100 dark:border-slate-800 transition-all shadow-sm"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(unit.id)}
                                disabled={unit.usage_count > 0}
                                className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-rose-600 border border-slate-100 dark:border-slate-800 transition-all shadow-sm disabled:opacity-30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog - Redesigned Modal */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white dark:bg-slate-900">
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
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
}
