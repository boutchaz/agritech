import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, RefreshCw } from 'lucide-react';

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

import { useUpdateCorrectiveAction } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import {
  CorrectiveActionStatus,
  type CorrectiveActionPlanResponseDto,
} from '@/lib/api/compliance';

const statusLabels: Record<CorrectiveActionStatus, string> = {
  [CorrectiveActionStatus.OPEN]: 'Ouverte',
  [CorrectiveActionStatus.IN_PROGRESS]: 'En cours',
  [CorrectiveActionStatus.RESOLVED]: 'Résolue',
  [CorrectiveActionStatus.VERIFIED]: 'Vérifiée',
  [CorrectiveActionStatus.OVERDUE]: 'En retard',
};

const formSchema = z.object({
  status: z.nativeEnum(CorrectiveActionStatus),
  resolution_notes: z.string().optional(),
  verified_by: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UpdateActionStatusDialogProps {
  action: CorrectiveActionPlanResponseDto;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UpdateActionStatusDialog({
  action,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: UpdateActionStatusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const { currentOrganization } = useAuth();
  const updateAction = useUpdateCorrectiveAction();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: action.status,
      resolution_notes: action.resolution_notes || '',
      verified_by: action.verified_by || '',
    },
  });

  const watchedStatus = form.watch('status');

  useEffect(() => {
    if (open) {
      form.reset({
        status: action.status,
        resolution_notes: action.resolution_notes || '',
        verified_by: action.verified_by || '',
      });
    }
  }, [open, action, form]);

  function onSubmit(values: FormValues) {
    if (!currentOrganization) return;

    const now = new Date().toISOString();

    updateAction.mutate(
      {
        organizationId: currentOrganization.id,
        actionId: action.id,
        data: {
          status: values.status,
          resolution_notes: values.resolution_notes || undefined,
          resolved_at: values.status === CorrectiveActionStatus.RESOLVED
            ? (action.resolved_at || now)
            : undefined,
          verified_by: values.status === CorrectiveActionStatus.VERIFIED
            ? values.verified_by
            : undefined,
          verified_at: values.status === CorrectiveActionStatus.VERIFIED
            ? now
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
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Mettre à jour
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mettre à jour le statut</DialogTitle>
          <DialogDescription>
            Modifiez le statut de cette action corrective.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
          <p className="font-medium mb-1">{action.finding_description}</p>
          <p className="text-muted-foreground">{action.action_description}</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormField
                label="Nouveau statut"
                error={form.formState.errors.status?.message}
                required
              >
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />

          {(watchedStatus === CorrectiveActionStatus.RESOLVED ||
            watchedStatus === CorrectiveActionStatus.VERIFIED) && (
            <Controller
              control={form.control}
              name="resolution_notes"
              render={({ field }) => (
                <FormField
                  label="Notes de résolution"
                  error={form.formState.errors.resolution_notes?.message}
                >
                  <Textarea
                    placeholder="Décrivez comment la non-conformité a été corrigée..."
                    rows={3}
                    {...field}
                  />
                </FormField>
              )}
            />
          )}

          {watchedStatus === CorrectiveActionStatus.VERIFIED && (
            <Controller
              control={form.control}
              name="verified_by"
              render={({ field }) => (
                <FormField
                  label="Vérifié par"
                  error={form.formState.errors.verified_by?.message}
                >
                  <Input placeholder="Nom du vérificateur" {...field} />
                </FormField>
              )}
            />
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateAction.isPending}>
              {updateAction.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
