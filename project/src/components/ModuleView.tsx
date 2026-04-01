import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Settings, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useHotkeys } from '@tanstack/react-hotkeys';
import type { Module, SensorData } from '../types';
import { parcelsApi } from '../lib/api/parcels';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from '@tanstack/react-router';
import ParcelCard from './ParcelCard';
import { Button } from '@/components/ui/button';

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
  const { t } = useTranslation();
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
  useHotkeys(
    [
      { hotkey: 'ArrowLeft', callback: () => setCurrentParcelIndex(prev => Math.max(0, prev - 1)) },
      { hotkey: 'ArrowRight', callback: () => setCurrentParcelIndex(prev => Math.min(parcelsToDisplay.length - 1, prev + 1)) },
    ],
    { enabled: module.id === 'fruit-trees' && parcelsToDisplay.length > 1 },
  );

  const loadParcels = async () => {
    if (!currentFarm) {
      setParcelError(t('moduleView.errors.noFarmSelected'));
      return;
    }

    if (!currentOrganization?.id) {
      setParcelError(t('moduleView.errors.noOrgSelected'));
      return;
    }

    setLoadingParcels(true);
    setParcelError(null);

    try {
      const parcels = await parcelsApi.getAll(
        { farm_id: currentFarm.id },
        currentOrganization.id
      );

      if (parcels && parcels.length > 0) {
        const mappedParcels: Parcel[] = parcels.map(p => ({
          id: p.id,
          name: p.name,
          area: p.area ?? null,
          soil_type: p.soil_type,
          boundary: p.boundary,
        }));

        setAllParcels(mappedParcels);

        const fruitTreeParcels = mappedParcels.filter(p => {
          const soilMatch = p.soil_type?.toLowerCase().includes('fruit') ||
                           p.soil_type?.toLowerCase().includes('arbre') ||
                           p.soil_type?.toLowerCase().includes('verger');
          const nameMatch = p.name.toLowerCase().includes('verger') ||
                           p.name.toLowerCase().includes('arbres') ||
                           p.name.toLowerCase().includes('fruit');
          return soilMatch || nameMatch;
        });

        const defaultAssigned = fruitTreeParcels.length > 0 ? fruitTreeParcels : mappedParcels;
        setAssignedParcels(defaultAssigned);
        setCurrentParcelIndex(0);
      } else {
        setAllParcels([]);
        setAssignedParcels([]);
      }
    } catch (error) {
      console.error('Error loading parcels:', error);
      setParcelError(error instanceof Error ? error.message : t('moduleView.errors.loadingParcels'));
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
        <p className="text-gray-600 dark:text-gray-400">{t('moduleView.moduleNotFound')}</p>
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
            {t('moduleView.noParcelsFound')}
          </h4>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('moduleView.noParcelsDescription')}
          </p>
          <Button variant="blue"
            onClick={() => navigate({ to: '/parcels' })}
            className="inline-flex items-center px-4 py-2 rounded-md"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {t('moduleView.goToParcels')}
          </Button>
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
                {t('moduleView.fruitTrees')}
                {parcelsToDisplay.length > 0 && (
                  <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
                    - {parcelsToDisplay[currentParcelIndex]?.name || t('farmHierarchy.parcel.new')}
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {parcelsToDisplay.length > 1 ? (
                  <>{t('moduleView.navigationHint')}</>
                ) : (
                  <>{t('moduleView.singleParcelAvailable')}</>
                )}
                {assignedParcels.length > 0 && (
                  <span className="ml-2 text-green-600">• {t('moduleView.assignedCount', { count: assignedParcels.length })}</span>
                )}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="blue" onClick={loadParcels} disabled={loadingParcels} className="flex items-center space-x-2 px-3 py-2 rounded-md" >
                <RefreshCw className={`h-4 w-4 ${loadingParcels ? 'animate-spin' : ''}`} />
                <span>{t('moduleView.refresh')}</span>
              </Button>
              <Button variant="green"
                onClick={() => setShowParcelManager(!showParcelManager)}
                className="flex items-center space-x-2 px-4 py-2 rounded-md"
              >
                <Settings className="h-4 w-4" />
                <span>{t('moduleView.manage')}</span>
              </Button>
            </div>
          </div>

          {/* Parcel Assignment Manager */}
          {showParcelManager && (
            <div className="border-t pt-4 mt-4 space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {t('moduleView.assignParcels')}
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
                            {parcel.area ? `${parcel.area} ha` : t('moduleView.areaNotDefined')}
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
              <Button
                onClick={() => setCurrentParcelIndex(Math.max(0, currentParcelIndex - 1))}
                disabled={currentParcelIndex === 0}
                aria-label={t('moduleView.previousParcel')}
                className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full p-2.5 shadow-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 z-10"
              >
                <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>

              <Button
                onClick={() => setCurrentParcelIndex(Math.min(parcelsToDisplay.length - 1, currentParcelIndex + 1))}
                disabled={currentParcelIndex === parcelsToDisplay.length - 1}
                aria-label={t('moduleView.nextParcel')}
                className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full p-2.5 shadow-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 z-10"
              >
                <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </>
          )}

          {/* Pagination dots */}
          {parcelsToDisplay.length > 1 && (
            <div className="flex justify-center space-x-2 mt-4">
              {parcelsToDisplay.map((_, index) => (
                <Button variant="green"
                  key={index}
                  onClick={() => setCurrentParcelIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${ index === currentParcelIndex ? '' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'}`}
                  aria-label={t('moduleView.goToParcel', { number: index + 1 })}
                />
              ))}
            </div>
          )}

          {/* Parcel counter */}
          {parcelsToDisplay.length > 1 && (
            <div className="text-center mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('moduleView.parcelCounter', { current: currentParcelIndex + 1, total: parcelsToDisplay.length })}
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
              {t('moduleView.maximizeModule')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('moduleView.assignDescription')}
            </p>
            <Button variant="blue"
              onClick={() => setShowParcelManager(true)}
              className="inline-flex items-center px-4 py-2 rounded-md"
            >
              <MapPin className="h-4 w-4 mr-2" />
              {t('moduleView.assignParcels')}
            </Button>
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
