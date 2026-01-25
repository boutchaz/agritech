import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Loader2 } from 'lucide-react';

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

import { useCreateCertification } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { CertificationType, CertificationStatus } from '@/lib/api/compliance';

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
  const [open, setOpen] = useState(false);
  const { currentOrganization } = useAuth();
  const createCertification = useCreateCertification();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: CertificationStatus.ACTIVE,
    },
  });

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Certification
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une certification</DialogTitle>
          <DialogDescription>
            Enregistrez une nouvelle certification pour votre organisation.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={form.control}
            name="certification_type"
            render={({ field }) => (
              <FormField 
                label="Type de certification" 
                error={form.formState.errors.certification_type?.message}
                required
              >
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
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
                label="Numéro de certification" 
                error={form.formState.errors.certification_number?.message}
                required
              >
                <Input placeholder="ex: CERT-2024-001" {...field} />
              </FormField>
            )}
          />

          <Controller
            control={form.control}
            name="issuing_body"
            render={({ field }) => (
              <FormField 
                label="Organisme certificateur" 
                error={form.formState.errors.issuing_body?.message}
                required
              >
                <Input placeholder="ex: Bureau Veritas" {...field} />
              </FormField>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="issued_date"
              render={({ field }) => (
                <FormField 
                  label="Date d'émission" 
                  error={form.formState.errors.issued_date?.message}
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
              name="expiry_date"
              render={({ field }) => (
                <FormField 
                  label="Date d'expiration" 
                  error={form.formState.errors.expiry_date?.message}
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
            name="status"
            render={({ field }) => (
              <FormField 
                label="Statut" 
                error={form.formState.errors.status?.message}
                required
              >
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CertificationStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={CertificationStatus.PENDING_RENEWAL}>Renouvellement</SelectItem>
                    <SelectItem value={CertificationStatus.EXPIRED}>Expirée</SelectItem>
                    <SelectItem value={CertificationStatus.SUSPENDED}>Suspendue</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createCertification.isPending}>
              {createCertification.isPending && (
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
