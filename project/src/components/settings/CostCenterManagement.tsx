/**
 * Cost Center Management Component
 *
 * Allows organization admins to manage cost centers for tracking expenses
 * and linking them to farms and parcels for profitability analysis.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Building2,
  MapPin,
  FolderTree,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useCostCenters,
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
  type CostCenter,
} from '@/hooks/useCostCenters';
import { farmsApi } from '@/lib/api/farms';
import { useQuery } from '@tanstack/react-query';
import { useParcelsByFarm } from '@/hooks/useParcelsQuery';

// Validation schema
const costCenterSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20, 'Code must be 20 characters or less'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  parent_id: z.string().optional(),
  farm_id: z.string().optional(),
  parcel_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

type CostCenterFormData = z.infer<typeof costCenterSchema>;

export function CostCenterManagement() {
  const { hasRole } = useAuth();
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [deletingCostCenter, setDeletingCostCenter] = useState<CostCenter | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');

  const isAdmin = hasRole(['organization_admin', 'system_admin']);

  // Data fetching
  const { data: costCenters = [], isLoading } = useCostCenters({
    is_active: filterActive === 'all' ? undefined : filterActive === 'active',
  });
  const { data: farms = [] } = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmsApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: parcels = [] } = useParcelsByFarm(selectedFarmId || undefined);

  const createMutation = useCreateCostCenter();
  const updateMutation = useUpdateCostCenter();
  const deleteMutation = useDeleteCostCenter();

  // Form handling
  const form = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      parent_id: '',
      farm_id: '',
      parcel_id: '',
      is_active: true,
    },
  });

  // Update parcels when farm changes
  const watchedFarmId = form.watch('farm_id');
  useEffect(() => {
    if (watchedFarmId) {
      setSelectedFarmId(watchedFarmId);
    }
  }, [watchedFarmId]);

  const handleOpenDialog = (costCenter?: CostCenter) => {
    if (costCenter) {
      setEditingCostCenter(costCenter);
      setSelectedFarmId(costCenter.farm_id || '');
      form.reset({
        code: costCenter.code,
        name: costCenter.name,
        description: costCenter.description || '',
        parent_id: costCenter.parent_id || '',
        farm_id: costCenter.farm_id || '',
        parcel_id: costCenter.parcel_id || '',
        is_active: costCenter.is_active,
      });
    } else {
      setEditingCostCenter(null);
      setSelectedFarmId('');
      form.reset({
        code: '',
        name: '',
        description: '',
        parent_id: '',
        farm_id: '',
        parcel_id: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCostCenter(null);
    form.reset();
  };

  const onSubmit = async (data: CostCenterFormData) => {
    try {
      const submitData = {
        code: data.code,
        name: data.name,
        description: data.description || undefined,
        parent_id: data.parent_id || undefined,
        farm_id: data.farm_id || undefined,
        parcel_id: data.parcel_id || undefined,
        is_active: data.is_active,
      };

      if (editingCostCenter) {
        await updateMutation.mutateAsync({
          id: editingCostCenter.id,
          data: submitData,
        });
        toast.success(t('costCenters.update.success', 'Cost center updated successfully'));
      } else {
        await createMutation.mutateAsync(submitData);
        toast.success(t('costCenters.create.success', 'Cost center created successfully'));
      }
      handleCloseDialog();
    } catch (_error) {
      toast.error(
        editingCostCenter
          ? t('costCenters.update.failed', 'Failed to update cost center')
          : t('costCenters.create.failed', 'Failed to create cost center')
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingCostCenter) return;

    try {
      await deleteMutation.mutateAsync(deletingCostCenter.id);
      toast.success(t('costCenters.delete.success', 'Cost center deleted successfully'));
      setDeletingCostCenter(null);
    } catch (_error) {
      toast.error(t('costCenters.delete.failed', 'Failed to delete cost center. It may have associated journal entries.'));
    }
  };

  const handleToggleActive = async (costCenter: CostCenter) => {
    try {
      await updateMutation.mutateAsync({
        id: costCenter.id,
        data: { is_active: !costCenter.is_active },
      });
      toast.success(
        costCenter.is_active
          ? t('costCenters.deactivated', 'Cost center deactivated')
          : t('costCenters.activated', 'Cost center activated')
      );
    } catch (_error) {
      toast.error(t('costCenters.toggleFailed', 'Failed to update cost center status'));
    }
  };

  // Filter cost centers
  const filteredCostCenters = costCenters.filter((cc) => {
    const matchesSearch =
      !searchTerm ||
      cc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cc.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Get parent cost centers for dropdown (exclude current if editing)
  const parentOptions = costCenters.filter(
    (cc) => cc.is_active && (!editingCostCenter || cc.id !== editingCostCenter.id)
  );

  // Find parent name
  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = costCenters.find((cc) => cc.id === parentId);
    return parent?.name;
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('costCenters.noPermission', 'You do not have permission to manage cost centers.')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('costCenters.title', 'Cost Centers')}
          </h2>
          <p className="text-muted-foreground">
            {t('costCenters.description', 'Manage cost centers for expense tracking and profitability analysis.')}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('costCenters.addNew', 'Add Cost Center')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('costCenters.searchPlaceholder', 'Search by code or name...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterActive} onValueChange={(value: 'all' | 'active' | 'inactive') => setFilterActive(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('costCenters.filterStatus', 'Filter by status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('costCenters.allStatus', 'All Status')}</SelectItem>
                <SelectItem value="active">{t('costCenters.activeOnly', 'Active Only')}</SelectItem>
                <SelectItem value="inactive">{t('costCenters.inactiveOnly', 'Inactive Only')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cost Centers List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('costCenters.listTitle', 'Cost Center List')}</CardTitle>
          <CardDescription>
            {t('costCenters.listDescription', 'Total: {{count}} cost centers', { count: filteredCostCenters.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('costCenters.loading', 'Loading cost centers...')}
            </div>
          ) : filteredCostCenters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? t('costCenters.noSearchResults', 'No cost centers found matching your search.')
                : t('costCenters.empty', 'No cost centers yet. Create your first one to get started.')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">{t('costCenters.table.code', 'Code')}</th>
                      <th className="text-left py-3 px-4 font-medium">{t('costCenters.table.name', 'Name')}</th>
                      <th className="text-left py-3 px-4 font-medium hidden md:table-cell">{t('costCenters.table.parent', 'Parent')}</th>
                      <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">{t('costCenters.table.location', 'Location')}</th>
                      <th className="text-center py-3 px-4 font-medium">{t('costCenters.table.status', 'Status')}</th>
                      <th className="text-right py-3 px-4 font-medium">{t('costCenters.table.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                <tbody>
                  {filteredCostCenters.map((costCenter) => (
                    <tr key={costCenter.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{costCenter.code}</code>
                      </td>
                      <td className="py-3 px-4 font-medium">{costCenter.name}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {costCenter.parent_id ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FolderTree className="h-3 w-3" />
                            {getParentName(costCenter.parent_id)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                          {costCenter.farm_id ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span className="line-clamp-1">
                                {farms.find((f: { id: string }) => f.id === costCenter.farm_id)?.name || 'Farm'}
                              </span>
                              {costCenter.parcel_id && (
                                <Badge variant="outline" className="ml-1 text-xs">
                                  <MapPin className="h-2 w-2 mr-1" />
                                  Parcel
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={costCenter.is_active ? 'default' : 'secondary'}>
                          {costCenter.is_active
                            ? t('costCenters.active', 'Active')
                            : t('costCenters.inactive', 'Inactive')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(costCenter)}
                            title={costCenter.is_active ? t('costCenters.deactivate', 'Deactivate') : t('costCenters.activate', 'Activate')}
                          >
                            {costCenter.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(costCenter)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingCostCenter(costCenter)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCostCenter
                ? t('costCenters.edit.title', 'Edit Cost Center')
                : t('costCenters.create.title', 'Create Cost Center')}
            </DialogTitle>
            <DialogDescription>
              {editingCostCenter
                ? t('costCenters.edit.description', 'Update the cost center details.')
                : t('costCenters.create.description', 'Add a new cost center for expense tracking.')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">{t('costCenters.form.code', 'Code')} *</Label>
              <Input
                id="code"
                {...form.register('code')}
                placeholder={t('costCenters.form.codePlaceholder', 'e.g., CC001')}
                disabled={!!editingCostCenter}
              />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('costCenters.form.name', 'Name')} *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder={t('costCenters.form.namePlaceholder', 'e.g., North Field Operations')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('costCenters.form.description', 'Description')}</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder={t('costCenters.form.descriptionPlaceholder', 'Brief description of this cost center...')}
                rows={3}
              />
            </div>

            {/* Parent Cost Center */}
            <div className="space-y-2">
              <Label>{t('costCenters.form.parent', 'Parent Cost Center')}</Label>
              <Select
                value={form.watch('parent_id') || 'none'}
                onValueChange={(value) => form.setValue('parent_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('costCenters.form.parentPlaceholder', 'Select parent (optional)')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('costCenters.form.noParent', 'No parent (top level)')}</SelectItem>
                  {parentOptions.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('costCenters.form.parentHelp', 'Organize cost centers hierarchically for roll-up reporting.')}
              </p>
            </div>

            {/* Farm */}
            <div className="space-y-2">
              <Label>{t('costCenters.form.farm', 'Farm')}</Label>
              <Select
                value={form.watch('farm_id') || 'none'}
                onValueChange={(value) => {
                  form.setValue('farm_id', value === 'none' ? '' : value);
                  form.setValue('parcel_id', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('costCenters.form.farmPlaceholder', 'Select farm (optional)')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('costCenters.form.noFarm', 'No farm')}</SelectItem>
                  {farms.map((farm: { id: string; name: string }) => (
                    <SelectItem key={farm.id} value={farm.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {farm.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('costCenters.form.farmHelp', 'Link this cost center to a specific farm for tracking.')}
              </p>
            </div>

            {/* Parcel */}
            {form.watch('farm_id') && (
              <div className="space-y-2">
                <Label>{t('costCenters.form.parcel', 'Parcel')}</Label>
                <Select
                  value={form.watch('parcel_id') || 'none'}
                  onValueChange={(value) => form.setValue('parcel_id', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('costCenters.form.parcelPlaceholder', 'Select parcel (optional)')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('costCenters.form.noParcel', 'No parcel')}</SelectItem>
                    {parcels.map((parcel: { id: string; name: string }) => (
                      <SelectItem key={parcel.id} value={parcel.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {parcel.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('costCenters.form.parcelHelp', 'Further narrow down to a specific parcel for granular tracking.')}
                </p>
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('costCenters.form.active', 'Active')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('costCenters.form.activeHelp', 'Inactive cost centers cannot be used in new transactions.')}
                </p>
              </div>
              <Switch
                checked={form.watch('is_active')}
                onCheckedChange={(checked) => form.setValue('is_active', checked)}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCostCenter
                  ? t('costCenters.form.update', 'Update')
                  : t('costCenters.form.create', 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCostCenter} onOpenChange={() => setDeletingCostCenter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('costCenters.delete.title', 'Delete Cost Center')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'costCenters.delete.description',
                'Are you sure you want to delete "{{name}}"? This action cannot be undone. If this cost center has associated journal entries, deletion will fail.',
                { name: deletingCostCenter?.name }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
