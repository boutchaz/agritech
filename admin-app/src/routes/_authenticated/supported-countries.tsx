import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { toast } from 'sonner';
import clsx from 'clsx';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';

// ─── Types ───────────────────────────────────────────────────────────

interface SupportedCountry {
  id: string;
  country_code: string;
  country_name: string;
  region: string;
  enabled: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const REGIONS = [
  'Africa',
  'Europe',
  'North America',
  'South America',
  'Oceania',
  'Central Asia',
  'Middle East',
  'East Asia',
  'South Asia',
  'Southeast Asia',
] as const;

// ─── Schema ──────────────────────────────────────────────────────────

const countrySchema = z.object({
  country_code: z.string().min(2, 'Required').max(3, 'Max 3 chars').transform((v) => v.toUpperCase()),
  country_name: z.string().min(1, 'Required'),
  region: z.string().min(1, 'Required'),
  enabled: z.boolean(),
  display_order: z.number().min(0),
});

type CountryFormData = z.infer<typeof countrySchema>;

const defaultValues: CountryFormData = {
  country_code: '',
  country_name: '',
  region: '',
  enabled: true,
  display_order: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────

function getFlagEmoji(code: string): string {
  const codePoints = code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

// ─── Component ───────────────────────────────────────────────────────

function SupportedCountriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupportedCountry | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set(REGIONS));

  const { data: countries, isLoading } = useQuery({
    queryKey: ['admin', 'supported-countries'],
    queryFn: () => apiRequest<SupportedCountry[]>('/api/v1/admin/supported-countries'),
  });

  const form = useForm<CountryFormData>({
    resolver: zodResolver(countrySchema),
    defaultValues,
  });

  const grouped = useMemo(() => {
    if (!countries) return {};
    return countries.reduce<Record<string, SupportedCountry[]>>((acc, c) => {
      (acc[c.region] ??= []).push(c);
      return acc;
    }, {});
  }, [countries]);

  const createMutation = useMutation({
    mutationFn: (data: CountryFormData) =>
      apiRequest<SupportedCountry>('/api/v1/admin/supported-countries', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'supported-countries'] });
      toast.success('Country added');
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CountryFormData> }) =>
      apiRequest<SupportedCountry>(`/api/v1/admin/supported-countries/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'supported-countries'] });
      toast.success('Country updated');
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/api/v1/admin/supported-countries/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'supported-countries'] });
      toast.success('Country removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest<SupportedCountry>(`/api/v1/admin/supported-countries/${id}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'supported-countries'] });
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

  const openEdit = (country: SupportedCountry) => {
    setEditing(country);
    form.reset({
      country_code: country.country_code,
      country_name: country.country_name,
      region: country.region,
      enabled: country.enabled,
      display_order: country.display_order,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: CountryFormData) => {
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        data: { country_name: data.country_name, region: data.region, enabled: data.enabled, display_order: data.display_order },
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region); else next.add(region);
      return next;
    });
  };

  const totalEnabled = countries?.filter((c) => c.enabled).length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Globe className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Supported Countries</h1>
            <p className="text-sm text-gray-500">
              Manage countries where the platform is available
              {!isLoading && countries && (
                <span className="ml-2 text-gray-400">({totalEnabled}/{countries.length} enabled)</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Country
        </button>
      </div>

      {/* List grouped by region */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : !countries?.length ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-lg border-2 border-dashed border-gray-200">
          <Globe className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No supported countries configured yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([region, regionCountries]) => (
              <div key={region} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleRegion(region)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{region}</h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {regionCountries.filter((c) => c.enabled).length}/{regionCountries.length}
                    </span>
                  </div>
                  <ChevronDown className={clsx('h-4 w-4 text-gray-400 transition-transform', !expandedRegions.has(region) && '-rotate-90')} />
                </button>
                {expandedRegions.has(region) && (
                  <div className="border-t border-gray-100">
                    {regionCountries.map((country) => (
                      <div key={country.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getFlagEmoji(country.country_code)}</span>
                          <span className="text-sm font-medium text-gray-900">{country.country_name}</span>
                          <span className="text-xs text-gray-400 font-mono">{country.country_code}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch.Root
                            checked={country.enabled}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: country.id, enabled: checked })}
                            className="h-5 w-9 rounded-full bg-gray-200 data-[state=checked]:bg-emerald-600 transition-colors"
                          >
                            <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
                          </Switch.Root>
                          <button onClick={() => openEdit(country)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => { if (confirm(`Remove ${country.country_name}?`)) deleteMutation.mutate(country.id); }} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? 'Edit Country' : 'Add Country'}
            </Dialog.Title>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country Code (ISO)</label>
                  <input {...form.register('country_code')} maxLength={3} disabled={!!editing} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:bg-gray-50 disabled:text-gray-400" placeholder="MA" />
                  {form.formState.errors.country_code && <p className="text-xs text-red-500 mt-1">{form.formState.errors.country_code.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country Name</label>
                  <input {...form.register('country_name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Morocco" />
                  {form.formState.errors.country_name && <p className="text-xs text-red-500 mt-1">{form.formState.errors.country_name.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <Controller control={form.control} name="region" render={({ field }) => (
                    <Select.Root value={field.value} onValueChange={field.onChange}>
                      <Select.Trigger className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <Select.Value placeholder="Select region" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="z-50 rounded-lg border border-gray-200 bg-white shadow-lg">
                          <Select.Viewport className="p-1">
                            {REGIONS.map((r) => (
                              <Select.Item key={r} value={r} className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-gray-100 outline-none data-[highlighted]:bg-gray-100">
                                <Select.ItemText>{r}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  )} />
                  {form.formState.errors.region && <p className="text-xs text-red-500 mt-1">{form.formState.errors.region.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input type="number" {...form.register('display_order', { valueAsNumber: true })} min={0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Controller control={form.control} name="enabled" render={({ field }) => (
                  <Switch.Root checked={field.value} onCheckedChange={field.onChange} className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-emerald-600 transition-colors">
                    <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
                  </Switch.Root>
                )} />
                <span className="text-sm text-gray-700">Enabled</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeDialog} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/supported-countries')({
  component: SupportedCountriesPage,
});
