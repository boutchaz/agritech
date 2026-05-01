import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { toast } from 'sonner';
import clsx from 'clsx';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';

// ─── Types ───────────────────────────────────────────────────────────

type BannerSeverity = 'info' | 'success' | 'warning' | 'critical';
type BannerAudience = 'all' | 'admins' | 'managers' | 'growers';

interface Banner {
  id: string;
  organization_id: string;
  title: string;
  message: string;
  severity: BannerSeverity;
  audience: BannerAudience;
  enabled: boolean;
  dismissible: boolean;
  cta_label?: string;
  cta_url?: string;
  priority: number;
  start_at?: string;
  end_at?: string;
  impressions: number;
  dismissals: number;
  created_at?: string;
  updated_at?: string;
}

// ─── Schema ──────────────────────────────────────────────────────────

const bannerSchema = z.object({
  title: z.string().min(1, 'Required'),
  message: z.string().min(1, 'Required'),
  severity: z.enum(['info', 'success', 'warning', 'critical']),
  audience: z.enum(['all', 'admins', 'managers', 'growers']),
  enabled: z.boolean(),
  dismissible: z.boolean(),
  cta_label: z.string().optional(),
  cta_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  priority: z.number().min(0).max(100),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
});

type BannerFormData = z.infer<typeof bannerSchema>;

const defaultValues: BannerFormData = {
  title: '',
  message: '',
  severity: 'info',
  audience: 'all',
  enabled: true,
  dismissible: true,
  cta_label: '',
  cta_url: '',
  priority: 0,
  start_at: '',
  end_at: '',
};

// ─── Constants ───────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<BannerSeverity, string> = {
  info: 'bg-blue-100 text-blue-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

// ─── Component ───────────────────────────────────────────────────────

function BannersPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);

  const { data: banners, isLoading } = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: async () => {
      const res = await apiRequest<{ data: Banner[] }>('/api/v1/admin/banners');
      return res.data;
    },
  });

  const form = useForm<BannerFormData>({
    resolver: zodResolver(bannerSchema),
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: (data: BannerFormData) =>
      apiRequest<Banner>('/api/v1/admin/banners', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success('Banner created');
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BannerFormData> }) =>
      apiRequest<Banner>(`/api/v1/admin/banners/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success('Banner updated');
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/api/v1/admin/banners/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success('Banner deleted');
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

  const openEdit = (banner: Banner) => {
    setEditing(banner);
    form.reset({
      title: banner.title,
      message: banner.message,
      severity: banner.severity,
      audience: banner.audience,
      enabled: banner.enabled,
      dismissible: banner.dismissible,
      cta_label: banner.cta_label ?? '',
      cta_url: banner.cta_url ?? '',
      priority: banner.priority,
      start_at: banner.start_at?.slice(0, 16) ?? '',
      end_at: banner.end_at?.slice(0, 16) ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: BannerFormData) => {
    const payload = {
      ...data,
      cta_label: data.cta_label || undefined,
      cta_url: data.cta_url || undefined,
      start_at: data.start_at || undefined,
      end_at: data.end_at || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleEnabled = (banner: Banner) => {
    updateMutation.mutate({ id: banner.id, data: { enabled: !banner.enabled } });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Megaphone className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Banners</h1>
            <p className="text-sm text-gray-500">In-app announcements for organizations</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Banner
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : !banners?.length ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-lg border-2 border-dashed border-gray-200">
          <Megaphone className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No banners yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div key={banner.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900 truncate">{banner.title}</h3>
                    <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-medium', SEVERITY_COLORS[banner.severity])}>
                      {banner.severity}
                    </span>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      {banner.audience}
                    </span>
                    {!banner.enabled && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{banner.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Priority: {banner.priority}</span>
                    <span>Starts: {formatDate(banner.start_at)}</span>
                    {banner.end_at && <span>Ends: {formatDate(banner.end_at)}</span>}
                    <span>{banner.impressions} views</span>
                    <span>{banner.dismissals} dismissed</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleEnabled(banner)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title={banner.enabled ? 'Disable' : 'Enable'}>
                    {banner.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => openEdit(banner)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(banner.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? 'Edit Banner' : 'Add Banner'}
            </Dialog.Title>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input {...form.register('title')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Maintenance scheduled" />
                {form.formState.errors.title && <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea {...form.register('message')} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none" placeholder="Describe the announcement..." />
                {form.formState.errors.message && <p className="text-xs text-red-500 mt-1">{form.formState.errors.message.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <Controller control={form.control} name="severity" render={({ field }) => (
                    <Select.Root value={field.value} onValueChange={field.onChange}>
                      <Select.Trigger className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="z-50 rounded-lg border border-gray-200 bg-white shadow-lg">
                          <Select.Viewport className="p-1">
                            {(['info', 'success', 'warning', 'critical'] as const).map((s) => (
                              <Select.Item key={s} value={s} className="cursor-pointer rounded px-3 py-2 text-sm capitalize hover:bg-gray-100 outline-none data-[highlighted]:bg-gray-100">
                                <Select.ItemText>{s}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  )} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                  <Controller control={form.control} name="audience" render={({ field }) => (
                    <Select.Root value={field.value} onValueChange={field.onChange}>
                      <Select.Trigger className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="z-50 rounded-lg border border-gray-200 bg-white shadow-lg">
                          <Select.Viewport className="p-1">
                            {(['all', 'admins', 'managers', 'growers'] as const).map((a) => (
                              <Select.Item key={a} value={a} className="cursor-pointer rounded px-3 py-2 text-sm capitalize hover:bg-gray-100 outline-none data-[highlighted]:bg-gray-100">
                                <Select.ItemText>{a}</Select.ItemText>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority (0-100)</label>
                <input type="number" min={0} max={100} {...form.register('priority', { valueAsNumber: true })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start at</label>
                  <input type="datetime-local" {...form.register('start_at')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End at</label>
                  <input type="datetime-local" {...form.register('end_at')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA Label</label>
                  <input {...form.register('cta_label')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Learn more" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA URL</label>
                  <input {...form.register('cta_url')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="https://..." />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Controller control={form.control} name="enabled" render={({ field }) => (
                    <Switch.Root checked={field.value} onCheckedChange={field.onChange} className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-emerald-600 transition-colors">
                      <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
                    </Switch.Root>
                  )} />
                  <span className="text-sm text-gray-700">Enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Controller control={form.control} name="dismissible" render={({ field }) => (
                    <Switch.Root checked={field.value} onCheckedChange={field.onChange} className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-emerald-600 transition-colors">
                      <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
                    </Switch.Root>
                  )} />
                  <span className="text-sm text-gray-700">Dismissible</span>
                </div>
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

export const Route = createFileRoute('/_authenticated/banners')({
  component: BannersPage,
});
