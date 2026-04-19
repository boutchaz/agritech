import { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, X, Edit2, Trash2, Zap, Droplets, Fuel, Wifi, Phone, Grid, List, Calendar, Upload, FileText, Download, Filter, ChevronUp, ChevronDown, BarChart3, BookOpen } from 'lucide-react';
import { storageApi } from '../lib/api/storage';

// Lazy load heavy dashboard component with charts
const UtilitiesDashboard = lazy(() => import('./UtilitiesDashboard'));
import { accountingApi } from '../lib/accounting-api';
import { utilitiesApi } from '../lib/api/utilities';
import { filesApi } from '../lib/api/files';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Button } from '@/components/ui/button';
import { DialogFooter } from './ui/dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useAuth } from '../hooks/useAuth';
import { useRoleBasedAccess, PermissionGuard } from '../hooks/useRoleBasedAccess';
import { useCurrency } from '../hooks/useCurrency';
import InlineFarmSelector from './InlineFarmSelector';
import { FilterBar, ListPageLayout, ResponsiveList } from '@/components/ui/data-table';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionLoader, ButtonLoader } from '@/components/ui/loader';
import { useTranslation } from 'react-i18next';


interface Utility {
  id: string;
  farm_id: string;
  type: 'electricity' | 'water' | 'diesel' | 'gas' | 'internet' | 'phone' | 'other';
  provider?: string;
  account_number?: string;
  amount: number;
  consumption_value?: number; // New field for consumption amount
  consumption_unit?: string; // New field for consumption unit
  billing_date: string;
  due_date?: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  is_recurring?: boolean;
  recurring_frequency?: 'monthly' | 'quarterly' | 'yearly';
  invoice_url?: string; // New field for invoice attachments
  notes?: string;
  created_at: string;
  updated_at: string;
  journal_entry_id?: string | null;
}

const UTILITY_TYPES = [
  { value: 'electricity', label: 'Électricité', icon: Zap },
  { value: 'water', label: 'Eau', icon: Droplets },
  { value: 'diesel', label: 'Diesel', icon: Fuel },
  { value: 'gas', label: 'Gaz', icon: Fuel },
  { value: 'internet', label: 'Internet', icon: Wifi },
  { value: 'phone', label: 'Téléphone', icon: Phone },
  { value: 'other', label: 'Autre', icon: Plus }
];

// Common consumption units for different utility types
const CONSUMPTION_UNITS: Record<string, string[]> = {
  electricity: ['kWh', 'MWh', 'Wh'],
  water: ['m³', 'L', 'kL'],
  diesel: ['L', 'kL', 'gal'],
  gas: ['m³', 'kg', 'kL'],
  internet: ['GB', 'TB', 'MB'],
  phone: ['min', 'SMS', 'GB'],
  other: ['unit', 'pcs', 'kg', 'L']
};

// No more hardcoded account codes - will be dynamically looked up by account type/subtype

