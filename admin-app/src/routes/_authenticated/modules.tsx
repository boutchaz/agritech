import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Plus, Pencil, Trash2, X, Loader2, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
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

interface NavigationItem {
  to: string;
  label?: string;
  icon?: string;
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

// ─── Normalizers ─────────────────────────────────────────────────────

function normalizeNavItems(raw: unknown[]): NavigationItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): NavigationItem | null => {
      if (typeof item === 'string') return { to: item };
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const to = typeof obj.to === 'string' ? obj.to : null;
        if (!to) return null;
        return {
          to,
          label: typeof obj.label === 'string' ? obj.label : undefined,
          icon: typeof obj.icon === 'string' ? obj.icon : undefined,
        };
      }
      return null;
    })
    .filter((item): item is NavigationItem => item !== null);
}

function normalizeWidgetIds(raw: unknown[]): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((w): w is string => typeof w === 'string' && w.length > 0);
}

// ─── API Hooks ───────────────────────────────────────────────────────

function useAdminModules() {
  return useQuery({
    queryKey: ['admin-modules'],
    queryFn: () => apiRequest<AdminModule[]>('/api/v1/admin/modules'),
  });
}

function useRouteManifest() {
  return useQuery({
    queryKey: ['admin-route-manifest'],
    queryFn: () =>
      apiRequest<{ routes: string[]; generated_at: string | null; count: number }>(
        '/api/v1/admin/route-manifest',
      ),
    staleTime: 5 * 60 * 1000,
  });
}

function useOrphanRoutes() {
  return useQuery({
    queryKey: ['admin-orphan-routes'],
    queryFn: () =>
      apiRequest<{ orphans: string[]; count: number }>(
        '/api/v1/admin/modules/orphan-routes',
      ),
    staleTime: 60 * 1000,
  });
}

function useLoadDefaultModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ seeded: number; deactivated: number; translationsSeeded: number }>(
        '/api/v1/admin/modules/load-defaults',
        { method: 'POST', body: JSON.stringify({}) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-modules'] });
      qc.invalidateQueries({ queryKey: ['admin-orphan-routes'] });
    },
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
  slug: z.string().min(1, 'Slug requis').regex(/^[a-z0-9_-]+$/, 'Minuscules, chiffres, tirets uniquement'),
  name: z.string().min(1, 'Nom requis'),
  icon: z.string().optional(),
  color: z.string().optional(),
  category: z.string().optional(),
  display_order: z.coerce.number().min(0, 'Doit être ≥ 0'),
  is_required: z.boolean(),
  is_recommended: z.boolean(),
  is_addon_eligible: z.boolean(),
  is_available: z.boolean(),
});

type ModuleFormData = z.infer<typeof moduleSchema>;
const resolver = zodResolver(moduleSchema) as Resolver<ModuleFormData>;

