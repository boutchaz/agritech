import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Edit2,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/components/MultiTenantAuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
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
  useFiscalYears,
  useCreateFiscalYear,
  useUpdateFiscalYear,
  useCloseFiscalYear,
} from '@/hooks/useAgriculturalAccounting';
import type { FiscalYear, FiscalYearStatus } from '@/types/agricultural-accounting';

const fiscalYearSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(20),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  period_type: z.enum(['monthly', 'quarterly']).default('monthly'),
  is_current: z.boolean().default(false),
});

type FiscalYearFormData = z.infer<typeof fiscalYearSchema>;

export function FiscalYearManagement() {
  const { hasRole } = useAuth();
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<FiscalYear | null>(null);
  const [closingYear, setClosingYear] = useState<FiscalYear | null>(null);

  const isAdmin = hasRole(['organization_admin', 'system_admin']);

  const { data: fiscalYears = [], isLoading } = useFiscalYears();
  const createMutation = useCreateFiscalYear();
  const updateMutation = useUpdateFiscalYear();
  const closeMutation = useCloseFiscalYear();

  const form = useForm<FiscalYearFormData>({
    resolver: zodResolver(fiscalYearSchema),
    defaultValues: {
      name: '',
      code: '',
      start_date: '',
      end_date: '',
      period_type: 'monthly',
      is_current: false,
    },
  });

  const handleOpenDialog = (year?: FiscalYear) => {
    if (year) {
      setEditingYear(year);
      form.reset({
        name: year.name,
        code: year.code,
        start_date: year.start_date,
        end_date: year.end_date,
        period_type: year.period_type,
        is_current: year.is_current,
      });
    } else {
      setEditingYear(null);
      const currentYear = new Date().getFullYear();
      form.reset({
        name: `Exercice ${currentYear}`,
        code: `EX${currentYear}`,
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
        period_type: 'monthly',
        is_current: fiscalYears.length === 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingYear(null);
    form.reset();
  };

  const onSubmit = async (data: FiscalYearFormData) => {
    try {
      if (editingYear) {
        await updateMutation.mutateAsync({
          id: editingYear.id,
          name: data.name,
          is_current: data.is_current,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save fiscal year:', error);
    }
  };

  const handleCloseFiscalYear = async () => {
    if (!closingYear) return;
    try {
      await closeMutation.mutateAsync({ id: closingYear.id });
      setClosingYear(null);
    } catch (error) {
      console.error('Failed to close fiscal year:', error);
    }
  };

  const getStatusBadge = (status: FiscalYearStatus, isCurrent: boolean) => {
    if (status === 'closed') {
      return <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> {t('fiscalYears.status.closed', 'Closed')}</Badge>;
    }
    if (isCurrent) {
      return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" /> {t('fiscalYears.status.current', 'Current')}</Badge>;
    }
    return <Badge variant="outline"><Unlock className="h-3 w-3 mr-1" /> {t('fiscalYears.status.open', 'Open')}</Badge>;
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-4 text-yellow-500" />
          {t('fiscalYears.noPermission', 'You do not have permission to manage fiscal years.')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('fiscalYears.title', 'Fiscal Years')}
          </h2>
          <p className="text-muted-foreground">
            {t('fiscalYears.description', 'Manage fiscal years for financial reporting and period closing.')}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('fiscalYears.addNew', 'Add Fiscal Year')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('fiscalYears.listTitle', 'Fiscal Year List')}</CardTitle>
          <CardDescription>
            {t('fiscalYears.listDescription', 'Total: {{count}} fiscal years', { count: fiscalYears.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('fiscalYears.loading', 'Loading fiscal years...')}
            </div>
          ) : fiscalYears.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('fiscalYears.empty', 'No fiscal years yet. Create your first one to get started.')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">{t('fiscalYears.table.code', 'Code')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('fiscalYears.table.name', 'Name')}</th>
                    <th className="text-left py-3 px-4 font-medium hidden md:table-cell">{t('fiscalYears.table.period', 'Period')}</th>
                    <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">{t('fiscalYears.table.periodType', 'Type')}</th>
                    <th className="text-center py-3 px-4 font-medium">{t('fiscalYears.table.status', 'Status')}</th>
                    <th className="text-right py-3 px-4 font-medium">{t('fiscalYears.table.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {fiscalYears.map((year) => (
                    <tr key={year.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{year.code}</code>
                      </td>
                      <td className="py-3 px-4 font-medium">{year.name}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                        {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell capitalize">
                        {year.period_type}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(year.status, year.is_current)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {year.status === 'open' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(year)}
                                title={t('fiscalYears.edit', 'Edit')}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setClosingYear(year)}
                                title={t('fiscalYears.close', 'Close')}
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingYear
                ? t('fiscalYears.edit.title', 'Edit Fiscal Year')
                : t('fiscalYears.create.title', 'Create Fiscal Year')}
            </DialogTitle>
            <DialogDescription>
              {editingYear
                ? t('fiscalYears.edit.description', 'Update the fiscal year details.')
                : t('fiscalYears.create.description', 'Add a new fiscal year for financial reporting.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">{t('fiscalYears.form.code', 'Code')} *</Label>
                <Input
                  id="code"
                  {...form.register('code')}
                  placeholder="EX2025"
                  disabled={!!editingYear}
                />
                {form.formState.errors.code && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="name">{t('fiscalYears.form.name', 'Name')} *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Exercice 2025"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">{t('fiscalYears.form.startDate', 'Start Date')} *</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...form.register('start_date')}
                  disabled={!!editingYear}
                />
              </div>
              <div>
                <Label htmlFor="end_date">{t('fiscalYears.form.endDate', 'End Date')} *</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...form.register('end_date')}
                  disabled={!!editingYear}
                />
              </div>
            </div>

            <div>
              <Label>{t('fiscalYears.form.periodType', 'Period Type')}</Label>
              <Select
                value={form.watch('period_type')}
                onValueChange={(value: 'monthly' | 'quarterly') => form.setValue('period_type', value)}
                disabled={!!editingYear}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t('fiscalYears.form.monthly', 'Monthly')}</SelectItem>
                  <SelectItem value="quarterly">{t('fiscalYears.form.quarterly', 'Quarterly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_current"
                checked={form.watch('is_current')}
                onCheckedChange={(checked) => form.setValue('is_current', checked)}
              />
              <Label htmlFor="is_current" className="cursor-pointer">
                {t('fiscalYears.form.setCurrent', 'Set as current fiscal year')}
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingYear
                  ? t('fiscalYears.form.update', 'Update')
                  : t('fiscalYears.form.create', 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!closingYear} onOpenChange={() => setClosingYear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('fiscalYears.close.title', 'Close Fiscal Year')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'fiscalYears.close.description',
                'Are you sure you want to close fiscal year "{{name}}"? This action cannot be undone. All transactions in this period will be locked.',
                { name: closingYear?.name }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseFiscalYear}>
              {t('fiscalYears.close.confirm', 'Close Fiscal Year')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
