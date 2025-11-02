import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, X, Edit2, Trash2, Zap, Droplets, Fuel, Wifi, Phone, Grid, List, Calendar, Upload, FileText, Download, Filter, ChevronUp, ChevronDown, BarChart3, TrendingUp, PieChart, Activity, BookOpen } from 'lucide-react';
import { LineChart, Line, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { accountingApi } from '../lib/accounting-api';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { useAuth } from './MultiTenantAuthProvider';
import { useRoleBasedAccess, PermissionGuard } from '../hooks/useRoleBasedAccess';
import { useCurrency } from '../hooks/useCurrency';

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

const UTILITY_ACCOUNT_CODES: Record<Utility['type'], string> = {
  electricity: '5230', // Utilities expense
  water: '5140', // Water and irrigation (direct cost)
  diesel: '5240', // Fuel and oil
  gas: '5230',
  internet: '5230',
  phone: '5230',
  other: '5360', // Miscellaneous expense
};

const CASH_ACCOUNT_CODE = '1110';
const ACCOUNTS_PAYABLE_ACCOUNT_CODE = '2110';

const UtilitiesManagement: React.FC = () => {
  const { currentOrganization, currentFarm, user } = useAuth();
  const { _hasPermission, _hasRole, _userRole } = useRoleBasedAccess();
  const { format: formatCurrency, symbol: currency } = useCurrency();
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

  const getAccountIdByCode = useCallback(async (accountCode: string) => {
    if (!currentOrganization?.id) {
      throw new Error('Aucune organisation active pour résoudre les comptes comptables.');
    }

    const cacheKey = `${currentOrganization.id}:${accountCode}`;
    const cached = accountIdCacheRef.current[cacheKey];
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase
      .from('accounts')
      .select('id')
      .eq('organization_id', currentOrganization.id)
      .eq('code', accountCode)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.id) {
      throw new Error(`Compte comptable ${accountCode} introuvable pour l'organisation.`);
    }

    accountIdCacheRef.current[cacheKey] = data.id;
    return data.id;
  }, [currentOrganization?.id]);

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
  const uploadInvoiceFile = async (file: File): Promise<string | null> => {
    try {
      if (!currentFarm?.id) return null;

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentFarm.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data: _data, error } = await supabase.storage
        .from('invoices')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      return publicUrl;
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
    const debitAccountCode = UTILITY_ACCOUNT_CODES[utility.type] ?? UTILITY_ACCOUNT_CODES.other;
    const paymentStatus = utility.payment_status ?? 'pending';
    const creditAccountCode = paymentStatus === 'paid'
      ? CASH_ACCOUNT_CODE
      : ACCOUNTS_PAYABLE_ACCOUNT_CODE;

    const [debitAccountId, creditAccountId] = await Promise.all([
      getAccountIdByCode(debitAccountCode),
      getAccountIdByCode(creditAccountCode),
    ]);

    const basePayload = {
      entry_date: entryDate,
      posting_date: entryDate,
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
  }, [currentOrganization?.id, user?.id, getAccountIdByCode, getUtilityLabel]);

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
      if (!currentFarm?.id) {
        setUtilities([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('utilities')
        .select('*')
        .eq('farm_id', currentFarm.id)
        .order('billing_date', { ascending: false });

      if (error) throw error;
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
      if (!currentFarm?.id) {
        setError('Sélectionnez une ferme pour ajouter une charge.');
        return;
      }

      setError(null);
      setUploading(true);
      let invoiceUrl: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        invoiceUrl = await uploadInvoiceFile(selectedFile);
        if (!invoiceUrl) {
          setError('Erreur lors du téléchargement du fichier');
          setUploading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('utilities')
        .insert([{
          ...newUtility,
          farm_id: currentFarm.id,
          invoice_url: invoiceUrl
        }])
        .select()
        .single();

      if (error || !data) {
        throw error ?? new Error('Échec de la création de la charge.');
      }

      let createdUtility = data as Utility;

      try {
        const journalEntryId = await syncUtilityJournalEntry({
          ...createdUtility,
          journal_entry_id: createdUtility.journal_entry_id ?? null,
        });

        if (journalEntryId && journalEntryId !== createdUtility.journal_entry_id) {
          await supabase
            .from('utilities')
            .update({ journal_entry_id: journalEntryId })
            .eq('id', createdUtility.id);
          createdUtility = { ...createdUtility, journal_entry_id: journalEntryId };
        }
      } catch (journalError) {
        console.error('Error creating journal entry for utility:', journalError);
        setError('Charge enregistrée, mais l\'écriture comptable n\'a pas été créée.');
      }

      setUtilities([createdUtility, ...utilities]);
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
      if (!currentFarm?.id) {
        setError('Sélectionnez une ferme pour modifier une charge.');
        return;
      }
      setError(null);

      const { data, error } = await supabase
        .from('utilities')
        .update(editingUtility)
        .eq('id', editingUtility.id)
        .eq('farm_id', currentFarm.id)
        .select()
        .single();

      if (error || !data) {
        throw error ?? new Error('Échec de la mise à jour de la charge.');
      }

      let updatedUtility: Utility = {
        ...data,
        journal_entry_id: data.journal_entry_id ?? editingUtility.journal_entry_id ?? null,
      };

      try {
        const journalEntryId = await syncUtilityJournalEntry(updatedUtility);
        if (journalEntryId && journalEntryId !== updatedUtility.journal_entry_id) {
          await supabase
            .from('utilities')
            .update({ journal_entry_id: journalEntryId })
            .eq('id', updatedUtility.id);
          updatedUtility = { ...updatedUtility, journal_entry_id: journalEntryId };
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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette charge ?')) return;

    const utilityToDelete = utilities.find(util => util.id === id);

    try {
      if (!currentFarm?.id) {
        setError('Sélectionnez une ferme pour supprimer une charge.');
        return;
      }
      setError(null);
      const { error } = await supabase
        .from('utilities')
        .delete()
        .eq('id', id)
        .eq('farm_id', currentFarm.id);

      if (error) throw error;

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
  };

  const getUtilityIcon = (type: string) => {
    const utilityType = UTILITY_TYPES.find(ut => ut.value === type);
    const Icon = utilityType?.icon || Plus;
    return <Icon className="h-6 w-6" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des Charges Fixes
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate({ to: '/accounting-journal' })}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <BookOpen className="h-4 w-4" />
            <span>Journal Comptable</span>
          </button>
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-2 rounded-md ${viewMode === 'grouped' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue groupée"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md ${viewMode === 'cards' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue cartes"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue liste"
            >
              <Calendar className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`p-2 rounded-md ${viewMode === 'dashboard' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Vue tableau de bord"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>

          {/* Filter and Sort Controls */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }))}
            className={`flex items-center space-x-2 px-3 py-2 border rounded-md ${filters.showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700'} hover:bg-blue-50`}
            title="Filtres et tri"
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filtres</span>
            {filters.showFilters ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            disabled={!currentFarm?.id}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${currentFarm?.id ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            title={!currentFarm?.id ? 'Sélectionnez une ferme pour ajouter une charge' : undefined}
          >
            <Plus className="h-5 w-5" />
            <span>Nouvelle Charge</span>
          </button>
        </div>
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
            <button
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
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {utilities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {!currentFarm?.id && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md text-amber-800 dark:text-amber-300 text-sm">
          Sélectionnez une ferme pour gérer les charges fixes.
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
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
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une charge
            </button>
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
          <button
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
          </button>
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
                          <button
                            onClick={() => downloadInvoice(utility.invoice_url!, `facture-${utility.type}-${utility.billing_date}.pdf`)}
                            className="text-blue-400 hover:text-blue-500"
                            title="Télécharger la facture"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <PermissionGuard resource="utilities" action="update">
                          <button
                            onClick={() => setEditingUtility(utility)}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard resource="utilities" action="delete">
                          <button
                            onClick={() => handleDeleteUtility(utility.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
                    <button
                      onClick={() => setEditingUtility(utility)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                  </PermissionGuard>
                  <PermissionGuard resource="utilities" action="delete">
                    <button
                      onClick={() => handleDeleteUtility(utility.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
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
                    <button
                      onClick={() => downloadInvoice(utility.invoice_url!, `facture-${utility.type}-${utility.billing_date}.pdf`)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Télécharger la facture
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Consommation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedUtilities.map(utility => (
                <tr key={utility.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(utility.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(utility.billing_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      utility.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      utility.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {utility.payment_status === 'paid' ? 'Payé' :
                       utility.payment_status === 'pending' ? 'En attente' : 'En retard'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {utility.invoice_url && (
                        <button
                          onClick={() => downloadInvoice(utility.invoice_url!, `facture-${utility.type}-${utility.billing_date}.pdf`)}
                          className="text-blue-400 hover:text-blue-500"
                          title="Télécharger la facture"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <PermissionGuard resource="utilities" action="update">
                        <button
                          onClick={() => setEditingUtility(utility)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard resource="utilities" action="delete">
                        <button
                          onClick={() => handleDeleteUtility(utility.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
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
        <div className="space-y-6">
          {/* Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Cost Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Évolution mensuelle des coûts
                </h3>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              {chartData.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        `${value} ${currency}`,
                        name === 'amount' ? 'Montant' : 'Nombre'
                      ]}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="amount" />
                    <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} name="count" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  Aucune donnée disponible pour les 6 derniers mois
                </div>
              )}
            </div>

            {/* Cost Breakdown by Type */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Répartition par type de charge
                </h3>
                <PieChart className="h-5 w-5 text-green-500" />
              </div>
              {chartData.costByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Tooltip
                      formatter={(value: any) => [`${value} ${currency}`, 'Montant']}
                    />
                    <Legend />
                    <Pie
                      dataKey="amount"
                      nameKey="label"
                      data={chartData.costByType}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ label, percent }: any) => `${label}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {chartData.costByType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  Aucune donnée de charges disponible
                </div>
              )}
            </div>
          </div>

          {/* Consumption Analysis */}
          {chartData.consumptionData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Analyse de la consommation et coût unitaire
                </h3>
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData.consumptionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'amount') return [`${value} ${currency}`, 'Montant'];
                      if (name === 'consumption') return [`${value}`, 'Consommation'];
                      if (name === 'unitCost') return [`${value} ${currency}/unité`, 'Coût unitaire'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="amount" fill="#3b82f6" name="amount" />
                  <Bar dataKey="consumption" fill="#10b981" name="consumption" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Statistiques détaillées
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {chartData.costByType.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Types de charges</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {chartData.consumptionData.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avec données de consommation</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {utilities.filter(u => u.is_recurring).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Charges récurrentes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {utilities.filter(u => u.payment_status === 'overdue').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">En retard</p>
              </div>
            </div>
          </div>
        </div>
        </PermissionGuard>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingUtility) && (
        <div className="modal-overlay">
          <div className="modal-panel p-6 max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingUtility ? 'Modifier la Charge' : 'Nouvelle Charge'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUtility(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

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
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {editingUtility?.invoice_url && (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600">Facture attachée</span>
                    <button
                      type="button"
                      onClick={() => downloadInvoice(editingUtility.invoice_url!, `facture-${editingUtility.type}-${editingUtility.billing_date}.pdf`)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUtility(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={editingUtility ? handleUpdateUtility : handleAddUtility}
                disabled={uploading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md flex items-center space-x-2 ${
                  uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {uploading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{uploading ? 'Téléchargement...' : (editingUtility ? 'Mettre à jour' : 'Ajouter')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilitiesManagement;
