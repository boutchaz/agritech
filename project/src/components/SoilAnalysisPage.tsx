import React, { useState, useEffect, useMemo } from 'react';
import { Plus, FileText, Trash2, Loader2, Grid, List, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import SoilAnalysisForm from './SoilAnalysisForm';
import { useSoilAnalyses } from '../hooks/useSoilAnalyses';
import { useAuth } from './MultiTenantAuthProvider';
import { supabase } from '../lib/supabase';
import type { SoilAnalysis } from '../types';

const ITEMS_PER_PAGE = 6;

interface Parcel {
  id: string;
  name: string;
  farm_id: string;
  area?: number;
  area_unit?: string;
}

const SoilAnalysisPage: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(true);

  const { analyses, loading, error, addAnalysis, deleteAnalysis } = useSoilAnalyses(currentFarm?.id || null);

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
          .select('id, name, farm_id, area, area_unit')
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

  const handleSave = async (data: SoilAnalysis) => {
    if (!selectedParcelId) {
      alert('Veuillez sélectionner une parcelle avant d\'ajouter une analyse de sol.');
      return;
    }

    try {
      await addAnalysis(selectedParcelId, null, data);
      setShowForm(false);
    } catch (err) {
      console.error('Error saving soil analysis:', err);
      alert('Erreur lors de l\'enregistrement de l\'analyse de sol.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnalysis(id);
    } catch (err) {
      console.error('Error deleting soil analysis:', err);
      // TODO: Show error message to user
    }
  };

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
    return (
      <div className="p-6">
        <SoilAnalysisForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Parcel Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
            <MapPin className="h-5 w-5" />
            <span className="font-medium">Parcelle :</span>
          </div>
          <div className="flex-1">
            {loadingParcels ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-gray-500">Chargement des parcelles...</span>
              </div>
            ) : (
              <select
                value={selectedParcelId || ''}
                onChange={(e) => setSelectedParcelId(e.target.value || null)}
                className="block w-full max-w-md rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Toutes les parcelles</option>
                {parcels.map(parcel => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.name} {parcel.area && `(${parcel.area} ${parcel.area_unit})`}
                  </option>
                ))}
              </select>
            )}
          </div>
          {selectedParcelId && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredAnalyses.length} analyse(s) pour cette parcelle
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analyses de Sol
        </h2>
        <div className="flex items-center space-x-4">
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
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!selectedParcelId ? 'Sélectionnez une parcelle pour ajouter une analyse' : 'Ajouter une nouvelle analyse'}
          >
            <Plus className="h-5 w-5" />
            <span>Nouvelle Analyse</span>
          </button>
        </div>
      </div>

      {analyses.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune analyse enregistrée
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Commencez par ajouter une nouvelle analyse de sol
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedAnalyses.map(analysis => (
            <div
              key={analysis.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Analyse du {new Date(analysis.analysis_date).toLocaleDateString()}
                  </h3>
                  <div className="space-y-1">
                    {!selectedParcelId && (
                      <div className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400">
                        <MapPin className="h-3 w-3" />
                        <span>{parcels.find(p => p.id === analysis.parcel_id)?.name || 'Parcelle inconnue'}</span>
                      </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {analysis.physical?.texture || 'N/A'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(analysis.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Propriétés Physiques
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Texture</span>
                      <span>{analysis.physical.texture}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>pH</span>
                      <span>{analysis.physical.ph}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Humidité</span>
                      <span>{analysis.physical.moisture}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Propriétés Chimiques
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Phosphore</span>
                      <span>{analysis.chemical.phosphorus} mg/kg P2O5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Potassium</span>
                      <span>{analysis.chemical.potassium} mg/kg K2O</span>
                    </div>
                    {analysis.chemical.nitrogen > 0 && (
                      <div className="flex justify-between">
                        <span>Azote</span>
                        <span>{analysis.chemical.nitrogen} g/kg N</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Propriétés Biologiques
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Activité microbienne</span>
                      <span>{analysis.biological.microbial_activity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vers de terre</span>
                      <span>{analysis.biological.earthworm_count}/m²</span>
                    </div>
                  </div>
                </div>

                {analysis.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Notes
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {analysis.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedAnalyses.map(analysis => (
                <div
                  key={analysis.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            Analyse du {new Date(analysis.analysis_date).toLocaleDateString()}
                          </h3>
                          <div className="space-y-1">
                            {!selectedParcelId && (
                              <div className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400">
                                <MapPin className="h-3 w-3" />
                                <span>{parcels.find(p => p.id === analysis.parcel_id)?.name || 'Parcelle inconnue'}</span>
                              </div>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Texture: {analysis.physical?.texture || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(analysis.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Propriétés Physiques
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Texture</span>
                              <span className="font-medium">{analysis.physical.texture}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">pH</span>
                              <span className="font-medium">{analysis.physical.ph}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Humidité</span>
                              <span className="font-medium">{analysis.physical.moisture}%</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Propriétés Chimiques
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Phosphore</span>
                              <span className="font-medium">{analysis.chemical.phosphorus} mg/kg</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Potassium</span>
                              <span className="font-medium">{analysis.chemical.potassium} mg/kg</span>
                            </div>
                            {analysis.chemical.nitrogen > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Azote</span>
                                <span className="font-medium">{analysis.chemical.nitrogen} g/kg</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Propriétés Biologiques
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Activité microbienne</span>
                              <span className="font-medium">{analysis.biological.microbial_activity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Vers de terre</span>
                              <span className="font-medium">{analysis.biological.earthworm_count}/m²</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {analysis.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{analysis.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Affichage de {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, analyses.length)} sur{' '}
                {analyses.length} analyses
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-md text-sm ${
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
                  className="p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SoilAnalysisPage;