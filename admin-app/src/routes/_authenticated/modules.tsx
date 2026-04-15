import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Plus, Pencil, Trash2, X, GripVertical } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { toast } from 'sonner';
import clsx from 'clsx';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as Tabs from '@radix-ui/react-tabs';

// ─── Types ───────────────────────────────────────────────────────────

interface ModuleTranslation {
  id: string;
  module_id: string;
  locale: string;
  name: string | null;
  description: string | null;
  features: string[] | null;
}

interface AdminModule {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  color: string | null;
  category: string | null;
  description: string | null;
  display_order: number;
  price_monthly: number;
  is_required: boolean;
  is_recommended: boolean;
  is_addon_eligible: boolean;
  is_available: boolean;
  required_plan: string | null;
  dashboard_widgets: unknown[];
  navigation_items: unknown[];
  features: unknown[];
  module_translations: ModuleTranslation[];
}

// ─── API Hooks ───────────────────────────────────────────────────────

function useAdminModules() {
  return useQuery({
    queryKey: ['admin-modules'],
    queryFn: () => apiRequest<AdminModule[]>('/api/v1/admin/modules'),
  });
}

function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest<AdminModule>('/api/v1/admin/modules', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-modules'] }); },
  });
}

function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest<AdminModule>(`/api/v1/admin/modules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-modules'] }); },
  });
}

function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<AdminModule>(`/api/v1/admin/modules/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-modules'] }); },
  });
}