const UtilitiesManagement = () => {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm, user } = useAuth();
  const { hasPermission } = useRoleBasedAccess();
  const { format: formatCurrency, symbol: currency } = useCurrency();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUtility, setEditingUtility] = useState<Utility | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'grouped' | 'list' | 'dashboard'>('grouped');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const accountIdCacheRef = useRef<Record<string, string>>({});
  const canCreateUtility = hasPermission('utilities', 'create');

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilters((prev) => ({
      dateRange: { start: '', end: '' },
      paymentStatus: 'all',
      utilityType: 'all',
      isRecurring: 'all',
      showFilters: prev.showFilters,
    }));
    setSortBy('billing_date');
    setSortOrder('desc');
  }, []);

  // Advanced filtering state
  const [filters, setFilters] = useState({
    dateRange: {
      start: '',
      end: ''
    },
    paymentStatus: 'all' as 'all' | 'pending' | 'paid' | 'overdue',
    utilityType: 'all' as string,
    isRecurring: 'all' as 'all' | 'recurring' | 'non-recurring',
    showFilters: false
  });
  const [sortBy, setSortBy] = useState<'billing_date' | 'amount' | 'type'>('billing_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [newUtility, setNewUtility] = useState<Partial<Utility>>({
    type: 'electricity',
    amount: 0,
    consumption_value: undefined,
    consumption_unit: '',
    billing_date: new Date().toISOString().split('T')[0],
    payment_status: 'pending',
    is_recurring: false,
    recurring_frequency: 'monthly',
    notes: ''
  });

  /**
   * Get account ID by account type and subtype (dynamic lookup)
   * @param accountType - The account type (e.g., 'Expense', 'Asset', 'Liability')
   * @param accountSubtype - Optional subtype (e.g., 'Utilities', 'Cash', 'Accounts Payable')
   */
  const getAccountByType = useCallback(async (
    accountType: string,
    accountSubtype?: string
  ): Promise<string> => {
    if (!currentOrganization?.id || !currentFarm?.id) {
      throw new Error('Aucune organisation active pour résoudre les comptes comptables.');
    }

    const cacheKey = `${currentOrganization.id}:${accountType}:${accountSubtype || 'none'}`;
    const cached = accountIdCacheRef.current[cacheKey];
    if (cached) {
      return cached;
    }

    try {
      const account = await utilitiesApi.getAccountByType(
        currentOrganization.id,
        currentFarm.id,
        accountType,
        accountSubtype
      );

      accountIdCacheRef.current[cacheKey] = account.id;
      return account.id;
    } catch (_error) {
      const subtypeMsg = accountSubtype ? ` (${accountSubtype})` : '';
      throw new Error(
        t('utilities.accountNotFoundError', {
          accountType,
          subtypeMsg,
        })
      );
    }
  }, [currentOrganization?.id, currentFarm?.id, t]);

  // Helper function to calculate unit cost
  const calculateUnitCost = useCallback((amount: number, consumptionValue?: number): string => {
    if (!consumptionValue || consumptionValue === 0) return '';
    return (amount / consumptionValue).toFixed(4);
  }, []);

  // Helper function to get available units for utility type
  const getAvailableUnits = (type: string): string[] => {
    return CONSUMPTION_UNITS[type] || CONSUMPTION_UNITS.other;
  };

  const getUtilityLabel = useCallback((type: string) => {
    return t(`utilities.utilityTypes.${type}`, UTILITY_TYPES.find((ut) => ut.value === type)?.label || type);
  }, [t]);

   // Helper function to upload invoice file
   const uploadInvoiceFile = async (file: File): Promise<{ url: string; path: string } | null> => {
      try {
        if (!currentOrganization?.id) return null;

        const fileExt = file.name.split('.').pop();
        const fileName = `${currentOrganization.id}/invoices/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { publicUrl } = await storageApi.upload('invoices', fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

        return { url: publicUrl, path: fileName };
      } catch (error) {
        console.error('Error uploading file:', error);
        return null;
      }
   };

  // Helper function to download invoice file
  const downloadInvoice = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'invoice.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  // Filter and sort utilities
  const filteredAndSortedUtilities = useMemo(() => {
    let filtered = [...utilities];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    // Apply date range filter
    if (filters.dateRange.start) {
      filtered = filtered.filter(u => new Date(u.billing_date) >= new Date(filters.dateRange.start));
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(u => new Date(u.billing_date) <= new Date(filters.dateRange.end));
    }

    // Apply payment status filter
    if (filters.paymentStatus !== 'all') {
      filtered = filtered.filter(u => u.payment_status === filters.paymentStatus);
    }

    // Apply utility type filter
    if (filters.utilityType !== 'all') {
      filtered = filtered.filter(u => u.type === filters.utilityType);
    }

    // Apply recurring filter
    if (filters.isRecurring !== 'all') {
      filtered = filtered.filter(u =>
        filters.isRecurring === 'recurring' ? u.is_recurring : !u.is_recurring
      );
    }

    if (normalizedSearch) {
      filtered = filtered.filter((utility) => {
        const searchableFields = [
          utility.type,
          getUtilityLabel(utility.type),
          utility.provider,
          utility.account_number,
          utility.notes,
          utility.payment_status,
          utility.billing_date,
          utility.consumption_unit,
          utility.recurring_frequency,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableFields.includes(normalizedSearch)
          || utility.amount.toString().includes(normalizedSearch)
          || utility.consumption_value?.toString().includes(normalizedSearch)
          || new Date(utility.billing_date).toLocaleDateString('fr-FR').toLowerCase().includes(normalizedSearch);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'billing_date':
          comparison = new Date(a.billing_date).getTime() - new Date(b.billing_date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [utilities, filters, sortBy, sortOrder, searchTerm, getUtilityLabel]);

  // Group filtered utilities by type
  const groupedUtilities = useMemo(() => {
    const groups: Record<string, Utility[]> = {};
    filteredAndSortedUtilities.forEach(utility => {
      if (!groups[utility.type]) {
        groups[utility.type] = [];
      }
      groups[utility.type].push(utility);
    });
    return groups;
  }, [filteredAndSortedUtilities]);

  // Calculate totals from filtered utilities
  const totals = useMemo(() => {
    const totalAmount = filteredAndSortedUtilities.reduce((sum, utility) => sum + utility.amount, 0);
    const recurringAmount = filteredAndSortedUtilities
      .filter(u => u.is_recurring)
      .reduce((sum, utility) => sum + utility.amount, 0);
    const pendingAmount = filteredAndSortedUtilities
      .filter(u => u.payment_status === 'pending')
      .reduce((sum, utility) => sum + utility.amount, 0);

    return {
      total: totalAmount,
      recurring: recurringAmount,
      pending: pendingAmount,
      count: filteredAndSortedUtilities.length
    };
  }, [filteredAndSortedUtilities]);

  const groupedUtilityEntries = useMemo(() => (
    Object.entries(groupedUtilities).map(([type, typeUtilities]) => ({
      type,
      utilities: typeUtilities,
      total: typeUtilities.reduce((sum, utility) => sum + utility.amount, 0),
      recurringCount: typeUtilities.filter((utility) => utility.is_recurring).length,
    }))
  ), [groupedUtilities]);

  const hasActiveFilters = useMemo(() => (
    Boolean(
      searchTerm.trim()
      || filters.dateRange.start
      || filters.dateRange.end
      || filters.paymentStatus !== 'all'
      || filters.utilityType !== 'all'
      || filters.isRecurring !== 'all'
    )
  ), [searchTerm, filters]);

  const syncUtilityJournalEntry = useCallback(async (utility: Utility) => {
    if (!currentOrganization?.id || !user?.id) {
      return utility.journal_entry_id ?? null;
    }

    const amountValue = Number(utility.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return utility.journal_entry_id ?? null;
    }

    const entryDate = utility.billing_date ? new Date(utility.billing_date) : new Date();
    const paymentStatus = utility.payment_status ?? 'pending';

    // Dynamic account lookup by type/subtype instead of hardcoded codes
    // Note: We look for utilities by Operating Expenses
    let debitAccountId: string;
    try {
      // Try to find an Operating Expense account
      debitAccountId = await getAccountByType('Expense', 'Operating Expense');
    } catch {
      debitAccountId = await getAccountByType('Expense');
    }

    const creditAccountId = paymentStatus === 'paid'
      ? await getAccountByType('Asset', 'Cash') // Paid utilities: Credit Cash account
      : await getAccountByType('Liability', 'Payable'); // Pending utilities: Credit Accounts Payable

    const basePayload = {
      entry_date: entryDate,
      reference_type: 'utilities',
      reference_id: utility.id,
      remarks: utility.notes || `Utility expense (${getUtilityLabel(utility.type)})`,
      items: [
        {
          account_id: debitAccountId,
          debit: amountValue,
          credit: 0,
          farm_id: utility.farm_id,
          description: `Utility expense - ${getUtilityLabel(utility.type)}`,
        },
        {
          account_id: creditAccountId,
          debit: 0,
          credit: amountValue,
          farm_id: utility.farm_id,
          description: paymentStatus === 'paid'
            ? 'Utility paid in cash'
            : 'Utility payable',
        },
      ],
    };

    if (utility.journal_entry_id) {
      await accountingApi.updateJournalEntry({
        id: utility.journal_entry_id,
        ...basePayload,
      });

      if (user?.id) {
        try {
          await accountingApi.postJournalEntry(utility.journal_entry_id, user.id);
        } catch (postError) {
          console.error('Error posting journal entry:', postError);
        }
      }
      return utility.journal_entry_id;
    }

    const entry = await accountingApi.createJournalEntry(
      basePayload,
      currentOrganization.id,
      user.id
    );

    if (user?.id) {
      try {
        await accountingApi.postJournalEntry(entry.id, user.id);
      } catch (postError) {
        console.error('Error posting journal entry:', postError);
      }
    }
    return entry.id;
  }, [currentOrganization?.id, user?.id, getAccountByType, getUtilityLabel]);

  // Prepare chart data
  const chartData = useMemo(() => {
    // Monthly trend data (last 12 months)
    const monthlyData: Record<string, { month: string; amount: number; count: number }> = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    filteredAndSortedUtilities
      .filter(u => new Date(u.billing_date) >= sixMonthsAgo)
      .forEach(utility => {
        const date = new Date(utility.billing_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthLabel, amount: 0, count: 0 };
        }
        monthlyData[monthKey].amount += utility.amount;
        monthlyData[monthKey].count += 1;
      });

    const monthlyTrend = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Cost breakdown by type
    const typeBreakdown: Record<string, { type: string; amount: number; count: number; label: string }> = {};
    filteredAndSortedUtilities.forEach(utility => {
      if (!typeBreakdown[utility.type]) {
        typeBreakdown[utility.type] = {
          type: utility.type,
          amount: 0,
          count: 0,
          label: getUtilityLabel(utility.type)
        };
      }
      typeBreakdown[utility.type].amount += utility.amount;
      typeBreakdown[utility.type].count += 1;
    });

    const costByType = Object.values(typeBreakdown);

    // Consumption analysis (only for utilities with consumption data)
    const consumptionData = filteredAndSortedUtilities
      .filter(u => u.consumption_value && u.consumption_value > 0)
      .map(utility => ({
        name: `${getUtilityLabel(utility.type)} - ${new Date(utility.billing_date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}`,
        amount: utility.amount,
        consumption: utility.consumption_value ?? 0,
        unitCost: parseFloat(calculateUnitCost(utility.amount, utility.consumption_value)),
        unit: utility.consumption_unit || '',
        type: utility.type
      }))
      .slice(0, 10); // Show latest 10 entries

    return {
      monthlyTrend,
      costByType,
      consumptionData
    };
  }, [filteredAndSortedUtilities, getUtilityLabel, calculateUnitCost]);

  const fetchUtilities = useCallback(async () => {
    try {
      if (!currentFarm?.id || !currentOrganization?.id) {
        setUtilities([]);
        setLoading(false);
        return;
      }

      const data = await utilitiesApi.getAll(currentOrganization.id, currentFarm.id);
      setUtilities(data || []);
    } catch (error) {
      console.error('Error fetching utilities:', error);
      setError('Failed to fetch utilities');
    } finally {
      setLoading(false);
    }
  }, [currentFarm?.id, currentOrganization?.id]);

  useEffect(() => {
    fetchUtilities();
  }, [fetchUtilities]);

  const handleAddUtility = async () => {
    try {
      if (!currentFarm?.id || !currentOrganization?.id) {
        setError(t('utilities.selectFarmToAddCharge', 'Sélectionnez une ferme pour ajouter une charge.'));
        return;
      }

      setError(null);
      setUploading(true);
      let invoiceUrl: string | null = null;
      let invoiceFilePath: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await uploadInvoiceFile(selectedFile);
        if (!uploadResult) {
          setError(t('utilities.fileUploadError', 'Erreur lors du téléchargement du fichier'));
          setUploading(false);
          return;
        }
        invoiceUrl = uploadResult.url;
        invoiceFilePath = uploadResult.path;
      }

      const createdUtility = await utilitiesApi.create(currentOrganization.id, {
        ...newUtility,
        journal_entry_id: undefined,
        farm_id: currentFarm.id,
        invoice_url: invoiceUrl ?? undefined,
        type: newUtility.type as Utility['type'],
        payment_status: newUtility.payment_status as Utility['payment_status'],
        amount: newUtility.amount || 0,
        billing_date: newUtility.billing_date || new Date().toISOString().split('T')[0],
      });

      // Register file in file_registry with entity_id now that we have the utility ID
      if (selectedFile && invoiceFilePath) {
        try {
          await filesApi.register({
            bucket_name: 'invoices',
            file_path: invoiceFilePath,
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            mime_type: selectedFile.type,
            entity_type: 'utility',
            entity_id: createdUtility.id,
            field_name: 'invoice_url',
          }, currentOrganization.id);
        } catch (regError) {
          console.error('Failed to register file in registry:', regError);
          // Don't fail the entire operation if registration fails
        }
      }

      let finalUtility = createdUtility;
      try {
        const journalEntryId = await syncUtilityJournalEntry({
          ...createdUtility,
          journal_entry_id: createdUtility.journal_entry_id ?? null,
        });

        if (journalEntryId && journalEntryId !== createdUtility.journal_entry_id) {
          finalUtility = await utilitiesApi.update(currentOrganization.id, currentFarm.id, createdUtility.id, {
            journal_entry_id: journalEntryId
          });
        }
      } catch (journalError) {
        console.error('Error creating journal entry for utility:', journalError);
        const errorMessage = journalError instanceof Error
          ? journalError.message
          : 'Erreur inconnue';

        // Check if it's a missing account error
        if (errorMessage.includes('introuvable') || errorMessage.includes('not found')) {
          setError(
          t('utilities.journalEntryMissingAccountHelp', {
            errorMessage,
          })
          );
        } else {
          setError(
            t('utilities.journalEntryCreatedWithError', {
              errorMessage,
            })
          );
        }
      }

      setUtilities([finalUtility, ...utilities]);
      setShowAddModal(false);
      setSelectedFile(null);
      setNewUtility({
        type: 'electricity',
        amount: 0,
        consumption_value: undefined,
        consumption_unit: '',
        billing_date: new Date().toISOString().split('T')[0],
        payment_status: 'pending',
        is_recurring: false,
        recurring_frequency: 'monthly',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding utility:', error);
      setError('Failed to add utility');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateUtility = async () => {
    if (!editingUtility) return;

    try {
      if (!currentFarm?.id || !currentOrganization?.id) {
        setError(t('utilities.selectFarmToEditCharge', 'Sélectionnez une ferme pour modifier une charge.'));
        return;
      }
      setError(null);

      let updatedUtility = await utilitiesApi.update(
        currentOrganization.id,
        currentFarm.id,
        editingUtility.id,
        {
          ...editingUtility,
          journal_entry_id: editingUtility.journal_entry_id ?? undefined,
        }
      );

      try {
        const journalEntryId = await syncUtilityJournalEntry(updatedUtility);
        if (journalEntryId && journalEntryId !== updatedUtility.journal_entry_id) {
          updatedUtility = await utilitiesApi.update(
            currentOrganization.id,
            currentFarm.id,
            updatedUtility.id,
            { journal_entry_id: journalEntryId }
          );
        }
      } catch (journalError) {
        console.error('Error updating journal entry for utility:', journalError);
        setError('Charge mise à jour, mais l\'écriture comptable n\'a pas été synchronisée.');
      }

      setUtilities(utilities.map(util =>
        util.id === updatedUtility.id ? updatedUtility : util
      ));
      setEditingUtility(null);
    } catch (error) {
      console.error('Error updating utility:', error);
      setError('Failed to update utility');
    }
  };

  const handleDeleteUtility = async (id: string) => {
    showConfirm('Êtes-vous sûr de vouloir supprimer cette charge ?', async () => {
      const utilityToDelete = utilities.find(util => util.id === id);

      try {
        if (!currentFarm?.id || !currentOrganization?.id) {
          setError('Sélectionnez une ferme pour supprimer une charge.');
          return;
        }
        setError(null);

        await utilitiesApi.delete(currentOrganization.id, currentFarm.id, id);

        if (utilityToDelete?.journal_entry_id) {
          try {
            await accountingApi.deleteJournalEntry(utilityToDelete.journal_entry_id);
          } catch (journalError) {
            console.error('Error deleting journal entry for utility:', journalError);
          }
        }

        setUtilities(utilities.filter(util => util.id !== id));
      } catch (error) {
        console.error('Error deleting utility:', error);
        setError('Failed to delete utility');
      }
    }, {variant: "destructive"});
  };

  const getUtilityIcon = (type: string) => {
    const utilityType = UTILITY_TYPES.find(ut => ut.value === type);
    const Icon = utilityType?.icon || Plus;
    return <Icon className="h-6 w-6" />;
  };
  const getUtilityColorClasses = (type: Utility['type']) => (
    type === 'electricity' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
    type === 'water' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
    type === 'diesel' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
    type === 'gas' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
    type === 'internet' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
    type === 'phone' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
    'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
  );

  const getPaymentStatusLabel = (status: Utility['payment_status']) => (
    status === 'paid'
      ? t('utilitiesManagement.paymentStatus.paid', 'Paid')
      : status === 'pending'
        ? t('utilitiesManagement.paymentStatus.pending', 'Pending')
        : t('utilitiesManagement.paymentStatus.overdue', 'Overdue')
  );

  const getPaymentStatusClasses = (status: Utility['payment_status']) => (
    status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
    status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  );

  const emptyAction = !currentFarm?.id
    ? undefined
    : hasActiveFilters
      ? { label: t('utilitiesManagement.actions.resetFilters', 'Reset filters'), onClick: resetFilters, variant: 'outline' as const }
      : canCreateUtility
        ? { label: t('utilitiesManagement.actions.addUtility', 'Add utility expense'), onClick: () => setShowAddModal(true) }
        : undefined;

  const emptyTitle = hasActiveFilters ? t('utilitiesManagement.empty.noResultsTitle', 'No results found') : t('utilitiesManagement.empty.noUtilitiesTitle', 'No utility expenses');
  const emptyMessage = hasActiveFilters
    ? t('utilitiesManagement.empty.noResultsMessage', 'No expense matches the selected filters. Try changing your search criteria.')
    : t('utilitiesManagement.empty.noUtilitiesMessage', 'Start by adding your first utility expenses (electricity, water, etc.).');

  const renderUtilityActions = (utility: Utility) => (
    <div className="flex items-center justify-end gap-2">
      {utility.invoice_url && (
        <Button
          onClick={() => downloadInvoice(utility.invoice_url!, `facture-${utility.type}-${utility.billing_date}.pdf`)}
          className="text-blue-400 hover:text-blue-500"
          title={t('utilitiesManagement.actions.downloadInvoice', 'Download invoice')}
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
      <PermissionGuard resource="utilities" action="update">
        <Button onClick={() => setEditingUtility(utility)} className="text-gray-400 hover:text-gray-500">
          <Edit2 className="h-4 w-4" />
        </Button>
      </PermissionGuard>
      <PermissionGuard resource="utilities" action="delete">
        <Button onClick={() => handleDeleteUtility(utility.id)} className="text-gray-400 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </Button>
      </PermissionGuard>
    </div>
  );

  return (
    <>
      <ListPageLayout
      header={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('utilitiesManagement.title', 'Fixed utility expenses')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('utilitiesManagement.subtitle', 'Track utility expenses, consumption, and related accounting entries.')}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => navigate({ to: '/accounting/journal' })}
                  className="flex items-center space-x-2 border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>{t('utilitiesManagement.actions.accountingJournal', 'Accounting journal')}</span>
                </Button>

                <Button
                  onClick={() => setShowAddModal(true)}
                  disabled={!currentFarm?.id}
                  variant={currentFarm?.id ? 'green' : undefined}
                  className={!currentFarm?.id ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : ''}
                  title={!currentFarm?.id ? t('utilitiesManagement.actions.selectFarmToAdd', 'Select a farm to add an expense') : undefined}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('utilitiesManagement.actions.newUtility', 'New expense')}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                  <Button onClick={() => setViewMode('grouped')} className={`p-2 ${viewMode === 'grouped' ? 'bg-white shadow-sm dark:bg-gray-600' : ''}`} title={t('utilitiesManagement.views.grouped', 'Grouped view')}><Grid className="h-4 w-4" /></Button>
                  <Button onClick={() => setViewMode('cards')} className={`p-2 ${viewMode === 'cards' ? 'bg-white shadow-sm dark:bg-gray-600' : ''}`} title={t('utilitiesManagement.views.cards', 'Card view')}><List className="h-4 w-4" /></Button>
                  <Button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-white shadow-sm dark:bg-gray-600' : ''}`} title={t('utilitiesManagement.views.list', 'List view')}><Calendar className="h-4 w-4" /></Button>
                  <Button onClick={() => setViewMode('dashboard')} className={`p-2 ${viewMode === 'dashboard' ? 'bg-white shadow-sm dark:bg-gray-600' : ''}`} title={t('utilitiesManagement.views.dashboard', 'Dashboard view')}><BarChart3 className="h-4 w-4" /></Button>
                </div>

                <Button
                  onClick={() => setFilters((prev) => ({ ...prev, showFilters: !prev.showFilters }))}
                  className={`flex items-center gap-2 border px-3 py-2 ${filters.showFilters ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
                  title={t('utilitiesManagement.actions.advancedFilters', 'Advanced filters')}
                >
                  <Filter className="h-4 w-4" />
                  <span className="text-sm">{t('utilitiesManagement.actions.filters', 'Filters')}</span>
                  {filters.showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
      filters={
        <div className="space-y-4">
          <FilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={t('utilitiesManagement.placeholders.search', 'Search by type, amount, note, or date...')}
            filters={[
              {
                key: 'paymentStatus',
                value: filters.paymentStatus,
                onChange: (value) => setFilters((prev) => ({ ...prev, paymentStatus: value as typeof prev.paymentStatus })),
                options: [
                  { value: 'all', label: t('utilitiesManagement.filters.allStatuses', 'All statuses') },
                  { value: 'pending', label: t('utilitiesManagement.paymentStatus.pending', 'Pending') },
                  { value: 'paid', label: t('utilitiesManagement.paymentStatus.paid', 'Paid') },
                  { value: 'overdue', label: t('utilitiesManagement.paymentStatus.overdue', 'Overdue') },
                ],
              },
              {
                key: 'utilityType',
                value: filters.utilityType,
                onChange: (value) => setFilters((prev) => ({ ...prev, utilityType: value })),
                options: [
                  { value: 'all', label: t('utilitiesManagement.filters.allTypes', 'All types') },
                  ...UTILITY_TYPES.map((type) => ({ value: type.value, label: type.label })),
                ],
              },
              {
                key: 'isRecurring',
                value: filters.isRecurring,
                onChange: (value) => setFilters((prev) => ({ ...prev, isRecurring: value as typeof prev.isRecurring })),
                options: [
                  { value: 'all', label: t('utilitiesManagement.filters.allRecurring', 'All') },
                  { value: 'recurring', label: t('utilitiesManagement.filters.recurring', 'Recurring') },
                  { value: 'non-recurring', label: t('utilitiesManagement.filters.nonRecurring', 'Non-recurring') },
                ],
              },
            ]}
            onClear={resetFilters}
          />

          {filters.showFilters && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="utility-start-date" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('utilitiesManagement.filters.startDate', 'Start date')}</label>
                  <Input
                    id="utility-start-date"
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, start: e.target.value } }))}
                  />
                </div>
                <div>
                  <label htmlFor="utility-end-date" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('utilitiesManagement.filters.endDate', 'End date')}</label>
                  <Input
                    id="utility-end-date"
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, end: e.target.value } }))}
                  />
                </div>
                <div>
                  <label htmlFor="utility-sort-by" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('utilitiesManagement.filters.sortBy', 'Sort by')}</label>
                  <Select id="utility-sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                    <option value="billing_date">{t('utilitiesManagement.columns.date', 'Date')}</option>
                    <option value="amount">{t('utilitiesManagement.columns.amount', 'Amount')}</option>
                    <option value="type">{t('utilitiesManagement.columns.type', 'Type')}</option>
                  </Select>
                </div>
                <div>
                  <label htmlFor="utility-sort-order" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('utilitiesManagement.filters.order', 'Order')}</label>
                  <Select id="utility-sort-order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}>
                    <option value="desc">{t('utilitiesManagement.filters.descending', 'Descending')}</option>
                    <option value="asc">{t('utilitiesManagement.filters.ascending', 'Ascending')}</option>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      }
      stats={
        !loading && utilities.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"><div className="flex items-center"><div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20"><Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" /></div><div className="ml-3"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('utilitiesManagement.stats.totalExpenses', 'Total expenses')}</p><p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.total)}</p></div></div></div>
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"><div className="flex items-center"><div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/20"><Calendar className="h-6 w-6 text-green-600 dark:text-green-400" /></div><div className="ml-3"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('utilitiesManagement.stats.recurringExpenses', 'Recurring expenses')}</p><p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.recurring)}</p></div></div></div>
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"><div className="flex items-center"><div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/20"><Edit2 className="h-6 w-6 text-yellow-600 dark:text-yellow-400" /></div><div className="ml-3"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('utilitiesManagement.stats.pending', 'Pending')}</p><p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.pending)}</p></div></div></div>
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"><div className="flex items-center"><div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/20"><List className="h-6 w-6 text-purple-600 dark:text-purple-400" /></div><div className="ml-3"><p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('utilitiesManagement.stats.totalCount', 'Total count')}</p><p className="text-lg font-semibold text-gray-900 dark:text-white">{totals.count}</p></div></div></div>
          </div>
        ) : undefined
      }
    >
      <InlineFarmSelector message={t('utilitiesManagement.selectFarmMessage', 'Select a farm to manage utility expenses.')} />

      {error && (
        <div className={`rounded-lg border p-4 ${error.includes('✓') ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20' : 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20'}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className={`text-sm whitespace-pre-line ${error.includes('✓') ? 'text-yellow-800 dark:text-yellow-300' : 'text-red-600 dark:text-red-400'}`}>{error}</p>
              {error.includes('plan comptable') && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => navigate({ to: '/accounting/accounts' })} className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-400">
                    <BookOpen className="mr-2 h-4 w-4" />
                    {t('utilitiesManagement.actions.openChartOfAccounts', 'Open chart of accounts')}
                  </Button>
                </div>
              )}
            </div>
            <Button onClick={() => setError(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-5 w-5" /></Button>
          </div>
        </div>
      )}

      {!currentFarm?.id ? null : viewMode === 'grouped' ? (
        loading && groupedUtilityEntries.length === 0 ? (
          <ResponsiveList
            items={[]}
            isLoading
            keyExtractor={() => ''}
            renderCard={() => null}
            renderTable={() => null}
            emptyIcon={Zap}
            emptyMessage={emptyMessage}
          />
        ) : groupedUtilityEntries.length === 0 ? (
          <ResponsiveList
            items={[]}
            keyExtractor={() => ''}
            renderCard={() => null}
            renderTable={() => null}
            emptyIcon={hasActiveFilters ? Filter : Zap}
            emptyTitle={emptyTitle}
            emptyMessage={emptyMessage}
            emptyAction={emptyAction}
          />
        ) : (
          <div className="space-y-6">
            {groupedUtilityEntries.map((group) => (
              <div key={group.type} className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${getUtilityColorClasses(group.type as Utility['type'])}`}>{getUtilityIcon(group.type)}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{getUtilityLabel(group.type)}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{group.utilities.length} entrée{group.utilities.length !== 1 ? 's' : ''}{group.recurringCount > 0 ? ` • ${group.recurringCount} récurrente${group.recurringCount !== 1 ? 's' : ''}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(group.total)}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <ResponsiveList
                    items={group.utilities}
                    keyExtractor={(utility) => utility.id}
                    renderCard={(utility) => (
                      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(utility.amount)}</span>
                              {utility.is_recurring && <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400"><Calendar className="mr-1 h-3 w-3" />Récurrent</span>}
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPaymentStatusClasses(utility.payment_status)}`}>{getPaymentStatusLabel(utility.payment_status)}</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(utility.billing_date).toLocaleDateString('fr-FR')}{utility.consumption_value && utility.consumption_value > 0 ? ` • ${utility.consumption_value} ${utility.consumption_unit}` : ''}{utility.consumption_value && utility.consumption_value > 0 ? ` • ${calculateUnitCost(utility.amount, utility.consumption_value)} ${currency}/${utility.consumption_unit}` : ''}{utility.notes ? ` • ${utility.notes}` : ''}</p>
                          </div>
                          {renderUtilityActions(utility)}
                        </div>
                      </div>
                    )}
                    renderTableHeader={
                      <TableRow>
                        <TableHead className="px-6 py-3">Montant</TableHead>
                        <TableHead className="px-6 py-3">Détails</TableHead>
                        <TableHead className="px-6 py-3">Statut</TableHead>
                        <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                      </TableRow>
                    }
                    renderTable={(utility) => (
                      <>
                        <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatCurrency(utility.amount)}</TableCell>
                        <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(utility.billing_date).toLocaleDateString('fr-FR')}{utility.consumption_value && utility.consumption_value > 0 ? <div className="text-xs text-blue-600 dark:text-blue-400">{utility.consumption_value} {utility.consumption_unit} • {calculateUnitCost(utility.amount, utility.consumption_value)} {currency}/{utility.consumption_unit}</div> : null}{utility.notes ? <div className="text-xs text-gray-500 dark:text-gray-400">{utility.notes}</div> : null}</TableCell>
                        <TableCell className="px-6 py-4"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPaymentStatusClasses(utility.payment_status)}`}>{getPaymentStatusLabel(utility.payment_status)}</span></TableCell>
                        <TableCell className="px-6 py-4">{renderUtilityActions(utility)}</TableCell>
                      </>
                    )}
                    emptyIcon={Zap}
                    emptyMessage={emptyMessage}
                  />
                </div>
              </div>
            ))}
          </div>
        )
      ) : viewMode === 'cards' ? (
        <ResponsiveList
          items={filteredAndSortedUtilities}
          isLoading={loading}
          keyExtractor={(utility) => utility.id}
          renderCard={(utility) => (
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${getUtilityColorClasses(utility.type)}`}>{getUtilityIcon(utility.type)}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{getUtilityLabel(utility.type)}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(utility.billing_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                {renderUtilityActions(utility)}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-gray-600 dark:text-gray-400">Montant</span><span className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(utility.amount)}</span></div>
                {utility.consumption_value && utility.consumption_value > 0 ? <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-500">Consommation</span><span className="text-sm text-gray-700 dark:text-gray-300">{utility.consumption_value} {utility.consumption_unit}</span></div> : null}
                {utility.consumption_value && utility.consumption_value > 0 ? <div className="rounded bg-blue-50 p-2 dark:bg-blue-900/20"><div className="flex items-center justify-between"><span className="text-sm font-medium text-blue-700 dark:text-blue-400">Coût unitaire</span><span className="font-semibold text-blue-800 dark:text-blue-300">{calculateUnitCost(utility.amount, utility.consumption_value)} {currency}/{utility.consumption_unit}</span></div></div> : null}
                <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-500">Statut</span><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPaymentStatusClasses(utility.payment_status)}`}>{getPaymentStatusLabel(utility.payment_status)}</span></div>
                {utility.is_recurring ? <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-green-600 dark:text-green-400" /><span className="text-sm text-green-600 dark:text-green-400">Récurrent ({utility.recurring_frequency})</span></div> : null}
                {utility.notes ? <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{utility.notes}</p> : null}
                {utility.invoice_url ? <div className="mt-2 flex items-center gap-2"><FileText className="h-4 w-4 text-green-600 dark:text-green-400" /><span className="text-sm text-gray-600 dark:text-gray-300">Facture attachée</span></div> : null}
              </div>
            </div>
          )}
          renderTableHeader={<TableRow><TableHead className="px-6 py-3">Type</TableHead><TableHead className="px-6 py-3">Montant</TableHead><TableHead className="px-6 py-3">Consommation</TableHead><TableHead className="px-6 py-3">Statut</TableHead><TableHead className="px-6 py-3 text-right">Actions</TableHead></TableRow>}
          renderTable={(utility) => (
            <>
              <TableCell className="px-6 py-4"><div className="flex items-center gap-3"><div className={`rounded-lg p-2 ${getUtilityColorClasses(utility.type)}`}>{getUtilityIcon(utility.type)}</div><div><div className="font-medium text-gray-900 dark:text-white">{getUtilityLabel(utility.type)}</div><div className="text-xs text-gray-500 dark:text-gray-400">{new Date(utility.billing_date).toLocaleDateString('fr-FR')}</div></div></div></TableCell>
              <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatCurrency(utility.amount)}</TableCell>
              <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{utility.consumption_value && utility.consumption_value > 0 ? <div><div>{utility.consumption_value} {utility.consumption_unit}</div><div className="text-xs text-blue-600 dark:text-blue-400">{calculateUnitCost(utility.amount, utility.consumption_value)} {currency}/{utility.consumption_unit}</div></div> : '-'}</TableCell>
              <TableCell className="px-6 py-4"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPaymentStatusClasses(utility.payment_status)}`}>{getPaymentStatusLabel(utility.payment_status)}</span></TableCell>
              <TableCell className="px-6 py-4">{renderUtilityActions(utility)}</TableCell>
            </>
          )}
          emptyIcon={hasActiveFilters ? Filter : Zap}
          emptyTitle={emptyTitle}
          emptyMessage={emptyMessage}
          emptyAction={emptyAction}
        />
      ) : viewMode === 'list' ? (
        <ResponsiveList
          items={filteredAndSortedUtilities}
          isLoading={loading}
          keyExtractor={(utility) => utility.id}
          renderCard={(utility) => (
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className={`rounded-lg p-2 ${getUtilityColorClasses(utility.type)}`}>{getUtilityIcon(utility.type)}</div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-gray-900 dark:text-white">{getUtilityLabel(utility.type)}</span>{utility.is_recurring ? <span className="text-xs text-green-600 dark:text-green-400">Récurrent ({utility.recurring_frequency})</span> : null}</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(utility.amount)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{new Date(utility.billing_date).toLocaleDateString('fr-FR')}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{utility.consumption_value && utility.consumption_value > 0 ? `${utility.consumption_value} ${utility.consumption_unit} • ${calculateUnitCost(utility.amount, utility.consumption_value)} ${currency}/${utility.consumption_unit}` : 'Aucune consommation renseignée'}</div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPaymentStatusClasses(utility.payment_status)}`}>{getPaymentStatusLabel(utility.payment_status)}</span>
                  </div>
                </div>
                {renderUtilityActions(utility)}
              </div>
            </div>
          )}
          renderTableHeader={<TableRow><TableHead className="px-6 py-3">Type</TableHead><TableHead className="px-6 py-3">Montant</TableHead><TableHead className="px-6 py-3">Consommation</TableHead><TableHead className="px-6 py-3">Date</TableHead><TableHead className="px-6 py-3">Statut</TableHead><TableHead className="px-6 py-3 text-right">Actions</TableHead></TableRow>}
          renderTable={(utility) => (
            <>
              <TableCell className="px-6 py-4"><div className="flex items-center gap-3"><div className={`rounded-lg p-2 ${getUtilityColorClasses(utility.type)}`}>{getUtilityIcon(utility.type)}</div><div><div className="text-sm font-medium text-gray-900 dark:text-white">{getUtilityLabel(utility.type)}</div>{utility.is_recurring ? <div className="text-xs text-green-600 dark:text-green-400">Récurrent ({utility.recurring_frequency})</div> : null}</div></div></TableCell>
              <TableCell className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(utility.amount)}</TableCell>
              <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{utility.consumption_value && utility.consumption_value > 0 ? <div><div>{utility.consumption_value} {utility.consumption_unit}</div><div className="text-xs text-blue-600 dark:text-blue-400">{calculateUnitCost(utility.amount, utility.consumption_value)} {currency}/{utility.consumption_unit}</div></div> : <span className="text-gray-400">-</span>}</TableCell>
              <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(utility.billing_date).toLocaleDateString('fr-FR')}</TableCell>
              <TableCell className="px-6 py-4"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPaymentStatusClasses(utility.payment_status)}`}>{getPaymentStatusLabel(utility.payment_status)}</span></TableCell>
              <TableCell className="px-6 py-4">{renderUtilityActions(utility)}</TableCell>
            </>
          )}
          emptyIcon={hasActiveFilters ? Filter : Zap}
          emptyTitle={emptyTitle}
          emptyMessage={emptyMessage}
          emptyAction={emptyAction}
        />
      ) : (
        <Suspense fallback={<SectionLoader />}>
          <PermissionGuard
            resource="utilities"
            action="read"
            fallback={
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"><BarChart3 className="h-12 w-12 text-gray-400 dark:text-gray-500" /></div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{t('utilitiesManagement.dashboardAccess.title', 'Limited dashboard access')}</h3>
                <p className="text-gray-500 dark:text-gray-400">{t('utilitiesManagement.dashboardAccess.description', 'Your role does not allow access to detailed financial analytics.')}</p>
              </div>
            }
          >
            {loading ? <SectionLoader /> : <UtilitiesDashboard chartData={chartData} utilities={utilities} currency={currency} />}
          </PermissionGuard>
        </Suspense>
      )}
      </ListPageLayout>

      {/* Add/Edit Modal */}
      <ResponsiveDialog
        open={showAddModal || !!editingUtility}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingUtility(null);
          }
        }}
        title={editingUtility ? t('utilitiesManagement.dialog.editTitle', 'Edit expense') : t('utilitiesManagement.dialog.newTitle', 'New expense')}
        description={editingUtility
          ? t('utilitiesManagement.dialog.editDescription', 'Edit this expense. Changes will be automatically synced with the accounting ledger.')
          : t('utilitiesManagement.dialog.newDescription', 'Add a new expense. An accounting entry will be created automatically in the ledger.')}
        size="2xl"
        contentClassName="max-h-[90vh] overflow-y-auto"
        footer={
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setEditingUtility(null);
              }}
            >
              {t('utilitiesManagement.actions.cancel', 'Cancel')}
            </Button>
            <Button variant="green" type="button" onClick={editingUtility ? handleUpdateUtility : handleAddUtility} disabled={uploading} >
              {uploading && (
                <ButtonLoader />
              )}
              {uploading ? t('utilitiesManagement.actions.uploading', 'Uploading...') : (editingUtility ? t('utilitiesManagement.actions.update', 'Update') : t('utilitiesManagement.actions.add', 'Add'))}
            </Button>
          </DialogFooter>
        }
      >
            <div className="space-y-4">
              <FormField label={t('utilitiesManagement.fields.utilityType', 'Expense type')} htmlFor="util_type">
                <Select
                  id="util_type"
                  value={editingUtility?.type || newUtility.type}
                  onChange={(e) => {
                    const value = (e.target as HTMLSelectElement).value as Utility['type'];
                    if (editingUtility) {
                      setEditingUtility({
                        ...editingUtility,
                        type: value
                      });
                    } else {
                      setNewUtility({
                        ...newUtility,
                        type: value
                      });
                    }
                  }}
                >
                  {UTILITY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label={`Montant (${currency})`} htmlFor="util_amount">
                <Input
                  id="util_amount"
                  type="number"
                  step={1}
                  value={editingUtility?.amount || newUtility.amount}
                  onChange={(e) => {
                    const value = Number((e.target as HTMLInputElement).value);
                    if (editingUtility) {
                      setEditingUtility({
                        ...editingUtility,
                        amount: value
                      });
                    } else {
                      setNewUtility({
                        ...newUtility,
                        amount: value
                      });
                    }
                  }}
                  placeholder={`Montant en ${currency}`}
                  required
                />
              </FormField>

              {/* Consumption Tracking Fields - OPTIONAL */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('utilitiesManagement.fields.consumptionDetails', 'Consumption details (optional)')}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('utilitiesManagement.fields.leaveBlankIfUnavailable', 'Leave blank if unavailable')}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label={t('utilitiesManagement.fields.consumption', 'Consumption')} htmlFor="util_consumption">
                    <Input
                      id="util_consumption"
                      type="number"
                      step={1}
                      value={editingUtility?.consumption_value || newUtility.consumption_value || ''}
                      onChange={(e) => {
                        const value = (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : undefined;
                        if (editingUtility) {
                          setEditingUtility({
                            ...editingUtility,
                            consumption_value: value
                          });
                        } else {
                          setNewUtility({
                            ...newUtility,
                            consumption_value: value
                          });
                        }
                      }}
                      placeholder={t('utilitiesManagement.placeholders.consumption', 'e.g. 500')}
                    />
                  </FormField>
                  <FormField label={t('utilitiesManagement.fields.unit', 'Unit')} htmlFor="util_unit">
                    <Select
                      id="util_unit"
                      value={editingUtility?.consumption_unit || newUtility.consumption_unit || ''}
                      onChange={(e) => {
                        const value = (e.target as HTMLSelectElement).value
                        if (editingUtility) {
                          setEditingUtility({
                            ...editingUtility,
                            consumption_unit: value
                          });
                        } else {
                          setNewUtility({
                            ...newUtility,
                            consumption_unit: value
                          });
                        }
                      }}
                    >
                      <option value="">{t('utilitiesManagement.placeholders.selectUnit', 'Select a unit')}</option>
                      {getAvailableUnits((editingUtility?.type || newUtility.type) as string).map(unit => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              </div>

              {/* Unit Cost Display */}
              {((editingUtility?.consumption_value && editingUtility.consumption_value > 0) ||
                (newUtility.consumption_value && newUtility.consumption_value > 0)) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      {t('utilitiesManagement.fields.unitCost', 'Unit cost:')}
                    </span>
                    <span className="text-lg font-semibold text-blue-900 dark:text-blue-200">
                      {calculateUnitCost(
                        editingUtility?.amount || newUtility.amount || 0,
                        editingUtility?.consumption_value || newUtility.consumption_value
                      )} {currency}/{editingUtility?.consumption_unit || newUtility.consumption_unit}
                    </span>
                  </div>
                </div>
              )}

              <FormField label={t('utilitiesManagement.fields.date', 'Date')} htmlFor="util_date" required>
                <Input
                  id="util_date"
                  type="date"
                  value={editingUtility?.billing_date || newUtility.billing_date}
                  onChange={(e) => {
                    const value = (e.target as HTMLInputElement).value
                    if (editingUtility) {
                      setEditingUtility({
                        ...editingUtility,
                        billing_date: value
                      });
                    } else {
                      setNewUtility({
                        ...newUtility,
                        billing_date: value
                      });
                    }
                  }}
                  required
                />
              </FormField>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingUtility?.is_recurring || newUtility.is_recurring || false}
                    onChange={(e) => {
                      if (editingUtility) {
                        setEditingUtility({
                          ...editingUtility,
                          is_recurring: e.target.checked
                        });
                      } else {
                        setNewUtility({
                          ...newUtility,
                          is_recurring: e.target.checked
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('utilitiesManagement.fields.recurringExpense', 'Recurring expense')}
                  </span>
                </label>
              </div>

              {(editingUtility?.is_recurring || newUtility.is_recurring) && (
                <FormField label={t('utilitiesManagement.fields.frequency', 'Frequency')} htmlFor="util_recurring_freq">
                  <Select
                    id="util_recurring_freq"
                    value={editingUtility?.recurring_frequency || newUtility.recurring_frequency}
                    onChange={(e) => {
                      const value = (e.target as HTMLSelectElement).value as 'monthly' | 'quarterly' | 'yearly';
                      if (editingUtility) {
                        setEditingUtility({
                          ...editingUtility,
                          recurring_frequency: value
                        });
                      } else {
                        setNewUtility({
                          ...newUtility,
                          recurring_frequency: value
                        });
                      }
                    }}
                  >
                    <option value="monthly">{t('utilitiesManagement.frequency.monthly', 'Monthly')}</option>
                    <option value="quarterly">{t('utilitiesManagement.frequency.quarterly', 'Quarterly')}</option>
                    <option value="yearly">{t('utilitiesManagement.frequency.yearly', 'Yearly')}</option>
                  </Select>
                </FormField>
              )}

              <FormField label={t('utilitiesManagement.fields.notes', 'Notes')} htmlFor="util_notes">
                <Textarea
                  id="util_notes"
                  value={editingUtility?.notes || newUtility.notes}
                  onChange={(e) => {
                    const value = (e.target as HTMLTextAreaElement).value
                    if (editingUtility) {
                      setEditingUtility({
                        ...editingUtility,
                        notes: value
                      });
                    } else {
                      setNewUtility({
                        ...newUtility,
                        notes: value
                      });
                    }
                  }}
                  rows={3}
                />
              </FormField>

              {/* Invoice File Upload */}
              <div>
                 <div className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                   {t('utilitiesManagement.fields.invoice', 'Invoice (PDF, Image)')}
                 </div>
                {!editingUtility && (
                  <div className="mt-1 flex items-center space-x-4">
                    <input
                      type="file"
                      id="invoice-upload"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="invoice-upload"
                      className="cursor-pointer flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-green-500"
                    >
                      <Upload className="h-4 w-4" />
                      <span>{t('utilitiesManagement.actions.chooseFile', 'Choose file')}</span>
                    </label>
                    {selectedFile && (
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-green-600" />
                         <span className="text-sm text-gray-600">{selectedFile?.name}</span>
                        <Button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {editingUtility?.invoice_url && (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600">{t('utilitiesManagement.fields.invoiceAttached', 'Invoice attached')}</span>
                    <Button
                      type="button"
                       onClick={() => {
                         if (editingUtility?.invoice_url) {
                           downloadInvoice(editingUtility.invoice_url, `facture-${editingUtility.type}-${editingUtility.billing_date}.pdf`);
                         }
                       }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
      </ResponsiveDialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </>
  );
};

export default UtilitiesManagement;