const LOCALES = ['fr', 'en', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

// ─── Page Component ──────────────────────────────────────────────────

function ModulesPage() {
  const { data: modules = [], isLoading } = useAdminModules();
  const { data: orphans } = useOrphanRoutes();
  const { data: manifest } = useRouteManifest();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  const loadDefaults = useLoadDefaultModules();
  const [editModule, setEditModule] = useState<AdminModule | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminModule | null>(null);
  const [orphansExpanded, setOrphansExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showLoadDefaults, setShowLoadDefaults] = useState(false);

  const allSelected = modules.length > 0 && modules.every((m) => selectedIds.has(m.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(modules.map((m) => m.id)));
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const failures: Array<{ id: string; reason: string }> = [];
    let succeeded = 0;
    for (const id of ids) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await deleteModule.mutateAsync(id);
        succeeded += 1;
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'unknown';
        failures.push({ id, reason });
      }
    }
    if (succeeded > 0) {
      toast.success(`${succeeded} module${succeeded > 1 ? 's' : ''} supprimé${succeeded > 1 ? 's' : ''}`);
    }
    if (failures.length > 0) {
      const preview = failures.slice(0, 2).map((f) => f.reason).join(' · ');
      toast.error(
        `${failures.length} échec${failures.length > 1 ? 's' : ''}${preview ? `: ${preview}` : ''}`,
      );
    }
    setSelectedIds(new Set(failures.map((f) => f.id)));
    setShowBulkDelete(false);
  };

  const confirmLoadDefaults = async () => {
    try {
      const res = await loadDefaults.mutateAsync();
      toast.success(
        `${res.seeded} modules par défaut rechargés, ${res.deactivated} désactivés, ${res.translationsSeeded} traductions.`,
      );
      setShowLoadDefaults(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec du chargement des valeurs par défaut');
    }
  };

  const handleToggle = async (mod: AdminModule) => {
    try {
      await updateModule.mutateAsync({ id: mod.id, data: { is_available: !mod.is_available } });
      toast.success(`Module ${mod.is_available ? 'désactivé' : 'activé'}`);
    } catch {
      toast.error('Échec de la mise à jour');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteModule.mutateAsync(deleteTarget.id);
      toast.success('Module supprimé');
      setDeleteTarget(null);
    } catch {
      toast.error('Échec de la suppression');
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
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setShowLoadDefaults(true)}
            disabled={loadDefaults.isPending}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
            title="Réinsère les 12 modules canoniques et désactive les autres"
          >
            {loadDefaults.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Charger les valeurs par défaut
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nouveau Module
          </button>
        </div>
      </div>

      {/* Manifest + orphan routes audit strip */}
      {manifest && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm">
          <span className="text-gray-500">
            Manifest: <span className="font-mono font-semibold text-gray-800">{manifest.count}</span> routes
            {manifest.generated_at && (
              <span className="ml-2 text-[11px] text-gray-400">
                généré {new Date(manifest.generated_at).toLocaleString('fr-FR')}
              </span>
            )}
          </span>
          {orphans && orphans.count > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <button
                type="button"
                onClick={() => setOrphansExpanded((v) => !v)}
                className="flex items-center gap-1.5 text-amber-700 hover:text-amber-800 font-medium"
              >
                <AlertTriangle className="h-4 w-4" />
                {orphans.count} route{orphans.count > 1 ? 's' : ''} orphelin{orphans.count > 1 ? 'es' : 'e'}
              </button>
            </>
          )}
        </div>
      )}
      {orphans && orphans.count > 0 && orphansExpanded && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900 mb-2">
            Routes définies dans le code mais non assignées à un module
          </p>
          <p className="text-xs text-amber-800 mb-3">
            Ces routes passent actuellement à travers le ModuleGate comme non-gated.
            Assignez-les à un module ci-dessous, ou retirez-les du code si obsolètes.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs font-mono text-amber-900">
            {orphans.orphans.map((r) => (
              <li key={r} className="bg-white/70 rounded px-2 py-1 border border-amber-200">
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
        </div>
      ) : modules.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Package className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-700">Aucun module configuré</p>
          <p className="text-xs text-gray-500 mt-1">
            Cliquez sur "Nouveau Module" pour en ajouter un.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Tout sélectionner"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ordre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Catégorie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Routes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Traductions</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">État</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actif</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => {
                const frTranslation = mod.module_translations?.find(t => t.locale === 'fr');
                const filledLocales = (mod.module_translations ?? [])
                  .filter((t) => (t.name ?? '').trim().length > 0)
                  .map((t) => t.locale);
                const navCount = Array.isArray(mod.navigation_items) ? mod.navigation_items.length : 0;
                const missing: string[] = [];
                if (!mod.slug) missing.push('slug');
                if (filledLocales.length < LOCALES.length) missing.push('traductions');
                if (navCount === 0) missing.push('routes');
                return (
                  <tr
                    key={mod.id}
                    className={clsx(
                      'border-b last:border-b-0 hover:bg-gray-50',
                      selectedIds.has(mod.id) && 'bg-emerald-50/50',
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Sélectionner ${mod.name}`}
                        checked={selectedIds.has(mod.id)}
                        onChange={() => toggleOne(mod.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-500">{mod.display_order}</td>
                    <td className="px-4 py-3 font-mono text-xs">{mod.slug || <span className="text-red-500">—</span>}</td>
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
                    <td className="px-4 py-3 text-xs text-gray-500">{navCount} route{navCount !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {LOCALES.map((l) => {
                          const on = filledLocales.includes(l);
                          return (
                            <span
                              key={l}
                              className={clsx(
                                'text-[10px] font-mono px-1.5 py-0.5 rounded',
                                on
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-400',
                              )}
                              title={on ? `Traduction ${l} remplie` : `Traduction ${l} manquante`}
                            >
                              {l}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {missing.length === 0 ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          title="Configuration complète"
                        >
                          <CheckCircle2 className="h-3 w-3" /> complet
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                          title={`Manque: ${missing.join(', ')}`}
                        >
                          <AlertTriangle className="h-3 w-3" /> {missing.length} manquant{missing.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Switch.Root
                        checked={mod.is_available}
                        onCheckedChange={() => handleToggle(mod)}
                        aria-label={`Activer ${mod.name}`}
                        className={clsx(
                          'w-9 h-5 rounded-full transition-colors',
                          mod.is_available ? 'bg-emerald-500' : 'bg-gray-300',
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
                        <button
                          onClick={() => setEditModule(mod)}
                          className="p-1.5 rounded hover:bg-gray-100"
                          title="Modifier"
                          aria-label={`Modifier ${mod.name}`}
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(mod)}
                          className="p-1.5 rounded hover:bg-red-50"
                          title="Supprimer"
                          aria-label={`Supprimer ${mod.name}`}
                        >
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

      {/* Delete confirmation */}
      <Dialog.Root open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-[440px] z-50 p-6">
            <Dialog.Title className="text-lg font-semibold">Supprimer le module ?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-600">
              Suppression définitive. Les traductions et les activations par organisation (organization_modules) seront supprimées en cascade. Les modules requis (is_required = true) sont protégés.
            </Dialog.Description>
            {deleteTarget && (
              <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {deleteTarget.name} <span className="font-mono text-xs text-gray-500">({deleteTarget.slug})</span>
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteModule.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteModule.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Bulk delete confirmation */}
      <Dialog.Root open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-[480px] z-50 p-6">
            <Dialog.Title className="text-lg font-semibold">Supprimer {selectedIds.size} module{selectedIds.size > 1 ? 's' : ''} ?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-600">
              Suppression définitive des modules sélectionnés. Les traductions et les activations par organisation (organization_modules) seront supprimées en cascade. Les modules requis (is_required = true) sont protégés et seront ignorés.
            </Dialog.Description>
            <ul className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 space-y-1">
              {modules
                .filter((m) => selectedIds.has(m.id))
                .map((m) => (
                  <li key={m.id}>
                    {m.name} <span className="font-mono text-xs text-gray-500">({m.slug || '—'})</span>
                  </li>
                ))}
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkDelete(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmBulkDelete}
                disabled={deleteModule.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteModule.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Supprimer {selectedIds.size}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Load defaults confirmation */}
      <Dialog.Root open={showLoadDefaults} onOpenChange={setShowLoadDefaults}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-[500px] z-50 p-6">
            <Dialog.Title className="text-lg font-semibold">Charger les valeurs par défaut ?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-600">
              Réinsère les 12 modules canoniques (core, chat_advisor, agromind_advisor, satellite, personnel, stock, production, fruit_trees, compliance, sales_purchasing, accounting, marketplace) avec leurs routes et traductions. Tout autre module sera désactivé (is_available = false). Les activations par organisation (organization_modules) ne sont pas touchées.
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLoadDefaults(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmLoadDefaults}
                disabled={loadDefaults.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loadDefaults.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Charger
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// ─── Edit Dialog ─────────────────────────────────────────────────────

function ModuleDialog({ module, onClose }: { module: AdminModule | null; onClose: () => void }) {
  const isEdit = !!module;
  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const upsertTranslation = useUpsertTranslation();
  const { data: manifest } = useRouteManifest();
  const manifestRoutes = manifest?.routes ?? [];
  const manifestSet = useMemo(() => new Set(manifestRoutes), [manifestRoutes]);

  const isValidRoute = (path: string): boolean => {
    if (!path) return false;
    if (manifestRoutes.length === 0) return true; // no manifest → skip validation
    if (manifestSet.has(path)) return true;
    // accept as prefix covering a subtree
    return manifestRoutes.some((r) => r.startsWith(`${path}/`));
  };

  const form = useForm<ModuleFormData>({
    resolver,
    defaultValues: {
      slug: module?.slug ?? '',
      name: module?.name ?? '',
      icon: module?.icon ?? '',
      color: module?.color ?? '',
      category: module?.category ?? '',
      display_order: module?.display_order ?? 0,
      is_required: module?.is_required ?? false,
      is_recommended: module?.is_recommended ?? false,
      is_addon_eligible: module?.is_addon_eligible ?? false,
      is_available: module?.is_available ?? true,
    },
  });

  // Routes & Widgets state — full objects so label/icon round-trip.
  const [navItems, setNavItems] = useState<NavigationItem[]>(() =>
    normalizeNavItems(module?.navigation_items ?? []),
  );
  const [widgets, setWidgets] = useState<string[]>(() =>
    normalizeWidgetIds(module?.dashboard_widgets ?? []),
  );
  const [newNav, setNewNav] = useState<NavigationItem>({ to: '', label: '', icon: '' });
  const [newWidget, setNewWidget] = useState('');

  // Translations state
  const [translations, setTranslations] = useState<Record<Locale, { name: string; description: string; features: string[] }>>(() => {
    const result = {} as Record<Locale, { name: string; description: string; features: string[] }>;
    for (const locale of LOCALES) {
      const existing = module?.module_translations?.find(t => t.locale === locale);
      result[locale] = {
        name: existing?.name ?? '',
        description: existing?.description ?? '',
        features: existing?.features ?? [],
      };
    }
    return result;
  });
  const [newFeature, setNewFeature] = useState<Record<Locale, string>>({ fr: '', en: '', ar: '' });

  const translationFilledCount = LOCALES.filter(
    (l) => translations[l].name.trim().length > 0,
  ).length;

  const handleSaveGeneral = async (data: ModuleFormData) => {
    try {
      // Strip empty-string label/icon so we send undefined, not "".
      const cleanedNavItems = navItems.map((item) => ({
        to: item.to,
        ...(item.label ? { label: item.label } : {}),
        ...(item.icon ? { icon: item.icon } : {}),
      }));

      const payload = {
        ...data,
        category: data.category || null,
        navigation_items: cleanedNavItems,
        dashboard_widgets: widgets,
      };

      if (isEdit && module) {
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

  const handleSaveRoutesWidgets = async () => {
    if (!module?.id) return;
    try {
      const cleanedNavItems = navItems.map((item) => ({
        to: item.to,
        ...(item.label ? { label: item.label } : {}),
        ...(item.icon ? { icon: item.icon } : {}),
      }));
      await updateModule.mutateAsync({
        id: module.id,
        data: { navigation_items: cleanedNavItems, dashboard_widgets: widgets },
      });
      toast.success('Routes & widgets enregistrés');
    } catch (e) {
      toast.error(`Erreur: ${e instanceof Error ? e.message : 'Inconnue'}`);
    }
  };

  const handleSaveTranslation = async (locale: Locale) => {
    if (!module?.id) return;
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

  const addNavItem = () => {
    const to = newNav.to.trim();
    if (!to) return;
    setNavItems([...navItems, {
      to,
      ...(newNav.label?.trim() ? { label: newNav.label.trim() } : {}),
      ...(newNav.icon?.trim() ? { icon: newNav.icon.trim() } : {}),
    }]);
    setNewNav({ to: '', label: '', icon: '' });
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const errorClass = 'text-xs text-red-500 mt-1';

  const errors = form.formState.errors;

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl w-[740px] max-h-[85vh] overflow-y-auto z-50 p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <Dialog.Title className="text-lg font-semibold">
              {isEdit && module ? `Modifier: ${module.name}` : 'Nouveau Module'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded hover:bg-gray-100" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </Dialog.Close>
          </div>

          <Tabs.Root defaultValue="general" className="px-6 py-4">
            <Tabs.List className="flex gap-4 border-b mb-4">
              <Tabs.Trigger
                value="general"
                className="pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600"
              >
                Général
              </Tabs.Trigger>
              <Tabs.Trigger
                value="routes"
                disabled={!isEdit}
                className={clsx(
                  'pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600',
                  !isEdit && 'opacity-40 cursor-not-allowed',
                )}
                title={!isEdit ? 'Enregistrez le module d\'abord' : undefined}
              >
                Routes & Widgets
              </Tabs.Trigger>
              <Tabs.Trigger
                value="translations"
                disabled={!isEdit}
                className={clsx(
                  'pb-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 inline-flex items-center gap-2',
                  !isEdit && 'opacity-40 cursor-not-allowed',
                )}
                title={!isEdit ? 'Enregistrez le module d\'abord' : undefined}
              >
                Traductions
                {isEdit && (
                  <span className={clsx(
                    'text-xs px-1.5 py-0.5 rounded-full font-medium',
                    translationFilledCount === LOCALES.length
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700',
                  )}>
                    {translationFilledCount}/{LOCALES.length}
                  </span>
                )}
              </Tabs.Trigger>
            </Tabs.List>

            {/* ── General Tab ── */}
            <Tabs.Content value="general">
              <form onSubmit={form.handleSubmit(handleSaveGeneral)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Slug *</label>
                    <input {...form.register('slug')} className={inputClass} placeholder="compliance" disabled={isEdit} />
                    {errors.slug && <p className={errorClass}>{errors.slug.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Nom *</label>
                    <input {...form.register('name')} className={inputClass} placeholder="Conformité" />
                    {errors.name && <p className={errorClass}>{errors.name.message}</p>}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Ordre d'affichage</label>
                    <input {...form.register('display_order')} type="number" className={inputClass} />
                    {errors.display_order && <p className={errorClass}>{errors.display_order.message}</p>}
                    <p className="text-xs text-gray-400 mt-1">Ordre de tri dans la liste (plus petit = plus haut).</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...form.register('is_available')} className="rounded" />
                    Actif
                  </label>
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
                  <button
                    type="submit"
                    disabled={createModule.isPending || updateModule.isPending}
                    className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {(createModule.isPending || updateModule.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isEdit ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </Tabs.Content>

            {/* ── Routes & Widgets Tab ── */}
            {isEdit && (
              <Tabs.Content value="routes">
                {/* Shared datalist fed by the manifest endpoint — all <input list="route-manifest">
                    inputs render this as autocomplete. */}
                <datalist id="route-manifest">
                  {manifestRoutes.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                <div className="space-y-6">
                  {/* Navigation Items */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">Routes de navigation</h3>
                      <span className="text-[11px] text-gray-400">
                        {manifestRoutes.length > 0
                          ? `${manifestRoutes.length} routes disponibles`
                          : 'Manifest indisponible — validation désactivée'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Les routes accessibles quand ce module est activé. Autocomplétion depuis le manifest. Le chemin est requis, label et icône sont optionnels.
                    </p>
                    <div className="space-y-2">
                      {navItems.length === 0 && (
                        <p className="text-xs text-gray-400 italic">Aucune route configurée.</p>
                      )}
                      {navItems.map((item, idx) => {
                        const valid = isValidRoute(item.to);
                        return (
                        <div key={idx} className={clsx(
                          "flex items-start gap-2 rounded-lg border p-2",
                          !valid && item.to ? "border-amber-300 bg-amber-50" : "bg-gray-50"
                        )}>
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <input
                              list="route-manifest"
                              value={item.to}
                              onChange={(e) => {
                                const next = [...navItems];
                                next[idx] = { ...next[idx], to: e.target.value };
                                setNavItems(next);
                              }}
                              className={clsx(
                                "rounded border px-2 py-1 text-sm font-mono",
                                !valid && item.to ? "border-amber-400" : "border-gray-300",
                              )}
                              placeholder="/path"
                              title={!valid && item.to ? `Route inconnue dans le manifest. Lancez 'npm run gen:manifest' ou vérifiez l'orthographe.` : undefined}
                            />
                            <input
                              value={item.label ?? ''}
                              onChange={(e) => {
                                const next = [...navItems];
                                next[idx] = { ...next[idx], label: e.target.value };
                                setNavItems(next);
                              }}
                              className="rounded border border-gray-300 px-2 py-1 text-sm"
                              placeholder="Label"
                            />
                            <input
                              value={item.icon ?? ''}
                              onChange={(e) => {
                                const next = [...navItems];
                                next[idx] = { ...next[idx], icon: e.target.value };
                                setNavItems(next);
                              }}
                              className="rounded border border-gray-300 px-2 py-1 text-sm"
                              placeholder="Icône (lucide)"
                            />
                          </div>
                          <button
                            onClick={() => setNavItems(navItems.filter((_, i) => i !== idx))}
                            className="p-1 text-red-400 hover:text-red-600"
                            aria-label="Supprimer la route"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        );
                      })}
                      <div className="flex items-start gap-2 rounded-lg border border-dashed border-gray-300 p-2">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input
                            list="route-manifest"
                            value={newNav.to}
                            onChange={(e) => setNewNav({ ...newNav, to: e.target.value })}
                            className={clsx(
                              "rounded border px-2 py-1 text-sm font-mono",
                              newNav.to && !isValidRoute(newNav.to)
                                ? "border-amber-400 bg-amber-50"
                                : "border-gray-300",
                            )}
                            placeholder="/path"
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNavItem(); } }}
                          />
                          <input
                            value={newNav.label ?? ''}
                            onChange={(e) => setNewNav({ ...newNav, label: e.target.value })}
                            className="rounded border border-gray-300 px-2 py-1 text-sm"
                            placeholder="Label"
                          />
                          <input
                            value={newNav.icon ?? ''}
                            onChange={(e) => setNewNav({ ...newNav, icon: e.target.value })}
                            className="rounded border border-gray-300 px-2 py-1 text-sm"
                            placeholder="Icône"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addNavItem}
                          className="px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                          aria-label="Ajouter la route"
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
                          <button
                            onClick={() => setWidgets(widgets.filter((_, i) => i !== idx))}
                            className="p-1 text-red-400 hover:text-red-600"
                            aria-label="Supprimer le widget"
                          >
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
                          aria-label="Ajouter le widget"
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
                      onClick={handleSaveRoutesWidgets}
                      className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {updateModule.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Enregistrer routes & widgets
                    </button>
                  </div>
                </div>
              </Tabs.Content>
            )}

            {/* ── Translations Tab ── */}
            {isEdit && (
              <Tabs.Content value="translations">
                <div className="space-y-6">
                  {LOCALES.map((locale) => {
                    const t = translations[locale];
                    const filled = t.name.trim().length > 0;
                    return (
                      <div key={locale} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold uppercase text-gray-600 inline-flex items-center gap-2">
                            {locale}
                            <span className={clsx(
                              'text-[10px] px-1.5 py-0.5 rounded-full',
                              filled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                            )}>
                              {filled ? 'Rempli' : 'Manquant'}
                            </span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleSaveTranslation(locale)}
                            disabled={upsertTranslation.isPending}
                            className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Enregistrer {locale.toUpperCase()}
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className={labelClass}>Nom</label>
                            <input
                              value={t.name}
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
                              value={t.description}
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
                              {t.features.map((f, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="flex-1 text-sm bg-gray-50 px-2 py-1 rounded" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{f}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = t.features.filter((_, i) => i !== idx);
                                      setTranslations(prev => ({ ...prev, [locale]: { ...prev[locale], features: updated } }));
                                    }}
                                    className="text-red-400 hover:text-red-600"
                                    aria-label="Supprimer la fonctionnalité"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
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
                                  aria-label="Ajouter la fonctionnalité"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
