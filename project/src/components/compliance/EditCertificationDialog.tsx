import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Edit } from 'lucide-react';

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
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier la certification</DialogTitle>
          <DialogDescription>
            Mettez à jour les informations de cette certification.
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
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
                <Select onValueChange={field.onChange} value={field.value}>
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

          <Controller
            control={form.control}
            name="scope"
            render={({ field }) => (
              <FormField 
                label="Portée (Scope)" 
                error={form.formState.errors.scope?.message}
              >
                <Textarea 
                  placeholder="ex: Production de fruits et légumes - Fermes A, B, C" 
                  {...field} 
                  rows={3}
                />
              </FormField>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateCertification.isPending}>
              {updateCertification.isPending && (
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
