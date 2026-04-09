import React, { useState, useMemo } from 'react';
import { Plus, FileText, Loader2, Grid, List, MapPin, Beaker, Leaf, Droplet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import type { AnalysisType } from '../types/analysis';
import { Select } from './ui/Select';
import SoilAnalysisForm from './Analysis/SoilAnalysisFormRHF';
import PlantAnalysisForm from './Analysis/PlantAnalysisForm';
import WaterAnalysisForm from './Analysis/WaterAnalysisForm';
import AnalysisCard from './Analysis/AnalysisCard';
import { useAnalysesByFarm, useParcels, useAddAnalysis, useDeleteAnalysis } from '../hooks/useAnalysesQuery';
import type { SoilAnalysisFormValues } from '../schemas/analysisSchemas';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTablePagination, ListPageLayout, ResponsiveList } from '@/components/ui/data-table';

// Parcel interface removed - using the type from useParcels hook instead

const AnalysisPage = () => {
  const { t } = useTranslation('common');
  const { currentFarm, currentOrganization } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});

  const [activeTab, setActiveTab] = useState<AnalysisType>('soil');
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);

  const { data: analyses = [], isLoading: loading, error } = useAnalysesByFarm(currentFarm?.id, activeTab, currentOrganization?.id);
  const { data: parcelsData = [], isLoading: loadingParcels } = useParcels(currentFarm?.id, currentOrganization?.id);
  // Ensure parcels is always an array, even if API returns unexpected response
  const parcels = Array.isArray(parcelsData) ? parcelsData : [];
  const addAnalysisMutation = useAddAnalysis();
  const deleteAnalysisMutation = useDeleteAnalysis(currentOrganization?.id);

  // Filter analyses by selected parcel if one is selected
  const filteredAnalyses = useMemo(() => {
    if (!selectedParcelId) return analyses;
    return analyses.filter(analysis => analysis.parcel_id === selectedParcelId);
  }, [analyses, selectedParcelId]);

  const totalPages = Math.ceil(filteredAnalyses.length / pageSize);

  const paginatedAnalyses = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAnalyses.slice(startIndex, endIndex);
  }, [filteredAnalyses, currentPage, pageSize]);

  // Reset to page 1 if current page exceeds total pages
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSaveSoil = async (values: SoilAnalysisFormValues) => {
    if (!selectedParcelId) {
      toast.error(t('analysis.alerts.selectParcel'));
      return;
    }

    try {
      const { analysisDate, laboratory, notes, ...data } = values;

      await addAnalysisMutation.mutateAsync({
        parcelId: selectedParcelId,
        analysisType: 'soil',
        analysisDate,
        data,
        laboratory: laboratory || undefined,
        notes: notes || undefined,
      });

      setShowForm(false);
    } catch (err) {
      console.error('Error saving analysis:', err);
      toast.error(t('analysis.alerts.saveError'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('analysis.alerts.deleteConfirm'))) {
      return;
    }

    try {
      await deleteAnalysisMutation.mutateAsync(id);
    } catch (err) {
      console.error('Error deleting analysis:', err);
      toast.error(t('analysis.alerts.deleteError'));
    }
  };

  const tabs = [
    { id: 'soil' as AnalysisType, labelKey: 'analysis.tabs.soil', icon: Beaker },
    { id: 'plant' as AnalysisType, labelKey: 'analysis.tabs.plant', icon: Leaf },
    { id: 'water' as AnalysisType, labelKey: 'analysis.tabs.water', icon: Droplet }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    const selectedParcel = parcels.find(p => p.id === selectedParcelId) || null;

    return (
      <div className="p-3 sm:p-4 lg:p-6">
        {activeTab === 'soil' && (
          <SoilAnalysisForm
            onSave={handleSaveSoil}
            onCancel={() => setShowForm(false)}
            selectedParcel={selectedParcel}
          />
        )}
        {activeTab === 'plant' && (
          <PlantAnalysisForm
            onSave={() => Promise.resolve()}
            onCancel={() => setShowForm(false)}
            selectedParcel={selectedParcel}
          />
        )}
        {activeTab === 'water' && (
          <WaterAnalysisForm
            onSave={() => Promise.resolve()}
            onCancel={() => setShowForm(false)}
            selectedParcel={selectedParcel}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Analysis Type Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/10'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{t(`analysis.types.${tab.id}`)}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Parcel Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-medium text-sm sm:text-base">{t('analysis.parcel')} :</span>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            {loadingParcels ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-gray-500 text-sm">{t('analysis.loadingParcels')}</span>
              </div>
            ) : (
              <Select
                value={selectedParcelId || ''}
                onChange={(e) => setSelectedParcelId((e.target as HTMLSelectElement).value || null)}
                className="w-full sm:max-w-md text-sm"
              >
                <option value="">{t('analysis.allParcels')}</option>
                {parcels.map(parcel => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.name} {parcel.area && `(${parcel.area} ${parcel.area_unit})`}
                  </option>
                ))}
              </Select>
            )}
          </div>
          {selectedParcelId && (
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 w-full sm:w-auto">
              {t('analysis.analysesForParcel', { count: filteredAnalyses.length })}
            </div>
          )}
        </div>
      </div>

      <ListPageLayout
        header={
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t(`analysis.types.${activeTab}`)}
            </h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded ${viewMode === 'card' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                  title={t('analysis.cardView')}
                >
                  <Grid className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
                <Button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                  title={t('analysis.listView')}
                >
                  <List className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
              </div>
              <Button variant="green"
                onClick={() => setShowForm(true)}
                disabled={!selectedParcelId}
                className="px-3 sm:px-4 py-2 rounded-md flex items-center justify-center space-x-2 disabled:cursor-not-allowed text-sm"
                title={!selectedParcelId ? t('analysis.selectParcelToAdd') : t('analysis.addNewAnalysis')}
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{t('analysis.newAnalysis')}</span>
              </Button>
            </div>
          </div>
        }
      >
        <ResponsiveList
          items={paginatedAnalyses}
          isLoading={loading}
          keyExtractor={(analysis) => analysis.id}
          emptyIcon={FileText}
          emptyTitle={t('analysis.noAnalyses')}
          emptyMessage={t('analysis.startByAdding', { type: t(`analysis.tabs.${activeTab}`).toLowerCase() })}
          renderCard={(analysis) => (
            <AnalysisCard
              analysis={analysis}
              viewMode="card"
              parcelName={!selectedParcelId ? parcels.find(p => p.id === analysis.parcel_id)?.name : undefined}
              onDelete={handleDelete}
            />
          )}
          renderTable={(analysis) => (
            <AnalysisCard
              analysis={analysis}
              viewMode="list"
              parcelName={!selectedParcelId ? parcels.find(p => p.id === analysis.parcel_id)?.name : undefined}
              onDelete={handleDelete}
            />
          )}
        />

        {totalPages > 1 && (
          <DataTablePagination
            page={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredAnalyses.length}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </ListPageLayout>
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

export default AnalysisPage;
