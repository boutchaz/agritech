import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, Building2, Search, Filter, Database as DatabaseIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { seedChartOfAccounts, type SupportedCountry } from '@/lib/seed-chart-of-accounts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAccounts } from '@/hooks/useAccounts';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/types/database.types';

type Account = Database['public']['Tables']['accounts']['Row'];
type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

interface AccountFormData {
  code: string;
  name: string;
  account_type: AccountType;
  account_subtype?: string;
  parent_id?: string | null;
  is_group: boolean;
  is_active: boolean;
  currency_code: string;
  allow_cost_center: boolean;
  description?: string;
}

const getInitialFormData = (orgCurrency: string = 'MAD'): AccountFormData => ({
  code: '',
  name: '',
  account_type: 'Asset',
  account_subtype: '',
  parent_id: null,
  is_group: false,
  is_active: true,
  currency_code: orgCurrency,
  allow_cost_center: true,
  description: '',
});

const accountTypeColors: Record<AccountType, string> = {
  Asset: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Liability: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Equity: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  Revenue: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Expense: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const accountTypeIcons: Record<AccountType, string> = {
  Asset: '💰',
  Liability: '📊',
  Equity: '🏦',
  Revenue: '💵',
  Expense: '💸',
};

export const ChartOfAccounts: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization, user } = useAuth();
  const { data: accounts = [], isLoading, createAccount, updateAccount, deleteAccount } = useAccounts();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>(
    getInitialFormData(currentOrganization?.currency || 'MAD')
  );

  // Build account hierarchy
  const accountHierarchy = useMemo(() => {
    const filteredAccounts = accounts.filter((acc) => {
      const matchesSearch =
        acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || acc.account_type === filterType;
      const matchesActive = showInactive || acc.is_active;
      return matchesSearch && matchesType && matchesActive;
    });

    const rootAccounts = filteredAccounts.filter((acc) => !acc.parent_id);
    const childMap = new Map<string, Account[]>();

    filteredAccounts.forEach((acc) => {
      if (acc.parent_id) {
        if (!childMap.has(acc.parent_id)) {
          childMap.set(acc.parent_id, []);
        }
        const children = childMap.get(acc.parent_id);
        if (children) {
          children.push(acc);
        }
      }
    });

    return { rootAccounts, childMap };
  }, [accounts, searchTerm, filterType, showInactive]);

  const toggleGroup = (accountId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setFormData(getInitialFormData(currentOrganization?.currency || 'MAD'));
    setIsDialogOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      account_type: account.account_type as AccountType,
      account_subtype: account.account_subtype || '',
      parent_id: account.parent_id,
      is_group: account.is_group ?? false,
      is_active: account.is_active ?? true,
      currency_code: currentOrganization?.currency || account.currency_code || 'MAD',
      allow_cost_center: account.allow_cost_center ?? true,
      description: account.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteAccount = (account: Account) => {
    setDeletingAccount(account);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !user) return;

    try {
      if (editingAccount) {
        await updateAccount.mutateAsync({
          id: editingAccount.id,
          ...formData,
        });
      } else {
        await createAccount.mutateAsync(formData);
      }
      setIsDialogOpen(false);
      setFormData(getInitialFormData(currentOrganization?.currency || 'MAD'));
      setEditingAccount(null);
    } catch (error) {
      console.error('Failed to save account:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;

    try {
      await deleteAccount.mutateAsync(deletingAccount.id);
      setIsDeleteDialogOpen(false);
      setDeletingAccount(null);
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleSeedChartOfAccounts = async () => {
    if (!currentOrganization) {
      toast.error('No organization found');
      return;
    }

    setIsSeeding(true);
    try {
      const countryCode: SupportedCountry = 'MAR';
      const currency = (currentOrganization.currency || 'MAD') as 'MAD' | 'EUR' | 'USD' | 'GBP';

      const result = await seedChartOfAccounts(
        currentOrganization.id,
        countryCode,
        currency
      );

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['accounts', currentOrganization.id] });
        toast.success(`Success! ${result.accountsCreated} accounts have been created for your organization.`);
      } else {
        toast.error(`Seeding Failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to seed chart of accounts:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to seed chart of accounts');
    } finally {
      setIsSeeding(false);
    }
  };

  const flattenedAccounts = useMemo(() => {
    const result: Array<{ account: Account; level: number }> = [];

    const walk = (accs: Account[], level: number) => {
      accs.forEach((acc) => {
        result.push({ account: acc, level });
        const children = accountHierarchy.childMap.get(acc.id) || [];
        walk(children, level + 1);
      });
    };

    walk(accountHierarchy.rootAccounts, 0);
    return result;
  }, [accountHierarchy]);

  const renderAccountRow = (account: Account, level: number = 0) => {
    const children = accountHierarchy.childMap.get(account.id) || [];
    const isExpanded = expandedGroups.has(account.id);
    const hasChildren = children.length > 0;

    return (
      <React.Fragment key={account.id}>
        <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800">
          <TableCell style={{ paddingLeft: `${level * 2 + 1}rem` }}>
            <div className="flex items-center gap-2">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleGroup(account.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!hasChildren && <span className="w-6" />}
              <span className="text-sm mr-2">{accountTypeIcons[account.account_type as AccountType]}</span>
              <div className="flex flex-col">
                <span className={`font-medium ${account.is_group ? 'font-bold' : ''}`}>
                  {account.code}
                </span>
                {account.account_subtype && (
                  <span className="text-xs text-gray-500">{account.account_subtype}</span>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell>
            <span className={account.is_group ? 'font-bold' : ''}>{account.name}</span>
          </TableCell>
          <TableCell>
            <Badge className={accountTypeColors[account.account_type as AccountType]}>
              {account.account_type}
            </Badge>
          </TableCell>
          <TableCell className="text-center">
            {currentOrganization?.currency || account.currency_code || 'MAD'}
          </TableCell>
          <TableCell className="text-center">
            {account.is_active ? (
              <Badge className="bg-green-100 text-green-800">{t('accountingModule.accounts.status.active')}</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">{t('accountingModule.accounts.status.inactive')}</Badge>
            )}
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditAccount(account)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteAccount(account)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {isExpanded && children.map((child) => renderAccountRow(child, level + 1))}
      </React.Fragment>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Building2 className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{t('accountingModule.accounts.title')}</span>
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                {t('accountingModule.accounts.subtitleAlt')}
              </CardDescription>
            </div>
            <Button onClick={handleCreateAccount} className="w-full sm:w-auto justify-center flex-shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              {t('accountingModule.accounts.newAccount')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
          {/* Filters */}
          <div className="flex flex-col gap-3 mb-6">
            {/* Search Bar - Full width on mobile */}
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('accountingModule.accounts.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            {/* Type Filter and Show Inactive */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Select value={filterType} onValueChange={(val) => setFilterType(val as AccountType | 'all')}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder={t('accountingModule.accounts.filterByType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('accountingModule.accounts.allTypes')}</SelectItem>
                  <SelectItem value="Asset">{t('accountingModule.accounts.accountTypes.Asset')}</SelectItem>
                  <SelectItem value="Liability">{t('accountingModule.accounts.accountTypes.Liability')}</SelectItem>
                  <SelectItem value="Equity">{t('accountingModule.accounts.accountTypes.Equity')}</SelectItem>
                  <SelectItem value="Revenue">{t('accountingModule.accounts.accountTypes.Revenue')}</SelectItem>
                  <SelectItem value="Expense">{t('accountingModule.accounts.accountTypes.Expense')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  id="showInactive"
                  checked={showInactive}
                  onCheckedChange={(checked) => setShowInactive(checked as boolean)}
                />
                <Label htmlFor="showInactive" className="text-sm cursor-pointer whitespace-nowrap">
                  {t('accountingModule.accounts.showInactive')}
                </Label>
              </div>
            </div>
          </div>

          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accountingModule.accounts.table.code')}</TableHead>
                  <TableHead>{t('accountingModule.accounts.table.name')}</TableHead>
                  <TableHead>{t('accountingModule.accounts.table.type')}</TableHead>
                  <TableHead className="text-center">{t('accountingModule.accounts.table.currency')}</TableHead>
                  <TableHead className="text-center">{t('accountingModule.accounts.table.status')}</TableHead>
                  <TableHead className="text-right">{t('accountingModule.accounts.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountHierarchy.rootAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      {accounts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <DatabaseIcon className="h-16 w-16 text-gray-300" />
                          <div className="space-y-2">
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {t('accountingModule.accounts.empty.title')}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md px-4">
                              {t('accountingModule.accounts.empty.description')}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3 px-4">
                            <Button
                              onClick={handleSeedChartOfAccounts}
                              disabled={isSeeding}
                              size="lg"
                              className="w-full sm:w-auto"
                            >
                              <DatabaseIcon className="h-4 w-4 mr-2" />
                              {isSeeding ? t('accountingModule.accounts.actions.seeding') : t('accountingModule.accounts.actions.seedChart')}
                            </Button>
                            <Button
                              onClick={handleCreateAccount}
                              variant="outline"
                              size="lg"
                              className="w-full sm:w-auto"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t('accountingModule.accounts.actions.createManually')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">
                          {t('accountingModule.accounts.empty.noMatches')}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  accountHierarchy.rootAccounts.map((account) => renderAccountRow(account))
                )}
              </TableBody>
            </Table>
          </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4">
                <DatabaseIcon className="h-16 w-16 text-gray-300" />
                <div className="space-y-2 text-center">
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {t('accountingModule.accounts.empty.title')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('accountingModule.accounts.empty.descriptionShort')}
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <Button
                    onClick={handleSeedChartOfAccounts}
                    disabled={isSeeding}
                    size="lg"
                    className="w-full"
                  >
                    <DatabaseIcon className="h-4 w-4 mr-2" />
                    {isSeeding ? t('accountingModule.accounts.actions.seedingAlt') : t('accountingModule.accounts.actions.seedChartAlt')}
                  </Button>
                  <Button
                    onClick={handleCreateAccount}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('accountingModule.accounts.actions.createManually')}
                  </Button>
                </div>
              </div>
            ) : flattenedAccounts.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>{t('accountingModule.accounts.empty.noMatches')}</p>
              </div>
            ) : (
              flattenedAccounts.map(({ account, level }) => (
                <div
                  key={account.id}
                  className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm"
                  style={{
                    marginLeft: `${level * 16}px`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">
                          {accountTypeIcons[account.account_type as AccountType]}
                        </span>
                        <Badge className={accountTypeColors[account.account_type as AccountType] + ' text-xs'}>
                          {account.account_type}
                        </Badge>
                        <Badge className={account.is_active ? 'bg-green-100 text-green-800 text-xs' : 'bg-gray-100 text-gray-800 text-xs'}>
                          {account.is_active ? t('accountingModule.accounts.status.active') : t('accountingModule.accounts.status.inactive')}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-bold text-base text-gray-900 dark:text-gray-100">
                          {account.code}
                        </p>
                        <p className="font-medium text-sm text-gray-700 dark:text-gray-300">
                          {account.name}
                        </p>
                      </div>
                      {account.account_subtype && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {account.account_subtype}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{t('accountingModule.accounts.form.level', { number: level + 1 })}</span>
                        <span>•</span>
                        <span>{account.currency_code || currentOrganization?.currency || 'MAD'}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {account.is_group ? t('accountingModule.accounts.accountKinds.group') : t('accountingModule.accounts.accountKinds.ledger')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleEditAccount(account)} className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                        onClick={() => handleDeleteAccount(account)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {editingAccount ? t('accountingModule.accounts.form.editTitle') : t('accountingModule.accounts.form.createTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingAccount
                ? t('accountingModule.accounts.form.editDescription')
                : t('accountingModule.accounts.form.createDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">{t('accountingModule.accounts.form.code')}</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder={t('accountingModule.accounts.form.codePlaceholder')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">{t('accountingModule.accounts.form.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('accountingModule.accounts.form.namePlaceholder')}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_type">{t('accountingModule.accounts.form.type')}</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(val) => setFormData({ ...formData, account_type: val as AccountType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asset">{t('accountingModule.accounts.accountTypes.Asset')}</SelectItem>
                    <SelectItem value="Liability">{t('accountingModule.accounts.accountTypes.Liability')}</SelectItem>
                    <SelectItem value="Equity">{t('accountingModule.accounts.accountTypes.Equity')}</SelectItem>
                    <SelectItem value="Revenue">{t('accountingModule.accounts.accountTypes.Revenue')}</SelectItem>
                    <SelectItem value="Expense">{t('accountingModule.accounts.accountTypes.Expense')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="account_subtype">{t('accountingModule.accounts.form.subtype')}</Label>
                <Input
                  id="account_subtype"
                  value={formData.account_subtype}
                  onChange={(e) => setFormData({ ...formData, account_subtype: e.target.value })}
                  placeholder={t('accountingModule.accounts.form.subtypePlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parent_id">{t('accountingModule.accounts.form.parent')}</Label>
                <Select
                  value={formData.parent_id || 'none'}
                  onValueChange={(val) =>
                    setFormData({ ...formData, parent_id: val === 'none' ? null : val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('accountingModule.accounts.parentAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('accountingModule.accounts.parentAccount')}</SelectItem>
                    {accounts
                      .filter((acc) => acc.is_group && acc.id !== editingAccount?.id)
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency_code">{t('accountingModule.accounts.form.currency')}</Label>
                <Select
                  value={formData.currency_code}
                  onValueChange={(val) => setFormData({ ...formData, currency_code: val })}
                  disabled={true}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAD">MAD - Moroccan Dirham</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('accountingModule.accounts.form.currencyHelp')}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="description">{t('accountingModule.accounts.form.description')}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('accountingModule.accounts.descriptionPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="is_group"
                  checked={formData.is_group}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_group: checked as boolean })
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="is_group" className="cursor-pointer text-sm leading-relaxed">
                  {t('accountingModule.accounts.form.isGroup')}
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked as boolean })
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="is_active" className="cursor-pointer text-sm leading-relaxed">
                  {t('accountingModule.accounts.form.isActive')}
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="allow_cost_center"
                  checked={formData.allow_cost_center}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allow_cost_center: checked as boolean })
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="allow_cost_center" className="cursor-pointer text-sm leading-relaxed">
                  {t('accountingModule.accounts.form.allowCostCenter')}
                </Label>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                {t('accountingModule.accounts.form.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createAccount.isPending || updateAccount.isPending}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {editingAccount ? t('accountingModule.accounts.form.update') : t('accountingModule.accounts.form.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{t('accountingModule.accounts.delete.title')}</DialogTitle>
            <DialogDescription className="text-sm">
              {t('accountingModule.accounts.delete.confirmation', { name: deletingAccount?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {t('accountingModule.accounts.form.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteAccount.isPending}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {t('accountingModule.accounts.delete.button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
