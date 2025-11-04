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
  onExportFarm
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Stats */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('nav.farmHierarchy')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {organizationName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(selectedFarmId && onExportFarm) && (
            <button
              onClick={() => onExportFarm(selectedFarmId)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>{t('farmHierarchy.farm.export')}</span>
            </button>
          )}
          {onExportAll && (
            <button
              onClick={onExportAll}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>{t('farmHierarchy.farm.exportAll')}</span>
            </button>
          )}
          {onImport && (
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              <Upload className="w-4 h-4" />
              <span>{t('farmHierarchy.farm.import')}</span>
            </button>
          )}
          <button
            onClick={onAddFarm}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{t('farmHierarchy.farm.newFarm')}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('farmHierarchy.filters')}</span>
        </button>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2.5 transition-colors ${
              viewMode === 'list'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FarmHierarchyHeader;
