import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Globe,
  Building2,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { toast } from 'sonner';
import clsx from 'clsx';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';

// ─── Types ───────────────────────────────────────────────────────────

type ChangelogCategory = 'feature' | 'improvement' | 'fix' | 'breaking' | 'infra';

interface Changelog {
  id: string;
  organization_id?: string;
  title: string;
  description: string;
  version?: string;
  category: ChangelogCategory;
  published_at: string;
  is_global: boolean;
  created_at?: string;
  updated_at?: string;
}

const CATEGORY_CONFIG: Record<ChangelogCategory, { label: string; color: string }> = {
  feature: { label: 'Feature', color: 'bg-blue-100 text-blue-800' },
  improvement: { label: 'Improvement', color: 'bg-emerald-100 text-emerald-800' },
  fix: { label: 'Fix', color: 'bg-orange-100 text-orange-800' },
  breaking: { label: 'Breaking', color: 'bg-red-100 text-red-800' },
  infra: { label: 'Infra', color: 'bg-slate-100 text-slate-800' },
};

// ─── Schema ──────────────────────────────────────────────────────────

const changelogSchema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  version: z.string().optional(),
  category: z.enum(['feature', 'improvement', 'fix', 'breaking', 'infra']),
  published_at: z.string().optional(),
  is_global: z.boolean(),
});

type ChangelogFormData = z.infer<typeof changelogSchema>;

const defaultValues: ChangelogFormData = {
  title: '',
  description: '',
  version: '',
  category: 'feature',
  published_at: new Date().toISOString().slice(0, 16),
  is_global: false,
};

// ─── Component ───────────────────────────────────────────────────────

function ChangelogPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Changelog | null>(null);

  const { data: changelogs, isLoading } = useQuery({
    queryKey: ['admin', 'changelogs'],
    queryFn: () => apiRequest<{ data: Changelog[] }>('/api/v1/changelogs').then((r) => r.data),
  });

  const form = useForm<ChangelogFormData>({
    resolver: zodResolver(changelogSchema),
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: (data: ChangelogFormData) =>
      apiRequest<Changelog>('/api/v1/changelogs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
      toast.success('Changelog entry created');
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChangelogFormData> }) =>
      apiRequest<Changelog>(`/api/v1/changelogs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
      toast.success('Changelog entry updated');
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/api/v1/changelogs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
      toast.success('Changelog entry deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    form.reset(defaultValues);
  };

  const openCreate = () => {
    setEditing(null);
    form.reset(defaultValues);
    setDialogOpen(true);
  };

  const openEdit = (entry: Changelog) => {
    setEditing(entry);
    form.reset({
      title: entry.title,
      description: entry.description,
      version: entry.version ?? '',
      category: entry.category,
      published_at: entry.published_at?.slice(0, 16) ?? '',
      is_global: entry.is_global,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ChangelogFormData) => {
    const payload = {
      ...data,
      version: data.version || undefined,
      published_at: data.published_at || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <BookOpen className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Changelog</h1>
            <p className="text-sm text-gray-500">Product change history</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : !changelogs?.length ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-lg border-2 border-dashed border-gray-200">
          <BookOpen className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No changelog entries yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {changelogs.map((entry) => {
            const cat = CATEGORY_CONFIG[entry.category] ?? CATEGORY_CONFIG.feature;
            return (
              <div key={entry.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {entry.is_global ? (
                        <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                      <h3 className="font-semibold text-gray-900 truncate">{entry.title}</h3>
                      <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-medium', cat.color)}>
                        {cat.label}
                      </span>
                      {entry.version && (
                        <span className="rounded-full border px-2 py-0.5 text-[10px] font-mono text-gray-600">
                          v{entry.version}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-line">
                      {entry.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(entry.published_at)}
                      {entry.is_global ? ' · Global' : ' · Organization'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(entry)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(entry.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? 'Edit Entry' : 'Add Entry'}
            </Dialog.Title>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input {...form.register('title')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="New parcel analytics dashboard" />
                {form.formState.errors.title && <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea {...form.register('description')} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none" placeholder="Describe what changed..." />
                {form.formState.errors.description && <p className="text-xs text-red-500 mt-1">{form.formState.errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input {...form.register('version')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="2.1.0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <Controller control={form.control} name="category" render={({ field }) => (
                    <Select.Root value={field.value} onValueChange={field.onChange}>
                      <Select.Trigger className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="z-50 rounded-lg border border-gray-200 bg-white shadow-lg">
                          <Select.Viewport className="p-1">
                            {(['feature', 'improvement', 'fix', 'breaking', 'infra'] as const).map((c) => (
                              <Select.Item key={c} value={c} className="cursor-pointer rounded px-3 py-2 text-sm capitalize hover:bg-gray-100 outline-none data-[highlighted]:bg-gray-100">
                                <Select.ItemText>{c}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  )} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Published at</label>
                <input type="datetime-local" {...form.register('published_at')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
              </div>

              <div className="flex items-center gap-2">
                <Controller control={form.control} name="is_global" render={({ field }) => (
                  <Switch.Root checked={field.value} onCheckedChange={field.onChange} className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-emerald-600 transition-colors">
                    <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
                  </Switch.Root>
                )} />
                <span className="text-sm text-gray-700">Global (visible to all organizations)</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeDialog} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/changelog')({
  component: ChangelogPage,
});
