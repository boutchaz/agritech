/**
 * Account Mappings Management Component
 *
 * Allows organization admins to manage account mappings for automatic
 * journal entry creation (cost types, revenue types, harvest sales, etc.)
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Link2,
  ToggleLeft,
  ToggleRight,
  Download,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useAccountMappings,
  useCreateAccountMapping,
  useUpdateAccountMapping,
  useDeleteAccountMapping,
  useInitializeAccountMappings,
  useAccountMappingOptions,
  type AccountMapping,
} from '@/hooks/useAccountMappings';
import { useAccounts } from '@/hooks/useAccounts';

// Mapping type value list
const MAPPING_TYPE_VALUES = ['cost_type', 'revenue_type', 'harvest_sale', 'cash'];

// Common mapping key values by type
const MAPPING_KEY_VALUES: Record<string, string[]> = {
  cost_type: ['planting', 'harvesting', 'irrigation', 'fertilization', 'pesticide', 'pruning', 'maintenance', 'transport', 'labor', 'materials', 'utilities', 'other'],
  revenue_type: ['product_sales', 'service_income', 'other_income'],
  harvest_sale: ['market', 'export', 'wholesale', 'direct', 'processing'],
  cash: ['bank', 'cash', 'petty_cash'],
};

// Validation schema
const accountMappingSchema = z.object({
  mapping_type: z.string().min(1, 'Mapping type is required'),
  mapping_key: z.string().min(1, 'Mapping key is required'),
  account_id: z.string().uuid('Please select an account'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  is_active: z.boolean().default(true),
});

type AccountMappingFormData = z.infer<typeof accountMappingSchema>;

const toLabel = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');


export function AccountMappingsManagement() {
  const { hasRole, currentOrganization } = useAuth();
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<AccountMapping | null>(null);
  const [deletingMapping, setDeletingMapping] = useState<AccountMapping | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const isAdmin = hasRole(['organization_admin', 'system_admin']);

  // Data fetching
  const { data: mappings = [], isLoading } = useAccountMappings({
    mapping_type: filterType === 'all' ? undefined : filterType,
    is_active: filterActive === 'all' ? undefined : filterActive === 'active',
  });
  const { data: accounts = [] } = useAccounts();

  const createMutation = useCreateAccountMapping();
  const updateMutation = useUpdateAccountMapping();
  const deleteMutation = useDeleteAccountMapping();
  const initializeMutation = useInitializeAccountMappings();
  const { data: mappingOptions } = useAccountMappingOptions();

  // Form handling
  const form = useForm<AccountMappingFormData>({
    resolver: zodResolver(accountMappingSchema),
    defaultValues: {
      mapping_type: '',
      mapping_key: '',
      account_id: '',
      description: '',
      is_active: true,
    },
  });

  const selectedMappingType = form.watch('mapping_type');
  const selectedMappingKey = form.watch('mapping_key');
  const tLabel = (value: string) => t(`accountMappings.labels.${value}`, toLabel(value));

  const mappingTypeOptions = useMemo(() => {
    const types = mappingOptions?.types?.length ? mappingOptions.types : MAPPING_TYPE_VALUES;
    return types.map((type: string) => ({
      value: type,
      label: tLabel(type),
    }));
  }, [mappingOptions?.types, t]);

  const availableKeys = useMemo(() => {
    const keysFromOptions = mappingOptions?.keys_by_type?.[selectedMappingType];
    const keyValues = keysFromOptions?.length ? keysFromOptions : (MAPPING_KEY_VALUES[selectedMappingType] || []);
    const options = keyValues.map((key: string) => ({
      value: key,
      label: tLabel(key),
    }));
    if (selectedMappingKey && !keyValues.includes(selectedMappingKey)) {
      options.push({ value: selectedMappingKey, label: tLabel(selectedMappingKey) });
    }
    return options;
  }, [mappingOptions?.keys_by_type, selectedMappingKey, selectedMappingType, t]);

  const handleOpenDialog = (mapping?: AccountMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      form.reset({
        mapping_type: mapping.mapping_type,
        mapping_key: mapping.source_key || mapping.mapping_key || '',
        account_id: mapping.account_id || '',
        description: mapping.description || '',
        is_active: mapping.is_active ?? true,
      });
    } else {
      setEditingMapping(null);
      form.reset({
        mapping_type: '',
        mapping_key: '',
        account_id: '',
        description: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMapping(null);
    form.reset();
  };

  const onSubmit = async (data: AccountMappingFormData) => {
    try {
      const submitData = {
        mapping_type: data.mapping_type,
        mapping_key: data.mapping_key,
        source_key: data.mapping_key,
        account_id: data.account_id,
        description: data.description || undefined,
        is_active: data.is_active,
      };

      if (editingMapping) {
        await updateMutation.mutateAsync({
          id: editingMapping.id,
          data: submitData,
        });
        toast.success(t('accountMappings.update.success', 'Account mapping updated successfully'));
      } else {
        await createMutation.mutateAsync(submitData);
        toast.success(t('accountMappings.create.success', 'Account mapping created successfully'));
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(
        error?.message ||
        (editingMapping
          ? t('accountMappings.update.failed', 'Failed to update account mapping')
          : t('accountMappings.create.failed', 'Failed to create account mapping'))
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingMapping) return;

    try {
      await deleteMutation.mutateAsync(deletingMapping.id);
      toast.success(t('accountMappings.delete.success', 'Account mapping deleted successfully'));
      setDeletingMapping(null);
    } catch (error) {
      toast.error(t('accountMappings.delete.failed', 'Failed to delete account mapping'));
    }
  };

  const handleToggleActive = async (mapping: AccountMapping) => {
    try {
      await updateMutation.mutateAsync({
        id: mapping.id,
        data: { is_active: !mapping.is_active },
      });
      toast.success(
        mapping.is_active
          ? t('accountMappings.deactivated', 'Account mapping deactivated')
          : t('accountMappings.activated', 'Account mapping activated')
      );
    } catch (error) {
      toast.error(t('accountMappings.toggleFailed', 'Failed to update mapping status'));
    }
  };

  const handleInitializeDefaults = async () => {
    const countryCode = currentOrganization?.country_code || 'MA';
    try {
      const result = await initializeMutation.mutateAsync(countryCode);
      toast.success(
        t('accountMappings.initialize.success', 'Initialized {{count}} default mappings', { count: result.count })
      );
    } catch (error: any) {
      toast.error(error?.message || t('accountMappings.initialize.failed', 'Failed to initialize default mappings'));
    }
  };

  // Filter mappings
  const filteredMappings = mappings.filter((m) => {
    const key = m.source_key || m.mapping_key || '';
    const matchesSearch =
      !searchTerm ||
      key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.account?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group mappings by type
  const groupedMappings = useMemo(() => {
    const groups: Record<string, AccountMapping[]> = {};
    filteredMappings.forEach((m) => {
      if (!groups[m.mapping_type]) {
        groups[m.mapping_type] = [];
      }
      groups[m.mapping_type].push(m);
    });
    return groups;
  }, [filteredMappings]);

  // Get label for mapping type
  const getMappingTypeLabel = (type: string) => {
    return mappingTypeOptions.find((opt) => opt.value === type)?.label || tLabel(type);
  };

  // Get label for mapping key
  const getMappingKeyLabel = (_type: string, key: string) => {
    return tLabel(key);
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('accountMappings.noPermission', 'You do not have permission to manage account mappings.')}
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
            {t('accountMappings.title', 'Account Mappings')}
          </h2>
          <p className="text-muted-foreground">
            {t('accountMappings.description', 'Configure how business events map to GL accounts for automatic journal entries.')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInitializeDefaults} disabled={initializeMutation.isPending}>
            <Download className="h-4 w-4 mr-2" />
            {t('accountMappings.initializeDefaults', 'Initialize Defaults')}
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('accountMappings.addNew', 'Add Mapping')}
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('accountMappings.infoTitle', 'How Account Mappings Work')}</AlertTitle>
        <AlertDescription>
          {t('accountMappings.infoDescription', 'Account mappings link business events (like task completion or harvest sales) to specific GL accounts. When a task is completed or a harvest is sold, the system automatically creates journal entries using these mappings.')}
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('accountMappings.searchPlaceholder', 'Search by key or account...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('accountMappings.filterType', 'Filter by type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('accountMappings.allTypes', 'All Types')}</SelectItem>
                {mappingTypeOptions.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={(value: 'all' | 'active' | 'inactive') => setFilterActive(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('accountMappings.filterStatus', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('accountMappings.allStatus', 'All Status')}</SelectItem>
                <SelectItem value="active">{t('accountMappings.activeOnly', 'Active')}</SelectItem>
                <SelectItem value="inactive">{t('accountMappings.inactiveOnly', 'Inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mappings List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('accountMappings.loading', 'Loading account mappings...')}
          </CardContent>
        </Card>
      ) : filteredMappings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm || filterType !== 'all'
              ? t('accountMappings.noSearchResults', 'No mappings found matching your filters.')
              : t('accountMappings.empty', 'No account mappings configured. Click "Initialize Defaults" to set up standard mappings, or add them manually.')}
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedMappings).map(([type, typeMappings]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                {getMappingTypeLabel(type)}
              </CardTitle>
              <CardDescription>
                {t('accountMappings.typeCount', '{{count}} mappings', { count: typeMappings.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="text-left py-3 px-4 font-medium">{t('accountMappings.table.key', 'Key')}</TableHead>
                      <TableHead className="text-left py-3 px-4 font-medium">{t('accountMappings.table.account', 'Account')}</TableHead>
                      <TableHead className="text-left py-3 px-4 font-medium hidden md:table-cell">{t('accountMappings.table.description', 'Description')}</TableHead>
                      <TableHead className="text-center py-3 px-4 font-medium">{t('accountMappings.table.status', 'Status')}</TableHead>
                      <TableHead className="text-right py-3 px-4 font-medium">{t('accountMappings.table.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeMappings.map((mapping) => (
                      <TableRow key={mapping.id} className="border-b hover:bg-muted/50">
                        <TableCell className="py-3 px-4">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {getMappingKeyLabel(type, mapping.source_key || mapping.mapping_key || '')}
                          </code>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {mapping.account ? (
                            <div>
                              <div className="font-medium">{mapping.account.code}</div>
                              <div className="text-sm text-muted-foreground">{mapping.account.name}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {mapping.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <Badge variant={mapping.is_active ? 'default' : 'secondary'}>
                            {mapping.is_active
                              ? t('accountMappings.active', 'Active')
                              : t('accountMappings.inactive', 'Inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(mapping)}
                              title={mapping.is_active ? t('accountMappings.deactivate', 'Deactivate') : t('accountMappings.activate', 'Activate')}
                            >
                              {mapping.is_active ? (
                                <ToggleRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(mapping)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingMapping(mapping)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingMapping
                ? t('accountMappings.edit.title', 'Edit Account Mapping')
                : t('accountMappings.create.title', 'Create Account Mapping')}
            </DialogTitle>
            <DialogDescription>
              {editingMapping
                ? t('accountMappings.edit.description', 'Update the account mapping details.')
                : t('accountMappings.create.description', 'Map a business event to a GL account.')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Mapping Type */}
            <div className="space-y-2">
              <Label>{t('accountMappings.form.type', 'Mapping Type')} *</Label>
              <Select
                value={form.watch('mapping_type')}
                onValueChange={(value) => {
                  form.setValue('mapping_type', value);
                  form.setValue('mapping_key', ''); // Reset key when type changes
                }}
                disabled={!!editingMapping}
              >
                <SelectTrigger>
                <SelectValue placeholder={t('accountMappings.form.typePlaceholder', 'Select mapping type')} />
              </SelectTrigger>
              <SelectContent>
                {mappingTypeOptions.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
              {form.formState.errors.mapping_type && (
                <p className="text-sm text-destructive">{form.formState.errors.mapping_type.message}</p>
              )}
            </div>

            {/* Mapping Key */}
            <div className="space-y-2">
              <Label>{t('accountMappings.form.key', 'Mapping Key')} *</Label>
              <Select
                value={form.watch('mapping_key')}
                onValueChange={(value) => form.setValue('mapping_key', value)}
                disabled={!selectedMappingType || !!editingMapping}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('accountMappings.form.keyPlaceholder', 'Select mapping key')} />
                </SelectTrigger>
                <SelectContent>
                  {availableKeys.map((key) => (
                    <SelectItem key={key.value} value={key.value}>
                      {key.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.mapping_key && (
                <p className="text-sm text-destructive">{form.formState.errors.mapping_key.message}</p>
              )}
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label>{t('accountMappings.form.account', 'GL Account')} *</Label>
              <Select
                value={form.watch('account_id')}
                onValueChange={(value) => form.setValue('account_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('accountMappings.form.accountPlaceholder', 'Select account')} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {accounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.account_id && (
                <p className="text-sm text-destructive">{form.formState.errors.account_id.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('accountMappings.form.description', 'Description')}</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder={t('accountMappings.form.descriptionPlaceholder', 'Optional description...')}
                rows={2}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('accountMappings.form.active', 'Active')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('accountMappings.form.activeHelp', 'Inactive mappings are ignored during journal creation.')}
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
                {editingMapping
                  ? t('accountMappings.form.update', 'Update')
                  : t('accountMappings.form.create', 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMapping} onOpenChange={() => setDeletingMapping(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accountMappings.delete.title', 'Delete Account Mapping')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'accountMappings.delete.description',
                'Are you sure you want to delete the mapping for "{{key}}"? This will not affect existing journal entries, but new automatic entries will fail without this mapping.',
                { key: getMappingKeyLabel(deletingMapping?.mapping_type || '', deletingMapping?.source_key || deletingMapping?.mapping_key || '') }
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
