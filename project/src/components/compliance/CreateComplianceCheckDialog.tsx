import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { DatePicker } from '@/components/ui/DatePicker';

import { useCreateComplianceCheck } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { ComplianceCheckType, ComplianceCheckStatus } from '@/lib/api/compliance';

const formSchema = z.object({
  check_type: z.nativeEnum(ComplianceCheckType),
  check_date: z.string().min(1, "La date du contrôle est requise"),
  status: z.nativeEnum(ComplianceCheckStatus),
  auditor_name: z.string().optional(),
  score: z.string().optional(),
  next_check_date: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const checkTypeLabels: Record<ComplianceCheckType, string> = {
  [ComplianceCheckType.PESTICIDE_USAGE]: 'Utilisation pesticides',
  [ComplianceCheckType.TRACEABILITY]: 'Traçabilité',
  [ComplianceCheckType.WORKER_SAFETY]: 'Sécurité travailleurs',
  [ComplianceCheckType.RECORD_KEEPING]: 'Tenue des registres',
  [ComplianceCheckType.ENVIRONMENTAL]: 'Environnement',
  [ComplianceCheckType.QUALITY_CONTROL]: 'Contrôle qualité',
};

const statusLabels: Record<ComplianceCheckStatus, string> = {
  [ComplianceCheckStatus.COMPLIANT]: 'Conforme',
  [ComplianceCheckStatus.NON_COMPLIANT]: 'Non conforme',
  [ComplianceCheckStatus.NEEDS_REVIEW]: 'À revoir',
  [ComplianceCheckStatus.IN_PROGRESS]: 'En cours',
};

interface CreateComplianceCheckDialogProps {
  certificationId: string;
}

export function CreateComplianceCheckDialog({ certificationId }: CreateComplianceCheckDialogProps) {
  const [open, setOpen] = useState(false);
  const { currentOrganization } = useAuth();
  const createCheck = useCreateComplianceCheck();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: ComplianceCheckStatus.IN_PROGRESS,
    },
  });

  function onSubmit(values: FormValues) {
    if (!currentOrganization) return;

    createCheck.mutate(
      {
        organizationId: currentOrganization.id,
        data: {
          certification_id: certificationId,
          check_type: values.check_type,
          check_date: new Date(values.check_date).toISOString(),
          status: values.status,
          auditor_name: values.auditor_name,
          score: values.score ? parseInt(values.score, 10) : undefined,
          next_check_date: values.next_check_date 
            ? new Date(values.next_check_date).toISOString() 
            : undefined,
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
          Nouveau contrôle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Nouveau contrôle de conformité</DialogTitle>
          <DialogDescription>
            Enregistrez un nouveau contrôle ou audit pour cette certification.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="check_type"
            render={({ field }) => (
              <FormField 
                label="Type de contrôle" 
                error={form.formState.errors.check_type?.message}
                required
              >
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(checkTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="check_date"
              render={({ field }) => (
                <FormField 
                  label="Date du contrôle" 
                  error={form.formState.errors.check_date?.message}
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

            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormField 
                  label="Résultat" 
                  error={form.formState.errors.status?.message}
                  required
                >
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="auditor_name"
              render={({ field }) => (
                <FormField 
                  label="Auditeur" 
                  error={form.formState.errors.auditor_name?.message}
                >
                  <Input placeholder="Nom de l'auditeur" {...field} />
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="score"
              render={({ field }) => (
                <FormField 
                  label="Score (%)" 
                  error={form.formState.errors.score?.message}
                >
                  <Input 
                    type="number" 
                    min={0} 
                    max={100} 
                    placeholder="0-100" 
                    {...field} 
                  />
                </FormField>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="next_check_date"
            render={({ field }) => (
              <FormField 
                label="Prochain contrôle prévu" 
                error={form.formState.errors.next_check_date?.message}
              >
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Choisir date (optionnel)"
                />
              </FormField>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createCheck.isPending}>
              {createCheck.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
