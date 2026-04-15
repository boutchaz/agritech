
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Plus,
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
  onExportAll?: () => void;
  onImport?: () => void;
  selectedFarmId?: string | null;
  onExportFarm?: (farmId: string) => void;
}

const FarmHierarchyHeader = ({
  organizationName: _organizationName,
  totalFarms,
  totalArea,
  viewMode,
  onViewModeChange,
  onAddFarm,
  onExportAll,
  onImport,
  selectedFarmId,
  onExportFarm,
}: FarmHierarchyHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Toolbar only — page title & org live in ModernPageHeader (avoids duplicate h1 / repeated Building icon) */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-2">
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
              type="button"
              variant="outline"
              onClick={onImport}
            >
              <Upload className="w-4 h-4" />
              <span>{t('farmHierarchy.farm.import')}</span>
            </Button>
          )}
          <Button
            type="button"
            variant="default"
            data-testid="create-farm-button"
            data-tour="add-farm"
            onClick={onAddFarm}
          >
            <Plus className="w-4 h-4" />
            <span>{t('farmHierarchy.farm.newFarm')}</span>
          </Button>
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
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {t('farmHierarchy.exportImport')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('farmHierarchy.exportImportDescription')}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
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
    </div>
  );
};

export default FarmHierarchyHeader;
