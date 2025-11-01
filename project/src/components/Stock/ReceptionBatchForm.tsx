import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardCheck,
  Package,
  Scale,
  Thermometer,
  Droplet,
  AlertCircle,
  Loader2,
  Camera,
} from 'lucide-react';
import {
  useCreateReceptionBatch,
} from '@/hooks/useReceptionBatches';
import { useParcelsWithDetails } from '@/hooks/useParcelsWithDetails';
import { useAssignableUsers } from '@/hooks/useAssignableUsers';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import type {
  CreateReceptionBatchDto,
  QualityGrade,
} from '@/types/reception';
import { toast } from 'sonner';

// Zod schema for reception batch form
const receptionBatchSchema = z.object({
  warehouse_id: z.string().min(1, 'Reception center is required'),
  harvest_id: z.string().optional(),
  parcel_id: z.string().min(1, 'Parcel is required'),
  crop_id: z.string().optional(),
  culture_type: z.string().optional(),

  reception_date: z.string().min(1, 'Reception date is required'),
  reception_time: z.string().optional(),

  // Weight & Quantity
  weight: z.number().min(0.001, 'Weight must be positive'),
  weight_unit: z.string().default('kg'),
  quantity: z.number().optional(),
  quantity_unit: z.string().optional(),

  // Quality Control
  quality_grade: z.enum(['Extra', 'A', 'B', 'C', 'First', 'Second', 'Third']).optional(),
  quality_score: z.number().min(1).max(10).optional(),
  quality_notes: z.string().optional(),
  humidity_percentage: z.number().min(0).max(100).optional(),
  maturity_level: z.string().optional(),
  temperature: z.number().optional(),
  moisture_content: z.number().min(0).max(100).optional(),

  // Personnel & Producer
  received_by: z.string().optional(),
  producer_name: z.string().optional(),
  supplier_id: z.string().optional(),
});

type ReceptionBatchFormData = z.infer<typeof receptionBatchSchema>;

interface ReceptionBatchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultHarvestId?: string;
  defaultParcelId?: string;
}

