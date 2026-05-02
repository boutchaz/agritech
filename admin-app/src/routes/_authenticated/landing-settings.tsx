import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api-client';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  badge?: string;
}
interface LandingSettings {
  hero_stats: { value: string; label: string }[];
  partners: { name: string }[];
  testimonials: { featured: Testimonial; compact: Testimonial[] };
  updated_at: string;
}

const testimonialShape = {
  quote: z.string().min(1, 'Required').max(800),
  author: z.string().min(1, 'Required').max(120),
  role: z.string().min(1, 'Required').max(160),
};

const schema = z.object({
  hero_stats: z
    .array(
      z.object({
        value: z.string().min(1, 'Required').max(40),
        label: z.string().min(1, 'Required').max(80),
      }),
    )
    .max(8),
  partners: z.array(z.object({ name: z.string().min(1, 'Required').max(80) })).max(24),
  testimonials: z.object({
    featured: z.object({
      ...testimonialShape,
      badge: z.string().max(80).optional().or(z.literal('')),
    }),
    compact: z.array(z.object(testimonialShape)).max(8),
  }),
});
type FormData = z.infer<typeof schema>;

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none';

function LandingSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'landing-settings'],
    queryFn: () => apiRequest<LandingSettings>('/api/v1/admin/landing'),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      hero_stats: [],
      partners: [],
      testimonials: {
        featured: { quote: '', author: '', role: '', badge: '' },
        compact: [],
      },
    },
  });

  const stats = useFieldArray({ control: form.control, name: 'hero_stats' });
  const partners = useFieldArray({ control: form.control, name: 'partners' });
  const compact = useFieldArray({ control: form.control, name: 'testimonials.compact' });

  useEffect(() => {
    if (data)
      form.reset({
        hero_stats: data.hero_stats,
        partners: data.partners,
        testimonials: {
          featured: {
            quote: data.testimonials?.featured?.quote ?? '',
            author: data.testimonials?.featured?.author ?? '',
            role: data.testimonials?.featured?.role ?? '',
            badge: data.testimonials?.featured?.badge ?? '',
          },
          compact: data.testimonials?.compact ?? [],
        },
      });
  }, [data, form]);

  const updateMutation = useMutation({
    mutationFn: (payload: FormData) =>
      apiRequest<LandingSettings>('/api/v1/admin/landing', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-settings'] });
      toast.success('Landing settings updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (values: FormData) => updateMutation.mutate(values);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2">
          <Layers className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Landing Page</h1>
          <p className="text-sm text-gray-500">
            Hero stats and trusted-by partners shown on the public homepage.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 rounded-lg border border-gray-200 bg-white p-6"
        >
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Hero stats</h2>
                <p className="text-xs text-gray-500">Up to 8. Shown under "Conçu pour la réalité du terrain".</p>
              </div>
              <button
                type="button"
                onClick={() => stats.append({ value: '', label: '' })}
                disabled={stats.fields.length >= 8}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {stats.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                  <input
                    {...form.register(`hero_stats.${i}.value`)}
                    placeholder="12.4k"
                    className={inputCls}
                  />
                  <input
                    {...form.register(`hero_stats.${i}.label`)}
                    placeholder="Active farms"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => stats.remove(i)}
                    className="rounded-lg border border-gray-300 px-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {stats.fields.length === 0 && (
                <p className="text-xs text-gray-400 italic">No stats configured.</p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Trusted-by partners</h2>
                <p className="text-xs text-gray-500">Up to 24. Shown in the logo strip.</p>
              </div>
              <button
                type="button"
                onClick={() => partners.append({ name: '' })}
                disabled={partners.fields.length >= 24}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {partners.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    {...form.register(`partners.${i}.name`)}
                    placeholder="Partner name"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => partners.remove(i)}
                    className="rounded-lg border border-gray-300 px-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {partners.fields.length === 0 && (
                <p className="text-xs text-gray-400 italic">No partners configured.</p>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Featured testimonial</h2>
              <p className="text-xs text-gray-500">Shown as the large card in the testimonials section.</p>
            </div>
            <div className="space-y-2">
              <textarea
                {...form.register('testimonials.featured.quote')}
                rows={3}
                placeholder="Quote (without the « » — they're added automatically)"
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  {...form.register('testimonials.featured.author')}
                  placeholder="Author (e.g. Zakaria Boutchamir)"
                  className={inputCls}
                />
                <input
                  {...form.register('testimonials.featured.role')}
                  placeholder="Role (e.g. Ferme Mabella · 240 ha)"
                  className={inputCls}
                />
              </div>
              <input
                {...form.register('testimonials.featured.badge')}
                placeholder="Badge (e.g. ★★★★★ · Étude de cas)"
                className={inputCls}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Compact testimonials</h2>
                <p className="text-xs text-gray-500">Up to 8. Shown next to the featured one.</p>
              </div>
              <button
                type="button"
                onClick={() => compact.append({ quote: '', author: '', role: '' })}
                disabled={compact.fields.length >= 8}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <div className="space-y-3">
              {compact.fields.map((f, i) => (
                <div key={f.id} className="rounded-lg border border-gray-200 p-3 space-y-2 relative">
                  <button
                    type="button"
                    onClick={() => compact.remove(i)}
                    className="absolute top-2 right-2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <textarea
                    {...form.register(`testimonials.compact.${i}.quote`)}
                    rows={2}
                    placeholder="Quote"
                    className={inputCls}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      {...form.register(`testimonials.compact.${i}.author`)}
                      placeholder="Author"
                      className={inputCls}
                    />
                    <input
                      {...form.register(`testimonials.compact.${i}.role`)}
                      placeholder="Role"
                      className={inputCls}
                    />
                  </div>
                </div>
              ))}
              {compact.fields.length === 0 && (
                <p className="text-xs text-gray-400 italic">No compact testimonials configured.</p>
              )}
            </div>
          </section>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {data?.updated_at && `Last updated ${new Date(data.updated_at).toLocaleString()}`}
            </p>
            <button
              type="submit"
              disabled={updateMutation.isPending || !form.formState.isDirty}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/landing-settings')({
  component: LandingSettingsPage,
});
