import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus } from 'lucide-react';
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

import { useCreateCorrectiveAction } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { CorrectiveActionPriority } from '@/lib/api/compliance';

const formSchema = z.object({
  finding_description: z.string().min(1, 'Le constat est requis'),
  requirement_code: z.string().optional(),
  priority: z.nativeEnum(CorrectiveActionPriority),
  action_description: z.string().min(1, "L'action corrective est requise"),
  responsible_person: z.string().min(1, 'Le responsable est requis'),
  due_date: z.string().min(1, 'La date limite est requise'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateCorrectiveActionDialogProps {
  certificationId: string;
  complianceCheckId?: string;
  defaultFinding?: string;
  defaultRequirementCode?: string;
}

export function CreateCorrectiveActionDialog({
  certificationId,
  complianceCheckId = undefined,
  defaultFinding,
  defaultRequirementCode,
}: CreateCorrectiveActionDialogProps) {
  const [open, setOpen] = useState(false);
  const { currentOrganization } = useAuth();
  const createAction = useCreateCorrectiveAction();
  const { t } = useTranslation('compliance');

  const priorityLabels: Record<CorrectiveActionPriority, string> = {
    [CorrectiveActionPriority.CRITICAL]: t('priority.critical'),
    [CorrectiveActionPriority.HIGH]: t('priority.high'),
    [CorrectiveActionPriority.MEDIUM]: t('priority.medium'),
    [CorrectiveActionPriority.LOW]: t('priority.low'),
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      finding_description: defaultFinding || '',
      requirement_code: defaultRequirementCode || '',
      priority: CorrectiveActionPriority.MEDIUM,
      action_description: '',
      responsible_person: '',
      due_date: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        finding_description: defaultFinding || '',
        requirement_code: defaultRequirementCode || '',
        priority: CorrectiveActionPriority.MEDIUM,
        action_description: '',
        responsible_person: '',
        due_date: '',
        notes: '',
      });
    }
  }, [open, form, defaultFinding, defaultRequirementCode]);

  function onSubmit(values: FormValues) {
    if (!currentOrganization) return;

    createAction.mutate(
      {
        organizationId: currentOrganization.id,
        data: {
          certification_id: certificationId,
          ...(complianceCheckId ? { compliance_check_id: complianceCheckId } : {}),
          finding_description: values.finding_description,
          requirement_code: values.requirement_code || undefined,
          priority: values.priority,
          action_description: values.action_description,
          responsible_person: values.responsible_person,
          due_date: new Date(values.due_date).toISOString(),
          notes: values.notes || undefined,
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('dialogs.createAction.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{t('dialogs.createAction.title')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.createAction.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="finding_description"
            render={({ field }) => (
              <FormField
                label={t('dialogs.createAction.finding')}
                error={form.formState.errors.finding_description?.message}
                required
              >
                <Textarea
                  placeholder={t('dialogs.createAction.findingPlaceholder')}
                  rows={2}
                  {...field}
                />
              </FormField>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="requirement_code"
              render={({ field }) => (
                <FormField
                  label={t('dialogs.createAction.requirementCode')}
                  error={form.formState.errors.requirement_code?.message}
                >
                  <Input placeholder={t('dialogs.createAction.requirementCodePlaceholder')} {...field} />
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormField
                  label={t('dialogs.createAction.priority')}
                  error={form.formState.errors.priority?.message}
                  required
                >
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('dialogs.createAction.selectPriority')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="action_description"
            render={({ field }) => (
              <FormField
                label={t('dialogs.createAction.action')}
                error={form.formState.errors.action_description?.message}
                required
              >
                <Textarea
                  placeholder={t('dialogs.createAction.actionPlaceholder')}
                  rows={2}
                  {...field}
                />
              </FormField>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="responsible_person"
              render={({ field }) => (
                <FormField
                  label={t('dialogs.createAction.responsible')}
                  error={form.formState.errors.responsible_person?.message}
                  required
                >
                  <Input placeholder={t('dialogs.createAction.responsiblePlaceholder')} {...field} />
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormField
                  label={t('dialogs.createAction.dueDate')}
                  error={form.formState.errors.due_date?.message}
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
            name="notes"
            render={({ field }) => (
              <FormField
                label={t('dialogs.createAction.notes')}
                error={form.formState.errors.notes?.message}
              >
                <Textarea
                  placeholder={t('dialogs.createAction.notesPlaceholder')}
                  rows={2}
                  {...field}
                />
              </FormField>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('dialogs.createAction.cancel')}
            </Button>
            <Button type="submit" disabled={createAction.isPending}>
              {createAction.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('dialogs.createAction.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
