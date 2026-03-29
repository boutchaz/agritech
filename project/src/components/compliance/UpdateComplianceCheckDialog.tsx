import { useState, useEffect, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Pencil } from 'lucide-react';
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

import { useUpdateComplianceCheck } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import {
  ComplianceCheckStatus,
  type ComplianceCheckResponseDto,
} from '@/lib/api/compliance';

const formSchema = z.object({
  status: z.nativeEnum(ComplianceCheckStatus),
  auditor_name: z.string().optional(),
  score: z.string().optional(),
  next_check_date: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UpdateComplianceCheckDialogProps {
  check: ComplianceCheckResponseDto;
  trigger?: ReactNode;
}

export function UpdateComplianceCheckDialog({
  check,
  trigger,
}: UpdateComplianceCheckDialogProps) {
  const [open, setOpen] = useState(false);
  const { currentOrganization } = useAuth();
  const updateCheck = useUpdateComplianceCheck();
  const { t } = useTranslation('compliance');

  const statusLabels: Record<ComplianceCheckStatus, string> = {
    [ComplianceCheckStatus.COMPLIANT]: t('status.compliant'),
    [ComplianceCheckStatus.NON_COMPLIANT]: t('status.nonCompliant'),
    [ComplianceCheckStatus.NEEDS_REVIEW]: t('status.needsReview'),
    [ComplianceCheckStatus.IN_PROGRESS]: t('status.inProgress'),
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: check.status,
      auditor_name: check.auditor_name || '',
      score: check.score != null ? String(check.score) : '',
      next_check_date: check.next_check_date
        ? check.next_check_date.split('T')[0]
        : '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        status: check.status,
        auditor_name: check.auditor_name || '',
        score: check.score != null ? String(check.score) : '',
        next_check_date: check.next_check_date
          ? check.next_check_date.split('T')[0]
          : '',
      });
    }
  }, [open, check, form]);

  function onSubmit(values: FormValues) {
    if (!currentOrganization) return;

    updateCheck.mutate(
      {
        organizationId: currentOrganization.id,
        checkId: check.id,
        data: {
          status: values.status,
          auditor_name: values.auditor_name || undefined,
          score: values.score ? parseInt(values.score, 10) : undefined,
          next_check_date: values.next_check_date
            ? new Date(values.next_check_date).toISOString()
            : undefined,
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
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            {t('dialogs.updateCheck.button')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t('dialogs.updateCheck.title')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.updateCheck.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormField
                  label={t('dialogs.createCheck.result')}
                  error={form.formState.errors.status?.message}
                  required
                >
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('table.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="score"
              render={({ field }) => (
                <FormField
                  label={t('dialogs.createCheck.score')}
                  error={form.formState.errors.score?.message}
                >
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0–100"
                    {...field}
                  />
                </FormField>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="auditor_name"
            render={({ field }) => (
              <FormField
                label={t('dialogs.createCheck.auditor')}
                error={form.formState.errors.auditor_name?.message}
              >
                <Input
                  placeholder={t('dialogs.createCheck.auditorPlaceholder')}
                  {...field}
                />
              </FormField>
            )}
          />

          <Controller
            control={form.control}
            name="next_check_date"
            render={({ field }) => (
              <FormField
                label={t('dialogs.createCheck.nextCheckDate')}
                error={form.formState.errors.next_check_date?.message}
              >
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('dialogs.createCheck.selectDateOptional')}
                />
              </FormField>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('dialogs.createCheck.cancel')}
            </Button>
            <Button type="submit" disabled={updateCheck.isPending}>
              {updateCheck.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('dialogs.updateCheck.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
