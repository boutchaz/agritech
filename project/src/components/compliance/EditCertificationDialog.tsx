import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { DatePicker } from '@/components/ui/DatePicker';

import { useUpdateCertification } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import {
  CertificationType,
  CertificationStatus,
  type CertificationResponseDto
} from '@/lib/api/compliance';
import { format } from 'date-fns';

const formSchema = z.object({
  certification_type: z.nativeEnum(CertificationType),
  certification_number: z.string().min(1, "Le numéro de certification est requis"),
  issuing_body: z.string().min(1, "L'organisme certificateur est requis"),
  issued_date: z.string().min(1, "La date d'émission est requise"),
  expiry_date: z.string().min(1, "La date d'expiration est requise"),
  status: z.nativeEnum(CertificationStatus),
  scope: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditCertificationDialogProps {
  certification: CertificationResponseDto;
}

export function EditCertificationDialog({ certification }: EditCertificationDialogProps) {
  const [open, setOpen] = useState(false);
  const { currentOrganization } = useAuth();
  const updateCertification = useUpdateCertification();
  const { t } = useTranslation('compliance');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      certification_type: certification.certification_type,
      certification_number: certification.certification_number,
      issuing_body: certification.issuing_body,
      issued_date: format(new Date(certification.issued_date), 'yyyy-MM-dd'),
      expiry_date: format(new Date(certification.expiry_date), 'yyyy-MM-dd'),
      status: certification.status,
      scope: certification.scope || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        certification_type: certification.certification_type,
        certification_number: certification.certification_number,
        issuing_body: certification.issuing_body,
        issued_date: format(new Date(certification.issued_date), 'yyyy-MM-dd'),
        expiry_date: format(new Date(certification.expiry_date), 'yyyy-MM-dd'),
        status: certification.status,
        scope: certification.scope || '',
      });
    }
  }, [open, certification, form]);

  function onSubmit(values: FormValues) {
    if (!currentOrganization) return;

    updateCertification.mutate(
      {
        organizationId: currentOrganization.id,
        certificationId: certification.id,
        data: {
          ...values,
          issued_date: new Date(values.issued_date).toISOString(),
          expiry_date: new Date(values.expiry_date).toISOString(),
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Edit className="mr-2 h-4 w-4" />
          {t('dialogs.editCertification.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('dialogs.editCertification.title')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.editCertification.description')}
          </DialogDescription>
        </DialogHeader>

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
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('dialogs.createCertification.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CertificationType).map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
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
                <Input placeholder={t('dialogs.createCertification.certNumberPlaceholder')} {...field} />
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
                <Select onValueChange={field.onChange} value={field.value}>
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

          <Controller
            control={form.control}
            name="scope"
            render={({ field }) => (
              <FormField
                label={t('dialogs.editCertification.scope')}
                error={form.formState.errors.scope?.message}
              >
                <Textarea
                  placeholder={t('dialogs.editCertification.scopePlaceholder')}
                  {...field}
                  rows={3}
                />
              </FormField>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('dialogs.editCertification.cancel')}
            </Button>
            <Button type="submit" disabled={updateCertification.isPending}>
              {updateCertification.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('dialogs.editCertification.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
