import {  useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy  } from "react";
import { useNavigate } from '@tanstack/react-router';
import { Plus, X, Edit2, Trash2, Zap, Droplets, Fuel, Wifi, Phone, Grid, List, Calendar, Upload, FileText, Download, Filter, ChevronUp, ChevronDown, BarChart3, BookOpen, Loader2 } from 'lucide-react';
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
import { Dialog, DialogFooter } from './ui/dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useAuth } from '../hooks/useAuth';
import { useRoleBasedAccess, PermissionGuard } from '../hooks/useRoleBasedAccess';
import { useCurrency } from '../hooks/useCurrency';
import InlineFarmSelector from './InlineFarmSelector';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionLoader, ButtonLoader } from '@/components/ui/loader';


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
  const { currentOrganization, currentFarm, user } = useAuth();
  const { _hasPermission, _hasRole, _userRole } = useRoleBasedAccess();
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
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const accountIdCacheRef = useRef<Record<string, string>>({});

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
        `Compte comptable de type "${accountType}"${subtypeMsg} introuvable. ` +
        `Veuillez créer ce compte dans le plan comptable.`
      );
    }
  }, [currentOrganization?.id, currentFarm?.id]);

  // Helper function to calculate unit cost
  const calculateUnitCost = (amount: number, consumptionValue?: number): string => {
    if (!consumptionValue || consumptionValue === 0) return '';
    return (amount / consumptionValue).toFixed(4);
  };

  // Helper function to get available units for utility type
  const getAvailableUnits = (type: string): string[] => {
    return CONSUMPTION_UNITS[type] || CONSUMPTION_UNITS.other;
  };

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

  useEffect(() => {
    fetchUtilities();
  }, [currentFarm?.id]);

  // Filter and sort utilities
  const filteredAndSortedUtilities = useMemo(() => {
    let filtered = [...utilities];

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
  }, [utilities, filters, sortBy, sortOrder]);

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

  // Helper function to get utility label
  const getUtilityLabel = useCallback((type: string) => {
    return UTILITY_TYPES.find(ut => ut.value === type)?.label || type;
  }, []);

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
        consumption: utility.consumption_value,
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
  }, [filteredAndSortedUtilities, getUtilityLabel]);

  const fetchUtilities = async () => {
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
  };

  const handleAddUtility = async () => {
    try {
      if (!currentFarm?.id || !currentOrganization?.id) {
        setError('Sélectionnez une ferme pour ajouter une charge.');
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
          setError('Erreur lors du téléchargement du fichier');
          setUploading(false);
          return;
        }
        invoiceUrl = uploadResult.url;
        invoiceFilePath = uploadResult.path;
      }

      const createdUtility = await utilitiesApi.create(currentOrganization.id, {
        ...newUtility,
        farm_id: currentFarm.id,
        invoice_url: invoiceUrl,
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
            `✓ Charge enregistrée avec succès.\n\n` +
            `⚠️ L'écriture comptable n'a pas pu être créée automatiquement.\n\n` +
            `Raison: ${errorMessage}\n\n` +
            `→ Veuillez configurer le plan comptable dans la section Comptabilité > Plan Comptable.\n` +
            `→ Comptes requis: Charges d'exploitation, Trésorerie, Dettes fournisseurs.`
          );
        } else {
          setError(`Charge enregistrée, mais l'écriture comptable n'a pas été créée: ${errorMessage}`);
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
        setError('Sélectionnez une ferme pour modifier une charge.');
        return;
      }
      setError(null);

      let updatedUtility = await utilitiesApi.update(
        currentOrganization.id,
        currentFarm.id,
        editingUtility.id,
        editingUtility
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

  if (loading) {
    return (
      <SectionLoader />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="hidden sm:block text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des Charges Fixes
        </h2>

        {/* Mobile: Add button at top */}
        <div className="sm:hidden">
          <Button
            onClick={() => setShowAddModal(true)}
            disabled={!currentFarm?.id}
            variant={currentFarm?.id ? 'green' : undefined}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg ${!currentFarm?.id ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : ''} shadow-md`}
            title={!currentFarm?.id ? 'Sélectionnez une ferme pour ajouter une charge' : undefined}
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Nouvelle Charge</span>
          </Button>
        </div>

        {/* Desktop controls */}
        <div className="hidden sm:flex items-center space-x-4">
          <Button
            onClick={() => navigate({ to: '/accounting-journal' })}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <BookOpen className="h-4 w-4" />
            <span>Journal Comptable</span>
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <Button
              onClick={() => setViewMode('grouped')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grouped' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue groupée"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue cartes"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue liste"
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setViewMode('dashboard')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'dashboard' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue tableau de bord"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter and Sort Controls */}
          <Button
            onClick={() => setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }))}
            className={`flex items-center space-x-2 px-3 py-2 border rounded-md transition-colors ${filters.showFilters ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'} hover:bg-blue-50 dark:hover:bg-blue-900/20`}
            title="Filtres et tri"
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filtres</span>
            {filters.showFilters ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>

          <Button
            onClick={() => setShowAddModal(true)}
            disabled={!currentFarm?.id}
            variant={currentFarm?.id ? 'green' : undefined}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${!currentFarm?.id ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : ''}`}
            title={!currentFarm?.id ? 'Sélectionnez une ferme pour ajouter une charge' : undefined}
          >
            <Plus className="h-5 w-5" />
            <span>Nouvelle Charge</span>
          </Button>
        </div>
      </div>

      {/* Mobile: View mode and filter toggle */}
      <div className="sm:hidden flex items-center gap-2">
        <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 overflow-x-auto">
          <Button
            onClick={() => setViewMode('grouped')}
            className={`flex-1 p-2 rounded-md transition-colors whitespace-nowrap ${viewMode === 'grouped' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            title="Vue groupée"
          >
            <Grid className="h-4 w-4 mx-auto" />
          </Button>
          <Button
            onClick={() => setViewMode('cards')}
            className={`flex-1 p-2 rounded-md transition-colors whitespace-nowrap ${viewMode === 'cards' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            title="Vue cartes"
          >
            <List className="h-4 w-4 mx-auto" />
          </Button>
          <Button
            onClick={() => setViewMode('list')}
            className={`flex-1 p-2 rounded-md transition-colors whitespace-nowrap ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            title="Vue liste"
          >
            <Calendar className="h-4 w-4 mx-auto" />
          </Button>
          <Button
            onClick={() => setViewMode('dashboard')}
            className={`flex-1 p-2 rounded-md transition-colors whitespace-nowrap ${viewMode === 'dashboard' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            title="Vue tableau de bord"
          >
            <BarChart3 className="h-4 w-4 mx-auto" />
          </Button>
        </div>

        <Button
          onClick={() => setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }))}
          className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors ${filters.showFilters ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
        >
          <Filter className="h-4 w-4" />
          {filters.showFilters ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      {filters.showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Période
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Du"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Au"
                />
              </div>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Statut de paiement
              </label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  paymentStatus: e.target.value as typeof filters.paymentStatus
                }))}
                className="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="paid">Payé</option>
                <option value="overdue">En retard</option>
              </select>
            </div>

            {/* Utility Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type de charge
              </label>
              <select
                value={filters.utilityType}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  utilityType: e.target.value
                }))}
                className="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">Tous les types</option>
                {UTILITY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Recurring Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Récurrence
              </label>
              <select
                value={filters.isRecurring}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  isRecurring: e.target.value as typeof filters.isRecurring
                }))}
                className="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">Toutes</option>
                <option value="recurring">Récurrentes</option>
                <option value="non-recurring">Non récurrentes</option>
              </select>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trier par
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="billing_date">Date</option>
                  <option value="amount">Montant</option>
                  <option value="type">Type</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ordre
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="desc">Décroissant</option>
                  <option value="asc">Croissant</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            <Button
              onClick={() => {
                setFilters({
                  dateRange: { start: '', end: '' },
                  paymentStatus: 'all',
                  utilityType: 'all',
                  isRecurring: 'all',
                  showFilters: filters.showFilters
                });
                setSortBy('billing_date');
                setSortOrder('desc');
              }}
              className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {utilities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total des charges</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.total)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Charges récurrentes</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.recurring)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Edit2 className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">En attente</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.pending)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <List className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre total</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{totals.count}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <InlineFarmSelector message="Sélectionnez une ferme pour gérer les charges fixes." />

      {error && (
        <div className={`p-4 rounded-lg border ${
          error.includes('✓')
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
        }`}>
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className={`text-sm whitespace-pre-line ${
                error.includes('✓')
                  ? 'text-yellow-800 dark:text-yellow-300'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {error}
              </p>
              {error.includes('plan comptable') && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: '/accounting-accounts' })}
                    className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-400"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Ouvrir le Plan Comptable
                  </Button>
                </div>
              )}
            </div>
            <Button
              onClick={() => setError(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty State - No utilities at all */}
      {utilities.length === 0 && !loading && currentFarm?.id && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Zap className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune charge fixe
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Commencez par ajouter vos premières charges fixes (électricité, eau, etc.)
          </p>
          <PermissionGuard resource="utilities" action="create">
            <Button variant="green"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une charge
            </Button>
          </PermissionGuard>
        </div>
      )}

      {/* Empty State - No results after filtering */}
      {utilities.length > 0 && filteredAndSortedUtilities.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Filter className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucun résultat trouvé
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Aucune charge ne correspond aux filtres sélectionnés. Essayez de modifier vos critères de recherche.
          </p>
          <Button
            onClick={() => {
              setFilters({
                dateRange: { start: '', end: '' },
                paymentStatus: 'all',
                utilityType: 'all',
                isRecurring: 'all',
                showFilters: filters.showFilters
              });
              setSortBy('billing_date');
              setSortOrder('desc');
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Réinitialiser les filtres
          </Button>
        </div>
      )}

      {/* Utilities Display */}
      {viewMode === 'grouped' && (
        <div className="space-y-6">
          {Object.entries(groupedUtilities).map(([type, typeUtilities]) => {
            const typeTotal = typeUtilities.reduce((sum, u) => sum + u.amount, 0);
            const typeRecurring = typeUtilities.filter(u => u.is_recurring).length;

            return (
              <div key={type} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        type === 'electricity' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        type === 'water' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                        type === 'diesel' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                        type === 'gas' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                        type === 'internet' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                        type === 'phone' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {getUtilityIcon(type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {getUtilityLabel(type)}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {typeUtilities.length} entrée{typeUtilities.length !== 1 ? 's' : ''}
                          {typeRecurring > 0 && ` • ${typeRecurring} récurrente${typeRecurring !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(typeTotal)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Total
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {typeUtilities.map(utility => (
                    <div key={utility.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(utility.amount)}
                          </span>
                          {utility.is_recurring && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              <Calendar className="h-3 w-3 mr-1" />
                              Récurrent
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(utility.billing_date).toLocaleDateString()}
                          {utility.consumption_value && utility.consumption_value > 0 &&
                            ` • ${utility.consumption_value} ${utility.consumption_unit}`}
                          {utility.consumption_value && utility.consumption_value > 0 &&
                            ` • ${calculateUnitCost(utility.amount, utility.consumption_value)} ${currency}/${utility.consumption_unit}`}
                          {utility.notes && ` • ${utility.notes}`}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {utility.invoice_url && (
                          <Button
                            onClick={() => downloadInvoice(utility.invoice_url!, `facture-${utility.type}-${utility.billing_date}.pdf`)}
                            className="text-blue-400 hover:text-blue-500"
                            title="Télécharger la facture"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <PermissionGuard resource="utilities" action="update">
                          <Button
                            onClick={() => setEditingUtility(utility)}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard resource="utilities" action="delete">
                          <Button
                            onClick={() => handleDeleteUtility(utility.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedUtilities.map(utility => (
            <div
              key={utility.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    utility.type === 'electricity' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    utility.type === 'water' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                    utility.type === 'diesel' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                    utility.type === 'gas' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                    utility.type === 'internet' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                    utility.type === 'phone' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {getUtilityIcon(utility.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getUtilityLabel(utility.type)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(utility.billing_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <PermissionGuard resource="utilities" action="update">
                    <Button
                      onClick={() => setEditingUtility(utility)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <Edit2 className="h-5 w-5" />
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard resource="utilities" action="delete">
                    <Button
                      onClick={() => handleDeleteUtility(utility.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </PermissionGuard>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Montant</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(utility.amount)}</span>
                </div>
                {utility.consumption_value && utility.consumption_value > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-500 text-sm">Consommation</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {utility.consumption_value} {utility.consumption_unit}
                    </span>
                  </div>
                )}
                {utility.consumption_value && utility.consumption_value > 0 && (
                  <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <span className="text-blue-700 dark:text-blue-400 text-sm font-medium">Coût unitaire</span>
                    <span className="text-blue-800 dark:text-blue-300 font-semibold">
                      {calculateUnitCost(utility.amount, utility.consumption_value)} {currency}/{utility.consumption_unit}
                    </span>
                  </div>
                )}
                {utility.is_recurring && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      Récurrent ({utility.recurring_frequency})
                    </span>
                  </div>
                )}
                {utility.notes && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {utility.notes}
                  </p>
                )}
                {utility.invoice_url && (
                  <div className="flex items-center space-x-2 mt-2">
                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <Button
                      onClick={() => downloadInvoice(utility.invoice_url!, `facture-${utility.type}-${utility.billing_date}.pdf`)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Télécharger la facture
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Montant
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Consommation
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedUtilities.map(utility => (
                <TableRow key={utility.id}>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${
                        utility.type === 'electricity' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        utility.type === 'water' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                        utility.type === 'diesel' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                        utility.type === 'gas' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                        utility.type === 'internet' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                        utility.type === 'phone' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {getUtilityIcon(utility.type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getUtilityLabel(utility.type)}
                        </div>
                        {utility.is_recurring && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            Récurrent ({utility.recurring_frequency})
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(utility.amount)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {utility.consumption_value && utility.consumption_value > 0 ? (
                      <div>
                        <div>{utility.consumption_value} {utility.consumption_unit}</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {calculateUnitCost(utility.amount, utility.consumption_value)} {currency}/{utility.consumption_unit}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(utility.billing_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      utility.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      utility.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {utility.payment_status === 'paid' ? 'Payé' :
                       utility.payment_status === 'pending' ? 'En attente' : 'En retard'}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {utility.invoice_url && (
                        <Button
                          onClick={() => downloadInvoice(utility.invoice_url!, `facture-${utility.type}-${utility.billing_date}.pdf`)}
                          className="text-blue-400 hover:text-blue-500"
                          title="Télécharger la facture"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <PermissionGuard resource="utilities" action="update">
                        <Button
                          onClick={() => setEditingUtility(utility)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard resource="utilities" action="delete">
                        <Button
                          onClick={() => handleDeleteUtility(utility.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement du tableau de bord...</span>
            </div>
          }
        >
          <PermissionGuard
            resource="utilities"
            action="read"
            fallback={
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Accès limité au tableau de bord
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Votre rôle ne permet pas d'accéder aux analyses financières détaillées.
                </p>
              </div>
            }
          >
            <UtilitiesDashboard
              chartData={chartData}
              utilities={utilities}
              currency={currency}
            />
          </PermissionGuard>
        </Suspense>
      )}

      {/* Add/Edit Modal */}
      <ResponsiveDialog
        open={showAddModal || !!editingUtility}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingUtility(null);
          }
        }}
        title={editingUtility ? 'Modifier la Charge' : 'Nouvelle Charge'}
        description={editingUtility
          ? 'Modifiez les détails de cette charge. Les modifications seront automatiquement synchronisées avec le livre comptable.'
          : 'Ajoutez une nouvelle charge. Une écriture comptable sera automatiquement créée dans le livre.'}
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
              Annuler
            </Button>
            <Button variant="green" type="button" onClick={editingUtility ? handleUpdateUtility : handleAddUtility} disabled={uploading} >
              {uploading && (
                <ButtonLoader />
              )}
              {uploading ? 'Téléchargement...' : (editingUtility ? 'Mettre à jour' : 'Ajouter')}
            </Button>
          </DialogFooter>
        }
      >
            <div className="space-y-4">
              <FormField label="Type de charge" htmlFor="util_type">
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Détails de consommation (optionnel)
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Laissez vide si non disponible
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Consommation" htmlFor="util_consumption">
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
                      placeholder="ex: 500"
                    />
                  </FormField>
                  <FormField label="Unité" htmlFor="util_unit">
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
                      <option value="">Sélectionner une unité</option>
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
                      Coût unitaire:
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

              <FormField label="Date" htmlFor="util_date" required>
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
                    Charge récurrente
                  </span>
                </label>
              </div>

              {(editingUtility?.is_recurring || newUtility.is_recurring) && (
                <FormField label="Fréquence" htmlFor="util_recurring_freq">
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
                    <option value="monthly">Mensuelle</option>
                    <option value="quarterly">Trimestrielle</option>
                    <option value="yearly">Annuelle</option>
                  </Select>
                </FormField>
              )}

              <FormField label="Notes" htmlFor="util_notes">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Facture (PDF, Image)
                </label>
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
                      <span>Choisir un fichier</span>
                    </label>
                    {selectedFile && (
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600">{selectedFile.name}</span>
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
                    <span className="text-sm text-gray-600">Facture attachée</span>
                    <Button
                      type="button"
                      onClick={() => downloadInvoice(editingUtility.invoice_url!, `facture-${editingUtility.type}-${editingUtility.billing_date}.pdf`)}
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
    </div>
  );
};

export default UtilitiesManagement;