function useUpsertTranslation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, locale, data }: { moduleId: string; locale: string; data: Record<string, unknown> }) =>
      apiRequest(`/api/v1/admin/modules/${moduleId}/translations/${locale}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-modules'] }); },
  });
}

// ─── Schema ──────────────────────────────────────────────────────────

const moduleSchema = z.object({
  slug: z.string().min(1, 'Required').regex(/^[a-z0-9_-]+$/, 'Lowercase, numbers, hyphens, underscores only'),
  name: z.string().min(1, 'Required'),
  icon: z.string().optional(),
  color: z.string().optional(),
  category: z.string().optional(),
  display_order: z.coerce.number().min(0),
  price_monthly: z.coerce.number().min(0),
  required_plan: z.string().optional(),
  is_required: z.boolean(),
  is_recommended: z.boolean(),
  is_addon_eligible: z.boolean(),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

// ─── Page Component ──────────────────────────────────────────────────

function ModulesPage() {
  const { data: modules = [], isLoading } = useAdminModules();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  const [editModule, setEditModule] = useState<AdminModule | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleToggle = async (mod: AdminModule) => {
    try {
      await updateModule.mutateAsync({ id: mod.id, data: { is_available: !mod.is_available } });
      toast.success(`Module ${mod.is_available ? 'désactivé' : 'activé'}`);
    } catch {
      toast.error('Échec de la mise à jour');
    }
  };

  const handleDelete = async (mod: AdminModule) => {
    if (!confirm(`Désactiver le module "${mod.name}" ?`)) return;
    try {
      await deleteModule.mutateAsync(mod.id);
      toast.success('Module désactivé');
    } catch {
      toast.error('Échec');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Gestion des Modules
          </h1>
          <p className="text-gray-500 mt-1">Configurez les modules, routes, widgets et traductions.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Nouveau Module
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ordre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Catégorie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prix/mois</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plan requis</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Routes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actif</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => {
                const frTranslation = mod.module_translations?.find(t => t.locale === 'fr');
                const navCount = Array.isArray(mod.navigation_items) ? mod.navigation_items.length : 0;
                return (
                  <tr key={mod.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-gray-400">
                        <GripVertical className="h-3 w-3" />
                        {mod.display_order}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{mod.slug || '—'}</td>
                    <td className="px-4 py-3 font-medium">{frTranslation?.name || mod.name}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        mod.category === 'agriculture' && 'bg-green-100 text-green-700',
                        mod.category === 'elevage' && 'bg-amber-100 text-amber-700',
                        mod.category === 'functional' && 'bg-blue-100 text-blue-700',
                        !mod.category && 'bg-gray-100 text-gray-600',
                      )}>
                        {mod.category || 'other'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{mod.price_monthly > 0 ? `${mod.price_monthly} MAD` : '—'}</td>
                    <td className="px-4 py-3 text-xs">{mod.required_plan || 'Aucun'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{navCount} route{navCount !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3">
                      <Switch.Root
                        checked={mod.is_available}
                        onCheckedChange={() => handleToggle(mod)}
                        className={clsx(
                          'w-9 h-5 rounded-full transition-colors',
                          mod.is_available ? 'bg-green-500' : 'bg-gray-300',
                        )}
                      >
                        <Switch.Thumb className={clsx(
                          'block w-4 h-4 bg-white rounded-full transition-transform',
                          mod.is_available ? 'translate-x-[18px]' : 'translate-x-[2px]',
                        )} />
                      </Switch.Root>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditModule(mod)} className="p-1.5 rounded hover:bg-gray-100" title="Modifier">
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </button>
                        <button onClick={() => handleDelete(mod)} className="p-1.5 rounded hover:bg-red-50" title="Désactiver">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      {(showCreate || editModule) && (
        <ModuleDialog
          module={editModule}
          onClose={() => { setEditModule(null); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

// ─── Edit Dialog ─────────────────────────────────────────────────────

function ModuleDialog({ module, onClose }: { module: AdminModule | null; onClose: () => void }) {
  const isEdit = !!module;
  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const upsertTranslation = useUpsertTranslation();

  // General tab form
  const form = useForm<ModuleFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(moduleSchema) as any,
    defaultValues: {
      slug: module?.slug || '',
      name: module?.name || '',
      icon: module?.icon || '',
      color: module?.color || '',
      category: module?.category || '',
      display_order: module?.display_order || 0,
      price_monthly: module?.price_monthly || 0,
      required_plan: module?.required_plan || '',
      is_required: module?.is_required || false,
      is_recommended: module?.is_recommended || false,
      is_addon_eligible: module?.is_addon_eligible || false,
    },
  });

  // Routes & Widgets state
  const [navItems, setNavItems] = useState<string[]>(() => {
    if (!module?.navigation_items) return [];
    return (module.navigation_items as Array<string | { to?: string }>).map(
      item => typeof item === 'string' ? item : (item.to || ''),
    ).filter(Boolean);
  });
  const [widgets, setWidgets] = useState<string[]>(() => {
    if (!module?.dashboard_widgets) return [];
    return (module.dashboard_widgets as string[]).filter(Boolean);
  });
  const [newRoute, setNewRoute] = useState('');
  const [newWidget, setNewWidget] = useState('');

  // Translations state
  const LOCALES = ['fr', 'en', 'ar'] as const;
  const [translations, setTranslations] = useState<Record<string, { name: string; description: string; features: string[] }>>(() => {
    const result: Record<string, { name: string; description: string; features: string[] }> = {};
    for (const locale of LOCALES) {
      const existing = module?.module_translations?.find(t => t.locale === locale);
      result[locale] = {
        name: existing?.name || '',
        description: existing?.description || '',
        features: existing?.features || [],
      };
    }
    return result;
  });
  const [newFeature, setNewFeature] = useState<Record<string, string>>({ fr: '', en: '', ar: '' });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveGeneral = async (data: any) => {
    try {
      const payload = {
        ...data,
        required_plan: data.required_plan || null,
        navigation_items: navItems,
        dashboard_widgets: widgets,
      };

      if (isEdit) {
        await updateModule.mutateAsync({ id: module.id, data: payload });
      } else {
        await createModule.mutateAsync(payload);
      }
      toast.success(isEdit ? 'Module mis à jour' : 'Module créé');
      if (!isEdit) onClose();
    } catch (e) {
      toast.error(`Erreur: ${e instanceof Error ? e.message : 'Inconnue'}`);
    }
  };

  const handleSaveTranslation = async (locale: string) => {
    if (!module?.id) { toast.error('Enregistrez le module d\'abord'); return; }
    try {
      await upsertTranslation.mutateAsync({
        moduleId: module.id,
        locale,
        data: translations[locale],
      });
      toast.success(`Traduction ${locale.toUpperCase()} enregistrée`);
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-[700px] max-h-[85vh] overflow-y-auto z-50 p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <Dialog.Title className="text-lg font-semibold">
              {isEdit ? `Modifier: ${module.name}` : 'Nouveau Module'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </Dialog.Close>
          </div>

          <Tabs.Root defaultValue="general" className="px-6 py-4">
            <Tabs.List className="flex gap-4 border-b mb-4">
              <Tabs.Trigger value="general" className="pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600">
                Général
              </Tabs.Trigger>
              <Tabs.Trigger value="routes" className="pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600">
                Routes & Widgets
              </Tabs.Trigger>
              {isEdit && (
                <Tabs.Trigger value="translations" className="pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600">
                  Traductions
                </Tabs.Trigger>
              )}
            </Tabs.List>

            {/* ── General Tab ── */}
            <Tabs.Content value="general">
              <form onSubmit={form.handleSubmit(handleSaveGeneral)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Slug *</label>
                    <input {...form.register('slug')} className={inputClass} placeholder="compliance" disabled={isEdit} />
                    {form.formState.errors.slug && <p className="text-xs text-red-500 mt-1">{form.formState.errors.slug.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Nom *</label>
                    <input {...form.register('name')} className={inputClass} placeholder="Conformité" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Icône</label>
                    <input {...form.register('icon')} className={inputClass} placeholder="shield-check" />
                  </div>
                  <div>
                    <label className={labelClass}>Couleur</label>
                    <input {...form.register('color')} className={inputClass} placeholder="#10B981" />
                  </div>
                  <div>
                    <label className={labelClass}>Catégorie</label>
                    <select {...form.register('category')} className={inputClass}>
                      <option value="">Autre</option>
                      <option value="agriculture">Agriculture</option>
                      <option value="elevage">Élevage</option>
                      <option value="functional">Fonctionnel</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Ordre d'affichage</label>
                    <input {...form.register('display_order')} type="number" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Prix / mois (MAD)</label>
                    <input {...form.register('price_monthly')} type="number" step="0.01" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Plan requis</label>
                    <select {...form.register('required_plan')} className={inputClass}>
                      <option value="">Aucun</option>
                      <option value="essential">Essential</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...form.register('is_required')} className="rounded" />
                    Requis
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...form.register('is_recommended')} className="rounded" />
                    Recommandé
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...form.register('is_addon_eligible')} className="rounded" />
                    Addon éligible
                  </label>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button type="submit" disabled={createModule.isPending || updateModule.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {(createModule.isPending || updateModule.isPending) ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </Tabs.Content>

            {/* ── Routes & Widgets Tab ── */}
            <Tabs.Content value="routes">
              <div className="space-y-6">
                {/* Navigation Items */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Routes de navigation</h3>
                  <p className="text-xs text-gray-500 mb-3">Les routes accessibles quand ce module est activé.</p>
                  <div className="space-y-2">
                    {navItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-50 px-3 py-1.5 rounded text-sm font-mono">{item}</code>
                        <button onClick={() => setNavItems(navItems.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={newRoute}
                        onChange={(e) => setNewRoute(e.target.value)}
                        className={inputClass}
                        placeholder="/compliance"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newRoute.trim()) {
                            e.preventDefault();
                            setNavItems([...navItems, newRoute.trim()]);
                            setNewRoute('');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => { if (newRoute.trim()) { setNavItems([...navItems, newRoute.trim()]); setNewRoute(''); } }}
                        className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dashboard Widgets */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Widgets du tableau de bord</h3>
                  <p className="text-xs text-gray-500 mb-3">Identifiants des widgets affichés quand ce module est activé.</p>
                  <div className="space-y-2">
                    {widgets.map((w, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-50 px-3 py-1.5 rounded text-sm font-mono">{w}</code>
                        <button onClick={() => setWidgets(widgets.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={newWidget}
                        onChange={(e) => setNewWidget(e.target.value)}
                        className={inputClass}
                        placeholder="compliance-dashboard"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newWidget.trim()) {
                            e.preventDefault();
                            setWidgets([...widgets, newWidget.trim()]);
                            setNewWidget('');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => { if (newWidget.trim()) { setWidgets([...widgets, newWidget.trim()]); setNewWidget(''); } }}
                        className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    type="button"
                    disabled={updateModule.isPending}
                    onClick={async () => {
                      if (!module?.id) { toast.error('Enregistrez le module d\'abord'); return; }
                      try {
                        await updateModule.mutateAsync({
                          id: module.id,
                          data: { navigation_items: navItems, dashboard_widgets: widgets },
                        });
                        toast.success('Routes & widgets enregistrés');
                      } catch { toast.error('Erreur'); }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateModule.isPending ? 'Enregistrement...' : 'Enregistrer routes & widgets'}
                  </button>
                </div>
              </div>
            </Tabs.Content>

            {/* ── Translations Tab ── */}
            {isEdit && (
              <Tabs.Content value="translations">
                <div className="space-y-6">
                  {LOCALES.map((locale) => (
                    <div key={locale} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold uppercase text-gray-600">{locale}</h3>
                        <button
                          type="button"
                          onClick={() => handleSaveTranslation(locale)}
                          disabled={upsertTranslation.isPending}
                          className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                        >
                          Enregistrer {locale.toUpperCase()}
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className={labelClass}>Nom</label>
                          <input
                            value={translations[locale].name}
                            onChange={(e) => setTranslations(prev => ({
                              ...prev,
                              [locale]: { ...prev[locale], name: e.target.value },
                            }))}
                            className={inputClass}
                            dir={locale === 'ar' ? 'rtl' : 'ltr'}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Description</label>
                          <textarea
                            value={translations[locale].description}
                            onChange={(e) => setTranslations(prev => ({
                              ...prev,
                              [locale]: { ...prev[locale], description: e.target.value },
                            }))}
                            className={inputClass}
                            rows={2}
                            dir={locale === 'ar' ? 'rtl' : 'ltr'}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Fonctionnalités</label>
                          <div className="space-y-1">
                            {translations[locale].features.map((f, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="flex-1 text-sm bg-gray-50 px-2 py-1 rounded" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{f}</span>
                                <button onClick={() => {
                                  const updated = translations[locale].features.filter((_, i) => i !== idx);
                                  setTranslations(prev => ({ ...prev, [locale]: { ...prev[locale], features: updated } }));
                                }} className="text-red-400 hover:text-red-600"><X className="h-3 w-3" /></button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <input
                                value={newFeature[locale]}
                                onChange={(e) => setNewFeature(prev => ({ ...prev, [locale]: e.target.value }))}
                                className={inputClass}
                                placeholder="Nouvelle fonctionnalité..."
                                dir={locale === 'ar' ? 'rtl' : 'ltr'}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newFeature[locale].trim()) {
                                    e.preventDefault();
                                    setTranslations(prev => ({
                                      ...prev,
                                      [locale]: { ...prev[locale], features: [...prev[locale].features, newFeature[locale].trim()] },
                                    }));
                                    setNewFeature(prev => ({ ...prev, [locale]: '' }));
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newFeature[locale].trim()) {
                                    setTranslations(prev => ({
                                      ...prev,
                                      [locale]: { ...prev[locale], features: [...prev[locale].features, newFeature[locale].trim()] },
                                    }));
                                    setNewFeature(prev => ({ ...prev, [locale]: '' }));
                                  }
                                }}
                                className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Tabs.Content>
            )}
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Route ───────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/modules')({
  component: ModulesPage,
});
