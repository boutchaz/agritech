import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { DatePicker } from '@/components/ui/DatePicker';

import { useCreateCertification } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { CertificationType, CertificationStatus } from '@/lib/api/compliance';

function generateCertificationNumber(type?: CertificationType): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = type ? type.substring(0, 3).toUpperCase() : 'CERT';
  return `${prefix}-${year}-${random}`;
}

const formSchema = z.object({
  certification_type: z.nativeEnum(CertificationType),
  certification_number: z.string().min(1, "Le numéro de certification est requis"),
  issuing_body: z.string().min(1, "L'organisme certificateur est requis"),
  issued_date: z.string().min(1, "La date d'émission est requise"),
  expiry_date: z.string().min(1, "La date d'expiration est requise"),
  status: z.nativeEnum(CertificationStatus),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateCertificationDialog() {
  const { t } = useTranslation('compliance');
  const [open, setOpen] = useState(false);
  const { currentOrganization } = useAuth();
  const createCertification = useCreateCertification();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      certification_number: generateCertificationNumber(),
      status: CertificationStatus.ACTIVE,
    },
  });

  const selectedType = form.watch('certification_type');

  useEffect(() => {
    if (selectedType && !form.getValues('certification_number')?.includes(selectedType.substring(0, 3).toUpperCase())) {
      form.setValue('certification_number', generateCertificationNumber(selectedType));
    }
  }, [selectedType, form]);

  useEffect(() => {
    if (open) {
      form.reset({
        certification_number: generateCertificationNumber(),
        status: CertificationStatus.ACTIVE,
      });
    }
  }, [open, form]);

  function onSubmit(values: FormValues) {
    if (!currentOrganization) return;

    createCertification.mutate(
      {
        organizationId: currentOrganization.id,
        data: {
          ...values,
          // Dates are already strings YYYY-MM-DD from DatePicker, but API might expect ISO
          // The DTO says string, usually ISO. Let's ensure it's ISO or just pass as is if API accepts YYYY-MM-DD
          // Looking at DTO, it just says string. I'll assume ISO 8601 is safer.
          issued_date: new Date(values.issued_date).toISOString(),
          expiry_date: new Date(values.expiry_date).toISOString(),
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
        },
      }
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {t('dialogs.createCertification.button')}
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t('dialogs.createCertification.title')}
        description={t('dialogs.createCertification.description')}
        size="sm"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="certification_type"
            render={({ field }) => (
              <FormField 
                label={t('dialogs.createCertification.certType')} 
                error={form.formState.errors.certification_type?.message}
                required
              >
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('dialogs.createCertification.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CertificationType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />

          <Controller
            control={form.control}
            name="certification_number"
            render={({ field }) => (
              <FormField 
                label={t('dialogs.createCertification.certNumber')} 
                error={form.formState.errors.certification_number?.message}
                required
              >
                <div className="flex gap-2">
                  <Input placeholder={t('dialogs.createCertification.certNumberPlaceholder')} {...field} className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => form.setValue('certification_number', generateCertificationNumber(selectedType))}
                    title={t('dialogs.createCertification.generateNumber')}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </FormField>
            )}
          />

          <Controller
            control={form.control}
            name="issuing_body"
            render={({ field }) => (
              <FormField 
                label={t('dialogs.createCertification.issuingBody')} 
                error={form.formState.errors.issuing_body?.message}
                required
              >
                <Input placeholder={t('dialogs.createCertification.issuingBodyPlaceholder')} {...field} />
              </FormField>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="issued_date"
              render={({ field }) => (
                <FormField
                  label={t('dialogs.createCertification.issuedDate')}
                  error={form.formState.errors.issued_date?.message}
                  required
                >
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t('dialogs.createCertification.selectDate')}
                  />
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormField
                  label={t('dialogs.createCertification.expiryDate')}
                  error={form.formState.errors.expiry_date?.message}
                  required
                >
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t('dialogs.createCertification.selectDate')}
                  />
                </FormField>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormField 
                label={t('dialogs.createCertification.status')} 
                error={form.formState.errors.status?.message}
                required
              >
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('dialogs.createCertification.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CertificationStatus.ACTIVE}>{t('status.active')}</SelectItem>
                    <SelectItem value={CertificationStatus.PENDING_RENEWAL}>{t('status.pendingRenewal')}</SelectItem>
                    <SelectItem value={CertificationStatus.EXPIRED}>{t('status.expired')}</SelectItem>
                    <SelectItem value={CertificationStatus.SUSPENDED}>{t('status.suspended')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('dialogs.createCertification.cancel')}
            </Button>
            <Button type="submit" disabled={createCertification.isPending}>
              {createCertification.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('dialogs.createCertification.create')}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </>
  );
}
