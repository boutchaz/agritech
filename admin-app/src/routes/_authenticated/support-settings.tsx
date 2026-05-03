import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LifeBuoy } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api-client';

interface SupportSettings {
  email: string;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  hours: string | null;
  contact_email: string;
  updated_at: string;
}

const schema = z.object({
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Required'),
  whatsapp: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  hours: z.string().optional().nullable(),
  contact_email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

function SupportSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'support-settings'],
    queryFn: () => apiRequest<SupportSettings>('/api/v1/admin/support'),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      hours: '',
      contact_email: '',
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp ?? '',
        address: data.address ?? '',
        hours: data.hours ?? '',
        contact_email: data.contact_email,
      });
    }
  }, [data, form]);

  const updateMutation = useMutation({
    mutationFn: (payload: FormData) =>
      apiRequest<SupportSettings>('/api/v1/admin/support', {
        method: 'PATCH',
        body: JSON.stringify({
          ...payload,
          whatsapp: payload.whatsapp || null,
          address: payload.address || null,
          hours: payload.hours || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'support-settings'] });
      toast.success('Support info updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (values: FormData) => updateMutation.mutate(values);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2">
          <LifeBuoy className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Support Info</h1>
          <p className="text-sm text-gray-500">
            Public contact details shown across the app (legal pages, pending approval, billing).
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Support Email" error={form.formState.errors.email?.message}>
              <input {...form.register('email')} className={inputCls} placeholder="support@agrogina.com" />
            </Field>
            <Field label="Contact Email" error={form.formState.errors.contact_email?.message}>
              <input {...form.register('contact_email')} className={inputCls} placeholder="contact@agrogina.com" />
            </Field>
            <Field label="Phone" error={form.formState.errors.phone?.message}>
              <input {...form.register('phone')} className={inputCls} placeholder="+212 600 000 000" />
            </Field>
            <Field label="WhatsApp">
              <input {...form.register('whatsapp')} className={inputCls} placeholder="+212 600 000 001" />
            </Field>
          </div>
          <Field label="Hours">
            <input {...form.register('hours')} className={inputCls} placeholder="Lun-Ven 9h-18h" />
          </Field>
          <Field label="Address">
            <textarea {...form.register('address')} rows={2} className={inputCls} placeholder="123 rue Mohammed V, Casablanca" />
          </Field>

          <div className="flex items-center justify-between pt-2">
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

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/support-settings')({
  component: SupportSettingsPage,
});
