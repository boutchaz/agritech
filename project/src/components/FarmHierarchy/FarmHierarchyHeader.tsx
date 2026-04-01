import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  BarChart3,
  Download,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FarmHierarchyHeaderProps {
  organizationName: string;
  totalFarms: number;
  totalArea: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onAddFarm: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onExportAll?: () => void;
  onImport?: () => void;
  selectedFarmId?: string | null;
  onExportFarm?: (farmId: string) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  filters?: {
    type: 'all' | 'main' | 'sub';
    status: 'all' | 'active' | 'inactive';
  };
  onFiltersChange?: (filters: { type: 'all' | 'main' | 'sub'; status: 'all' | 'active' | 'inactive' }) => void;
}

const FarmHierarchyHeader: React.FC<FarmHierarchyHeaderProps> = ({
  organizationName,
  totalFarms,
  totalArea,
  viewMode,
  onViewModeChange,
  onAddFarm,
  searchTerm,
  onSearchChange,
  onExportAll,
  onImport,
  selectedFarmId,
  onExportFarm,
  showFilters = false,
  onToggleFilters,
  filters,
  onFiltersChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="w-full lg:w-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate max-w-full">
                {t('nav.farmHierarchy')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-full">
                {organizationName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(selectedFarmId && onExportFarm) && (
            <Button
              variant="outline"
              onClick={() => onExportFarm(selectedFarmId)}
            >
              <Download className="w-4 h-4" />
              <span>{t('farmHierarchy.farm.export')}</span>
            </Button>
          )}
          {onExportAll && (
            <Button
              variant="outline"
              onClick={onExportAll}
            >
              <Download className="w-4 h-4" />
              <span>{t('farmHierarchy.farm.exportAll')}</span>
            </Button>
          )}
          {onImport && (
            <Button
              onClick={onImport}
            >
              <Upload className="w-4 h-4" />
              <span>{t('farmHierarchy.farm.import')}</span>
            </Button>
          )}
          <Button
            data-testid="create-farm-button"
            data-tour="add-farm"
            onClick={onAddFarm}
          >
            <Plus className="w-4 h-4" />
            <span>{t('farmHierarchy.farm.newFarm')}</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div data-tour="farm-stats" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
              +12%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {totalFarms}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('farmHierarchy.totalFarms')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
              +5%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {totalArea.toFixed(1)}
            <span className="text-lg font-normal text-gray-500 ml-1">ha</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('farmHierarchy.totalArea')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {t('farmHierarchy.exportImport')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('farmHierarchy.exportImportDescription')}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('farmHierarchy.farm.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:text-white transition-shadow"
          />
        </div>

        {/* Filters Button */}
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={onToggleFilters}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">
            {t('farmHierarchy.filters')}
          </span>
          {filters && (filters.type !== 'all' || filters.status !== 'all') && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
              {[filters.type !== 'all' ? 1 : 0, filters.status !== 'all' ? 1 : 0].reduce((a, b) => a + b)}
            </span>
          )}
        </Button>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('grid')}
            aria-label={t('common.gridView', 'Grid view')}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('list')}
            aria-label={t('common.listView', 'List view')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && filters && onFiltersChange && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type de ferme
              </label>
              <select
                value={filters.type}
                onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as 'all' | 'main' | 'sub' })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:text-white"
              >
                <option value="all">Tous les types</option>
                <option value="main">Fermes principales</option>
                <option value="sub">Sous-fermes</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statut
              </label>
              <select
                value={filters.status}
                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as 'all' | 'active' | 'inactive' })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:text-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>

          {/* Reset Filters */}
          {(filters.type !== 'all' || filters.status !== 'all') && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="link"
                onClick={() => onFiltersChange({ type: 'all', status: 'all' })}
                className="p-0 h-auto text-sm text-gray-600 dark:text-gray-400"
              >
                {t('common.resetFilters', 'Reset filters')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FarmHierarchyHeader;
