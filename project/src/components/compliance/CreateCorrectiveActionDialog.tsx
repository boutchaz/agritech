import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus } from 'lucide-react';

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

const priorityLabels: Record<CorrectiveActionPriority, string> = {
  [CorrectiveActionPriority.CRITICAL]: 'Critique',
  [CorrectiveActionPriority.HIGH]: 'Haute',
  [CorrectiveActionPriority.MEDIUM]: 'Moyenne',
  [CorrectiveActionPriority.LOW]: 'Basse',
};

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
  complianceCheckId: string;
  defaultFinding?: string;
  defaultRequirementCode?: string;
}

export function CreateCorrectiveActionDialog({
  certificationId,
  complianceCheckId,
  defaultFinding,
  defaultRequirementCode,
}: CreateCorrectiveActionDialogProps) {
  const [open, setOpen] = useState(false);
  const { currentOrganization } = useAuth();
  const createAction = useCreateCorrectiveAction();

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
          compliance_check_id: complianceCheckId,
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
          Nouvelle action corrective
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Créer une action corrective</DialogTitle>
          <DialogDescription>
            Définissez une action corrective suite à un constat de non-conformité.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="finding_description"
            render={({ field }) => (
              <FormField
                label="Constat / Non-conformité"
                error={form.formState.errors.finding_description?.message}
                required
              >
                <Textarea
                  placeholder="Décrivez le constat ou la non-conformité identifiée..."
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
                  label="Code exigence"
                  error={form.formState.errors.requirement_code?.message}
                >
                  <Input placeholder="ex: CB 5.2.1" {...field} />
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormField
                  label="Priorité"
                  error={form.formState.errors.priority?.message}
                  required
                >
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
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
                label="Action corrective"
                error={form.formState.errors.action_description?.message}
                required
              >
                <Textarea
                  placeholder="Décrivez l'action à entreprendre pour corriger la non-conformité..."
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
                  label="Responsable"
                  error={form.formState.errors.responsible_person?.message}
                  required
                >
                  <Input placeholder="Nom du responsable" {...field} />
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormField
                  label="Date limite"
                  error={form.formState.errors.due_date?.message}
                  required
                >
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Choisir date"
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
                label="Notes"
                error={form.formState.errors.notes?.message}
              >
                <Textarea
                  placeholder="Notes ou commentaires additionnels (optionnel)..."
                  rows={2}
                  {...field}
                />
              </FormField>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createAction.isPending}>
              {createAction.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Créer l&apos;action
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
