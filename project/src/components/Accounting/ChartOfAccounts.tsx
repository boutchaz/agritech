import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, Building2, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/components/MultiTenantAuthProvider';
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
  const { currentOrganization, user } = useAuth();
  const { data: accounts = [], isLoading, createAccount, updateAccount, deleteAccount } = useAccounts();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
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
      is_group: account.is_group,
      is_active: account.is_active,
      currency_code: currentOrganization?.currency || account.currency_code || 'MAD',
      allow_cost_center: account.allow_cost_center,
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
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Chart of Accounts
              </CardTitle>
              <CardDescription>
                Manage your accounting chart of accounts hierarchy
              </CardDescription>
            </div>
            <Button onClick={handleCreateAccount}>
              <Plus className="h-4 w-4 mr-2" />
              New Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search accounts by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(val) => setFilterType(val as AccountType | 'all')}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Asset">Assets</SelectItem>
                <SelectItem value="Liability">Liabilities</SelectItem>
                <SelectItem value="Equity">Equity</SelectItem>
                <SelectItem value="Revenue">Revenue</SelectItem>
                <SelectItem value="Expense">Expenses</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showInactive"
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(checked as boolean)}
              />
              <Label htmlFor="showInactive" className="text-sm cursor-pointer">
                Show Inactive
              </Label>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Currency</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountHierarchy.rootAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      No accounts found. Create your first account to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  accountHierarchy.rootAccounts.map((account) => renderAccountRow(account))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edit Account' : 'Create New Account'}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? 'Update the account details below'
                : 'Add a new account to your chart of accounts'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Account Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., 1000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Cash"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_type">Account Type *</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(val) => setFormData({ ...formData, account_type: val as AccountType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asset">Asset</SelectItem>
                    <SelectItem value="Liability">Liability</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Revenue">Revenue</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="account_subtype">Account Subtype</Label>
                <Input
                  id="account_subtype"
                  value={formData.account_subtype}
                  onChange={(e) => setFormData({ ...formData, account_subtype: e.target.value })}
                  placeholder="e.g., Current Asset"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parent_id">Parent Account</Label>
                <Select
                  value={formData.parent_id || 'none'}
                  onValueChange={(val) =>
                    setFormData({ ...formData, parent_id: val === 'none' ? null : val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Root Account)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root Account)</SelectItem>
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
                <Label htmlFor="currency_code">Currency</Label>
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
                  Currency is set at organization level and cannot be changed per account.
                  To change currency, go to Organization Settings.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_group"
                  checked={formData.is_group}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_group: checked as boolean })
                  }
                />
                <Label htmlFor="is_group" className="cursor-pointer">
                  Group Account (can contain child accounts)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked as boolean })
                  }
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allow_cost_center"
                  checked={formData.allow_cost_center}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allow_cost_center: checked as boolean })
                  }
                />
                <Label htmlFor="allow_cost_center" className="cursor-pointer">
                  Allow Cost Center Tracking
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAccount.isPending || updateAccount.isPending}>
                {editingAccount ? 'Update Account' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the account "{deletingAccount?.name}"? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteAccount.isPending}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