export default function ReceptionBatchForm({
  open,
  onOpenChange,
  defaultHarvestId,
  defaultParcelId,
}: ReceptionBatchFormProps) {
  const { currentOrganization, user } = useAuth();
  const createBatch = useCreateReceptionBatch();
  const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouses();
  const { data: parcels = [], isLoading: parcelsLoading } = useParcelsWithDetails();
  const { data: assignableUsers = [] } = useAssignableUsers(currentOrganization?.id || null);
  const [activeTab, setActiveTab] = useState('basic');

  const form = useForm<ReceptionBatchFormData>({
    resolver: zodResolver(receptionBatchSchema),
    defaultValues: {
      harvest_id: defaultHarvestId,
      parcel_id: defaultParcelId || '',
      reception_date: new Date().toISOString().split('T')[0],
      reception_time: new Date().toTimeString().slice(0, 5),
      weight_unit: 'kg',
      weight: 0,
      received_by: user?.id || '',
    },
  });

  // Watch parcel selection to auto-populate culture type and crop
  const selectedParcelId = form.watch('parcel_id');

  useEffect(() => {
    if (selectedParcelId && parcels.length > 0) {
      const selectedParcel = parcels.find(p => p.id === selectedParcelId);
      if (selectedParcel) {
        // Auto-populate crop_id
        if (selectedParcel.crop_id) {
          form.setValue('crop_id', selectedParcel.crop_id);
        }
        // Auto-populate culture_type from crop name
        if (selectedParcel.crop?.name) {
          form.setValue('culture_type', selectedParcel.crop.name);
        }
      }
    }
  }, [selectedParcelId, parcels, form]);

  const onSubmit = async (data: ReceptionBatchFormData) => {
    if (!currentOrganization?.id) {
      toast.error('No organization selected');
      return;
    }

    if (warehouses.length === 0) {
      toast.error('No warehouses available. Please create a warehouse first.');
      return;
    }

    try {
      const input: CreateReceptionBatchDto = {
        warehouse_id: data.warehouse_id,
        harvest_id: data.harvest_id,
        parcel_id: data.parcel_id,
        crop_id: data.crop_id,
        culture_type: data.culture_type,
        reception_date: data.reception_date,
        reception_time: data.reception_time,
        weight: data.weight,
        weight_unit: data.weight_unit,
        quantity: data.quantity,
        quantity_unit: data.quantity_unit,
        quality_grade: data.quality_grade,
        quality_score: data.quality_score,
        quality_notes: data.quality_notes,
        humidity_percentage: data.humidity_percentage,
        maturity_level: data.maturity_level,
        temperature: data.temperature,
        moisture_content: data.moisture_content,
        received_by: data.received_by,
        producer_name: data.producer_name,
        supplier_id: data.supplier_id,
      };

      await createBatch.mutateAsync(input);
      toast.success('Reception batch created successfully');
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(`Failed to create reception batch: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            New Reception Batch
          </DialogTitle>
          <DialogDescription>
            Record harvest reception with weighing and quality control information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="quality">Quality Control</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Warehouse */}
              <div>
                <Label htmlFor="warehouse_id">Warehouse *</Label>
                <Select
                  value={form.watch('warehouse_id') || ''}
                  onValueChange={(value) => form.setValue('warehouse_id', value)}
                  disabled={warehousesLoading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={warehousesLoading ? "Loading warehouses..." : "Select warehouse"} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No warehouses available
                      </SelectItem>
                    ) : (
                      warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                          {warehouse.location && ` - ${warehouse.location}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.warehouse_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.warehouse_id.message}
                  </p>
                )}
              </div>

              {/* Parcel Selector */}
              <div>
                <Label htmlFor="parcel_id">Parcel *</Label>
                <Select
                  value={form.watch('parcel_id') || ''}
                  onValueChange={(value) => form.setValue('parcel_id', value)}
                  disabled={parcelsLoading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={parcelsLoading ? "Loading parcels..." : "Select parcel"} />
                  </SelectTrigger>
                  <SelectContent>
                    {parcels.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        {parcelsLoading ? "Loading..." : "No parcels available"}
                      </SelectItem>
                    ) : (
                      parcels.map((parcel) => (
                        <SelectItem key={parcel.id} value={parcel.id}>
                          {parcel.name}
                          {parcel.farm?.name && ` - ${parcel.farm.name}`}
                          {parcel.crop?.name && ` (${parcel.crop.name})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.parcel_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.parcel_id.message}
                  </p>
                )}
                {!parcelsLoading && parcels.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No parcels found. Please create a parcel first.
                  </p>
                )}
              </div>

              {/* Culture Type (Auto-populated from parcel) */}
              <div>
                <Label htmlFor="culture_type">Culture Type (auto-filled)</Label>
                <Input
                  id="culture_type"
                  {...form.register('culture_type')}
                  placeholder="Will be filled from parcel crop"
                  className="mt-1 bg-gray-50"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Automatically filled from selected parcel's crop
                </p>
              </div>

              {/* Reception Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reception_date">Reception Date *</Label>
                  <Input
                    type="date"
                    id="reception_date"
                    {...form.register('reception_date')}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="reception_time">Reception Time</Label>
                  <Input
                    type="time"
                    id="reception_time"
                    {...form.register('reception_time')}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Weight */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="weight" className="flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Weight *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="weight"
                    {...form.register('weight', { valueAsNumber: true })}
                    placeholder="0.00"
                    className="mt-1"
                  />
                  {form.formState.errors.weight && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.weight.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="weight_unit">Unit</Label>
                  <Select
                    value={form.watch('weight_unit') || 'kg'}
                    onValueChange={(value) => form.setValue('weight_unit', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ton">Ton</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quantity (optional, for counted items) */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="quantity">Quantity (Optional)</Label>
                  <Input
                    type="number"
                    step="1"
                    id="quantity"
                    {...form.register('quantity', { valueAsNumber: true })}
                    placeholder="Number of items"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity_unit">Unit</Label>
                  <Input
                    id="quantity_unit"
                    {...form.register('quantity_unit')}
                    placeholder="pieces, boxes, etc."
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Producer Information */}
              <div>
                <Label htmlFor="producer_name">Producer Name</Label>
                <Input
                  id="producer_name"
                  {...form.register('producer_name')}
                  placeholder="Name of producer/farmer"
                  className="mt-1"
                />
              </div>

              {/* Received By */}
              <div>
                <Label htmlFor="received_by">Received By</Label>
                <Select
                  value={form.watch('received_by') || ''}
                  onValueChange={(value) => form.setValue('received_by', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No users available
                      </SelectItem>
                    ) : (
                      assignableUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.full_name}
                          {user.role && ` (${user.role})`}
                          {user.worker_position && ` - ${user.worker_position}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Select the user who received this batch
                </p>
              </div>
            </TabsContent>

            {/* Quality Control Tab */}
            <TabsContent value="quality" className="space-y-4 mt-4">
              {/* Quality Grade */}
              <div>
                <Label htmlFor="quality_grade">Quality Grade</Label>
                <Select
                  value={form.watch('quality_grade') || ''}
                  onValueChange={(value) =>
                    form.setValue('quality_grade', value as QualityGrade)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Extra">Extra</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="First">First</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="Second">Second</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="Third">Third</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quality Score */}
              <div>
                <Label htmlFor="quality_score">Quality Score (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  id="quality_score"
                  {...form.register('quality_score', { valueAsNumber: true })}
                  placeholder="1-10"
                  className="mt-1"
                />
              </div>

              {/* Humidity */}
              <div>
                <Label htmlFor="humidity_percentage" className="flex items-center gap-2">
                  <Droplet className="w-4 h-4" />
                  Humidity (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  id="humidity_percentage"
                  {...form.register('humidity_percentage', { valueAsNumber: true })}
                  placeholder="0-100%"
                  className="mt-1"
                />
              </div>

              {/* Moisture Content */}
              <div>
                <Label htmlFor="moisture_content">Moisture Content (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  id="moisture_content"
                  {...form.register('moisture_content', { valueAsNumber: true })}
                  placeholder="0-100%"
                  className="mt-1"
                />
              </div>

              {/* Temperature */}
              <div>
                <Label htmlFor="temperature" className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  Temperature (°C)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  id="temperature"
                  {...form.register('temperature', { valueAsNumber: true })}
                  placeholder="Temperature in Celsius"
                  className="mt-1"
                />
              </div>

              {/* Maturity Level */}
              <div>
                <Label htmlFor="maturity_level">Maturity Level</Label>
                <Input
                  id="maturity_level"
                  {...form.register('maturity_level')}
                  placeholder="e.g., Ripe, Semi-ripe, Green"
                  className="mt-1"
                />
              </div>

              {/* Quality Notes */}
              <div>
                <Label htmlFor="quality_notes">Quality Notes</Label>
                <Textarea
                  id="quality_notes"
                  {...form.register('quality_notes')}
                  placeholder="Any observations about quality, defects, etc."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </TabsContent>

            {/* Additional Information Tab */}
            <TabsContent value="additional" className="space-y-4 mt-4">
              <div className="text-center py-8 text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Photo upload and additional features</p>
                <p className="text-sm mt-1">Coming soon...</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createBatch.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createBatch.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Create Reception Batch
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
