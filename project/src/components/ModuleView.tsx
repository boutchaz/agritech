import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Settings, MapPin } from 'lucide-react';
import type { Module, SensorData } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';
import { useNavigate } from '@tanstack/react-router';
import ParcelCard from './ParcelCard';

interface ModuleViewProps {
  module: Module;
  sensorData: SensorData[];
}

interface Parcel {
  id: string;
  name: string;
  area: number | null;
  soil_type?: string | null;
  boundary?: number[][];
}

const ModuleView: React.FC<ModuleViewProps> = ({ module, sensorData }) => {
  const { currentOrganization, currentFarm } = useAuth();
  const navigate = useNavigate();
  const [assignedParcels, setAssignedParcels] = useState<Parcel[]>([]);
  const [allParcels, setAllParcels] = useState<Parcel[]>([]);
  const [showParcelManager, setShowParcelManager] = useState(false);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [_parcelError, setParcelError] = useState<string | null>(null);
  const [activeParcelTab, setActiveParcelTab] = useState<{[parcelId: string]: string}>({});
  const [currentParcelIndex, setCurrentParcelIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Memoized parcels for display to prevent infinite re-renders
  const parcelsToDisplay = useMemo(() => {
    return allParcels.length > 0 ? allParcels : assignedParcels;
  }, [allParcels, assignedParcels]);

  useEffect(() => {
    if (module.id === 'fruit-trees' && currentFarm) {
      loadParcels();
    }
  }, [module.id, currentFarm]);

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentParcelIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentParcelIndex(prev => Math.min(parcelsToDisplay.length - 1, prev + 1));
      }
    };

    if (module.id === 'fruit-trees' && parcelsToDisplay.length > 1) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [module.id, parcelsToDisplay.length]);

  const loadParcels = async () => {
    if (!currentFarm) {
      console.log('No current farm available');
      setParcelError('Aucune ferme sélectionnée');
      return;
    }

    setLoadingParcels(true);
    setParcelError(null);

    try {
      console.log('Loading parcels for farm:', currentFarm.id);
      console.log('Current organization:', currentOrganization?.name);

      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      console.log('User authenticated:', user.email);

      // Load all parcels for the current farm
      const { data: parcels, error } = await supabase
        .from('parcels')
        .select('id, name, area, soil_type, boundary')
        .eq('farm_id', currentFarm.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Loaded parcels:', parcels);

      if (parcels) {
        setAllParcels(parcels);

        // Auto-assign parcels based on smart detection
        const fruitTreeParcels = parcels.filter(p => {
          const soilMatch = p.soil_type?.toLowerCase().includes('fruit') ||
                           p.soil_type?.toLowerCase().includes('arbre') ||
                           p.soil_type?.toLowerCase().includes('verger');
          const nameMatch = p.name.toLowerCase().includes('verger') ||
                           p.name.toLowerCase().includes('arbres') ||
                           p.name.toLowerCase().includes('fruit');
          return soilMatch || nameMatch;
        });

        console.log('Auto-assigned parcels:', fruitTreeParcels);
        // If no specific fruit tree parcels found, assign all parcels by default for demo
        const defaultAssigned = fruitTreeParcels.length > 0 ? fruitTreeParcels : parcels;
        setAssignedParcels(defaultAssigned);
        // Reset carousel to first slide when parcels change
        setCurrentParcelIndex(0);
      } else {
        setAllParcels([]);
        setAssignedParcels([]);
      }
    } catch (error) {
      console.error('Error loading parcels:', error);
      setParcelError(error instanceof Error ? error.message : 'Erreur lors du chargement des parcelles');
    } finally {
      setLoadingParcels(false);
    }
  };

  const toggleParcelAssignment = (parcel: Parcel) => {
    const isAssigned = assignedParcels.some(p => p.id === parcel.id);
    if (isAssigned) {
      const updatedParcels = assignedParcels.filter(p => p.id !== parcel.id);
      setAssignedParcels(updatedParcels);
    } else {
      const updatedParcels = [...assignedParcels, parcel];
      setAssignedParcels(updatedParcels);
    }
  };

  const getActiveTabForParcel = (parcelId: string) => {
    return activeParcelTab[parcelId] || 'overview';
  };

  const setActiveTabForParcel = (parcelId: string, tabId: string) => {
    setActiveParcelTab(prev => ({
      ...prev,
      [parcelId]: tabId
    }));
  };

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentParcelIndex < parcelsToDisplay.length - 1) {
      setCurrentParcelIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentParcelIndex > 0) {
      setCurrentParcelIndex(prev => prev - 1);
    }
  }, [touchStart, touchEnd, currentParcelIndex, parcelsToDisplay.length]);

  if (!module) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600 dark:text-gray-400">Module non trouvé</p>
      </div>
    );
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderFruitTreesContent = () => {
    // Show empty state only if no parcels exist at all
    if (allParcels.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune parcelle trouvée
          </h4>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Aucune parcelle n'a été trouvée pour cette ferme. Créez d'abord des parcelles dans la section Parcelles.
          </p>
          <button
            onClick={() => navigate({ to: '/parcels' })}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Aller aux Parcelles
          </button>
        </div>
      );
    }


    // Show the parcel carousel with cards
    return (
      <div className="space-y-6">
        {/* Management Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Arbres Fruitiers
                {parcelsToDisplay.length > 0 && (
                  <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
                    - {parcelsToDisplay[currentParcelIndex]?.name || 'Parcelle'}
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {parcelsToDisplay.length > 1 ? (
                  <>Utilisez les flèches ou balayez pour naviguer entre les parcelles</>
                ) : (
                  <>1 parcelle disponible</>
                )}
                {assignedParcels.length > 0 && (
                  <span className="ml-2 text-green-600">• {assignedParcels.length} assignée{assignedParcels.length !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={loadParcels}
                disabled={loadingParcels}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingParcels ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
              <button
                onClick={() => setShowParcelManager(!showParcelManager)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Settings className="h-4 w-4" />
                <span>Gérer</span>
              </button>
            </div>
          </div>

          {/* Parcel Assignment Manager */}
          {showParcelManager && (
            <div className="border-t pt-4 mt-4 space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Assigner des parcelles
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allParcels.map(parcel => {
                  const isAssigned = assignedParcels.some(p => p.id === parcel.id);
                  return (
                    <div
                      key={parcel.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isAssigned
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                      onClick={() => toggleParcelAssignment(parcel)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {parcel.name}
                          </h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {parcel.area ? `${parcel.area} ha` : 'Superficie non définie'}
                            {parcel.soil_type && ` • ${parcel.soil_type}`}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded border-2 ${
                          isAssigned
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isAssigned && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Parcel Cards Carousel */}
        <div className="relative w-full max-w-full overflow-x-hidden overscroll-x-contain px-2 sm:px-10">
          <div className="rounded-xl w-full">
            <div className="flex min-w-0 transition-transform duration-300 ease-out"
                 style={{
                   transform: `translateX(-${currentParcelIndex * 100}%)`,
                   touchAction: 'pan-y',
                   willChange: 'transform'
                 }}
                 onTouchStart={handleTouchStart}
                 onTouchMove={handleTouchMove}
                 onTouchEnd={handleTouchEnd}>
              {parcelsToDisplay.map((parcel) => {
                const isAssigned = assignedParcels.some(p => p.id === parcel.id);
                return (
                  <div key={parcel.id} className="w-full max-w-full min-w-0 flex-shrink-0 px-2 sm:px-4 box-border">
                    <ParcelCard
                      parcel={parcel}
                      activeTab={getActiveTabForParcel(parcel.id)}
                      onTabChange={(tabId) => setActiveTabForParcel(parcel.id, tabId)}
                      sensorData={sensorData}
                      isAssigned={isAssigned}
                      disableInnerScroll
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation arrows */}
          {parcelsToDisplay.length > 1 && (
            <>
              <button
                onClick={() => setCurrentParcelIndex(Math.max(0, currentParcelIndex - 1))}
                disabled={currentParcelIndex === 0}
                aria-label="Parcelle précédente"
                className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full p-2.5 shadow-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 z-10"
              >
                <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={() => setCurrentParcelIndex(Math.min(parcelsToDisplay.length - 1, currentParcelIndex + 1))}
                disabled={currentParcelIndex === parcelsToDisplay.length - 1}
                aria-label="Parcelle suivante"
                className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full p-2.5 shadow-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 z-10"
              >
                <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Pagination dots */}
          {parcelsToDisplay.length > 1 && (
            <div className="flex justify-center space-x-2 mt-4">
              {parcelsToDisplay.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentParcelIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentParcelIndex
                      ? 'bg-green-600'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                  aria-label={`Aller à la parcelle ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Parcel counter */}
          {parcelsToDisplay.length > 1 && (
            <div className="text-center mt-2 text-sm text-gray-500 dark:text-gray-400">
              {currentParcelIndex + 1} sur {parcelsToDisplay.length} parcelles
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDefaultContent = () => {
    return (
      <div className="space-y-6">
        {/* Module Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {module.metrics?.map((metric, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {metric.name}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {metric.value}
                    </h3>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {metric.unit}
                    </span>
                    {getTrendIcon(metric.trend)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action when no parcels assigned */}
        {assignedParcels.length === 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 text-center">
            <MapPin className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Maximisez votre module
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Assignez des parcelles à ce module pour obtenir des données et recommandations spécifiques.
            </p>
            <button
              onClick={() => setShowParcelManager(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Assigner des parcelles
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {module.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {module.description}
          </p>
        </div>
      </div>

      {module.id === 'fruit-trees' ? renderFruitTreesContent() : renderDefaultContent()}
    </div>
  );
};

export default ModuleView;
