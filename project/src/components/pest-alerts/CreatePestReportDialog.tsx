import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/FormField';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/radix-select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePestReport, usePestDiseaseLibrary } from '@/hooks/usePestAlerts';
import { useFarmHierarchy } from '@/hooks/useFarmHierarchy';
import { useParcels } from '@/hooks/useParcels';

const formSchema = z.object({
  farm_id: z.string().min(1, 'La ferme est requise'),
  parcel_id: z.string().min(1, 'La parcelle est requise'),
  pest_disease_id: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical'] as const),
  detection_method: z.enum(['visual_inspection', 'trap_monitoring', 'lab_test', 'field_scout', 'automated_sensor', 'worker_report'] as const),
  notes: z.string().optional(),
  affected_area_percentage: z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreatePestReportDialog() {
  const [open, setOpen] = useState(false);
  const { currentOrganization } = useAuth();
  const { mutate: createReport, isPending } = useCreatePestReport();
  const { data: farms } = useFarmHierarchy(currentOrganization?.id);
  const { data: library } = usePestDiseaseLibrary(currentOrganization?.id);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      severity: 'low',
      detection_method: 'visual_inspection',
    },
  });

  const selectedFarmId = form.watch('farm_id');
  const { parcels } = useParcels(selectedFarmId || null);

  const onSubmit = (values: FormValues) => {
    if (!currentOrganization?.id) return;

    createReport({
      organizationId: currentOrganization.id,
      data: {
        ...values,
        photo_urls: [], // TODO: Implement photo upload
      },
    }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau Signalement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Signaler un Ravageur ou une Maladie</DialogTitle>
          <DialogDescription>
            Remplissez le formulaire ci-dessous pour créer un nouveau rapport.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="farm_id"
              render={({ field }) => (
                <FormField 
                  label="Ferme" 
                  error={form.formState.errors.farm_id?.message}
                  required
                >
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une ferme" />
                    </SelectTrigger>
                    <SelectContent>
                      {farms?.map((farm) => (
                        <SelectItem key={farm.farm_id} value={farm.farm_id}>
                          {farm.farm_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="parcel_id"
              render={({ field }) => (
                <FormField 
                  label="Parcelle" 
                  error={form.formState.errors.parcel_id?.message}
                  required
                >
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!selectedFarmId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une parcelle" />
                    </SelectTrigger>
                    <SelectContent>
                      {parcels.map((parcel) => (
                        <SelectItem key={parcel.id} value={parcel.id}>
                          {parcel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="pest_disease_id"
            render={({ field }) => (
              <FormField 
                label="Ravageur / Maladie (Optionnel)" 
                error={form.formState.errors.pest_disease_id?.message}
              >
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Identifier si connu" />
                  </SelectTrigger>
                  <SelectContent>
                    {library?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.type === 'pest' ? 'Ravageur' : 'Maladie'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormField 
                  label="Sévérité" 
                  error={form.formState.errors.severity?.message}
                  required
                >
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Niveau de sévérité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Faible</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Élevée</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="detection_method"
              render={({ field }) => (
                <FormField 
                  label="Méthode de détection" 
                  error={form.formState.errors.detection_method?.message}
                  required
                >
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visual_inspection">Inspection visuelle</SelectItem>
                      <SelectItem value="trap_monitoring">Piégeage</SelectItem>
                      <SelectItem value="lab_test">Test laboratoire</SelectItem>
                      <SelectItem value="field_scout">Scoutisme</SelectItem>
                      <SelectItem value="automated_sensor">Capteur</SelectItem>
                      <SelectItem value="worker_report">Signalement ouvrier</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="affected_area_percentage"
            render={({ field }) => (
              <FormField 
                label="Surface affectée (%)" 
                error={form.formState.errors.affected_area_percentage?.message}
              >
                <Input type="number" min="0" max="100" {...field} value={field.value || ''} />
              </FormField>
            )}
          />

          <Controller
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormField 
                label="Notes / Observations" 
                error={form.formState.errors.notes?.message}
              >
                <Textarea 
                  placeholder="Décrivez les symptômes, la localisation précise, etc." 
                  className="resize-none" 
                  {...field} 
                />
              </FormField>
            )}
          />

          {/* Photo upload placeholder */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Photos</label>
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                Cliquez pour ajouter des photos
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG jusqu'à 5MB
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le rapport
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
