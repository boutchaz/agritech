import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, CalendarClock } from 'lucide-react';
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
import { type CertificationResponseDto } from '@/lib/api/compliance';
import { format } from 'date-fns';

const formSchema = z.object({
  next_audit_date: z.string().min(1, "La date du prochain audit est requise"),
  audit_frequency: z.string().optional(),
  auditor_name: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ScheduleAuditDialogProps {
  certification: CertificationResponseDto;
}

export function ScheduleAuditDialog({ certification }: ScheduleAuditDialogProps) {
  const [open, setOpen] = useState(false);
  const { currentOrganization } = useAuth();
  const updateCertification = useUpdateCertification();
  const { t } = useTranslation('compliance');

  const auditFrequencies = [
    { value: 'annual', label: t('auditFrequency.annual') },
    { value: 'semi-annual', label: t('auditFrequency.semi-annual') },
    { value: 'quarterly', label: t('auditFrequency.quarterly') },
    { value: 'monthly', label: t('auditFrequency.monthly') },
    { value: 'custom', label: t('auditFrequency.custom') },
  ];

  const existingSchedule = certification.audit_schedule;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      next_audit_date: existingSchedule?.next_audit_date
        ? format(new Date(existingSchedule.next_audit_date), 'yyyy-MM-dd')
        : '',
      audit_frequency: existingSchedule?.audit_frequency || '',
      auditor_name: existingSchedule?.auditor_name || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        next_audit_date: existingSchedule?.next_audit_date
          ? format(new Date(existingSchedule.next_audit_date), 'yyyy-MM-dd')
          : '',
        audit_frequency: existingSchedule?.audit_frequency || '',
        auditor_name: existingSchedule?.auditor_name || '',
      });
    }
  }, [open, existingSchedule, form]);

  function onSubmit(values: FormValues) {
    if (!currentOrganization) return;

    updateCertification.mutate(
      {
        organizationId: currentOrganization.id,
        certificationId: certification.id,
        data: {
          audit_schedule: {
            next_audit_date: new Date(values.next_audit_date).toISOString(),
            audit_frequency: values.audit_frequency || undefined,
            auditor_name: values.auditor_name || undefined,
          },
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
        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-none">
          <CalendarClock className="mr-2 h-4 w-4" />
          {t('dialogs.scheduleAudit.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            {t('dialogs.scheduleAudit.title')}
          </DialogTitle>
          <DialogDescription>
            {t('dialogs.scheduleAudit.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="next_audit_date"
            render={({ field }) => (
              <FormField
                label={t('dialogs.scheduleAudit.nextAuditDate')}
                error={form.formState.errors.next_audit_date?.message}
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
            name="audit_frequency"
            render={({ field }) => (
              <FormField
                label={t('dialogs.scheduleAudit.auditFrequency')}
                error={form.formState.errors.audit_frequency?.message}
              >
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('dialogs.scheduleAudit.selectFrequency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {auditFrequencies.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />

          <Controller
            control={form.control}
            name="auditor_name"
            render={({ field }) => (
              <FormField
                label={t('dialogs.scheduleAudit.plannedAuditor')}
                error={form.formState.errors.auditor_name?.message}
              >
                <Input placeholder={t('dialogs.scheduleAudit.auditorPlaceholder')} {...field} />
              </FormField>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('dialogs.scheduleAudit.cancel')}
            </Button>
            <Button type="submit" disabled={updateCertification.isPending}>
              {updateCertification.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('dialogs.scheduleAudit.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
