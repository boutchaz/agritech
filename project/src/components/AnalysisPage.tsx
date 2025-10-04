import React, { useState, useEffect, useMemo } from 'react';
import { Plus, FileText, Loader2, Grid, List, ChevronLeft, ChevronRight, MapPin, Beaker, Leaf, Droplet } from 'lucide-react';
import { useAnalyses } from '../hooks/useAnalyses';
import { useAuth } from './MultiTenantAuthProvider';
import { supabase } from '../lib/supabase';
import type { AnalysisType, SoilAnalysisData, PlantAnalysisData, WaterAnalysisData } from '../types/analysis';
import { Select } from './ui/Select';
import SoilAnalysisForm from './Analysis/SoilAnalysisForm';
import PlantAnalysisForm from './Analysis/PlantAnalysisForm';
import WaterAnalysisForm from './Analysis/WaterAnalysisForm';
import AnalysisCard from './Analysis/AnalysisCard';

const ITEMS_PER_PAGE = 6;

interface Parcel {
  id: string;
  name: string;
  farm_id: string;
  area?: number;
  area_unit?: string;
  soil_type?: string | null;
}

const AnalysisPage: React.FC = () => {
  const { currentFarm } = useAuth();
  const [activeTab, setActiveTab] = useState<AnalysisType>('soil');
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(true);

  const { analyses, loading, error, addAnalysis, deleteAnalysis } = useAnalyses(
    currentFarm?.id || '',
    activeTab
  );

  // Filter analyses by selected parcel if one is selected
  const filteredAnalyses = useMemo(() => {
    if (!selectedParcelId) return analyses;
    return analyses.filter(analysis => analysis.parcel_id === selectedParcelId);
  }, [analyses, selectedParcelId]);

  const totalPages = Math.ceil(filteredAnalyses.length / ITEMS_PER_PAGE);

  const paginatedAnalyses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAnalyses.slice(startIndex, endIndex);
  }, [filteredAnalyses, currentPage]);

  // Fetch parcels for the current farm
  useEffect(() => {
    const fetchParcels = async () => {
      if (!currentFarm) {
        setLoadingParcels(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('parcels')
          .select('id, name, farm_id, area, area_unit, soil_type')
          .eq('farm_id', currentFarm.id)
          .order('name');

        if (error) throw error;
        setParcels(data || []);
      } catch (err) {
        console.error('Error fetching parcels:', err);
      } finally {
        setLoadingParcels(false);
      }
    };

    fetchParcels();
  }, [currentFarm]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSave = async (data: SoilAnalysisData | PlantAnalysisData | WaterAnalysisData, analysisDate: string, laboratory?: string, notes?: string) => {
    if (!selectedParcelId) {
      alert('Veuillez sélectionner une parcelle avant d\'ajouter une analyse.');
      return;
    }

    try {
      await addAnalysis(selectedParcelId, activeTab, analysisDate, data, laboratory, notes);
      setShowForm(false);
    } catch (err) {
      console.error('Error saving analysis:', err);
      alert('Erreur lors de l\'enregistrement de l\'analyse.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) {
      return;
    }

    try {
      await deleteAnalysis(id);
    } catch (err) {
      console.error('Error deleting analysis:', err);
      alert('Erreur lors de la suppression de l\'analyse.');
    }
  };

  const tabs = [
    { id: 'soil' as AnalysisType, label: 'Sol', icon: Beaker },
    { id: 'plant' as AnalysisType, label: 'Plante', icon: Leaf },
    { id: 'water' as AnalysisType, label: 'Eau', icon: Droplet }
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
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            selectedParcel={selectedParcel}
          />
        )}
        {activeTab === 'plant' && (
          <PlantAnalysisForm
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            selectedParcel={selectedParcel}
          />
        )}
        {activeTab === 'water' && (
          <WaterAnalysisForm
            onSave={handleSave}
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
              <button
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
                <span>Analyse {tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parcel Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-medium text-sm sm:text-base">Parcelle :</span>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            {loadingParcels ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-gray-500 text-sm">Chargement des parcelles...</span>
              </div>
            ) : (
              <Select
                value={selectedParcelId || ''}
                onChange={(e) => setSelectedParcelId((e.target as HTMLSelectElement).value || null)}
                className="w-full sm:max-w-md text-sm"
              >
                <option value="">Toutes les parcelles</option>
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
              {filteredAnalyses.length} analyse(s) pour cette parcelle
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Analyses {activeTab === 'soil' ? 'de Sol' : activeTab === 'plant' ? 'de Plante' : 'd\'Eau'}
        </h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded ${viewMode === 'card' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
              title="Vue carte"
            >
              <Grid className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
              title="Vue liste"
            >
              <List className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            disabled={!selectedParcelId}
            className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title={!selectedParcelId ? 'Sélectionnez une parcelle pour ajouter une analyse' : 'Ajouter une nouvelle analyse'}
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Nouvelle Analyse</span>
          </button>
        </div>
      </div>

      {filteredAnalyses.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune analyse enregistrée
          </h3>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Commencez par ajouter une nouvelle analyse {activeTab === 'soil' ? 'de sol' : activeTab === 'plant' ? 'de plante' : 'd\'eau'}
          </p>
        </div>
      ) : (
        <>
          <div className={viewMode === 'card' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6' : 'space-y-4'}>
            {paginatedAnalyses.map(analysis => (
              <AnalysisCard
                key={analysis.id}
                analysis={analysis}
                viewMode={viewMode}
                parcelName={!selectedParcelId ? parcels.find(p => p.id === analysis.parcel_id)?.name : undefined}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4 sm:mt-6">
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
                Affichage de {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredAnalyses.length)} sur{' '}
                {filteredAnalyses.length} analyses
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 sm:p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 sm:px-3 py-1 rounded-md text-xs sm:text-sm ${
                        currentPage === page
                          ? 'bg-green-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 sm:p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalysisPage;
