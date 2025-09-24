import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Droplets, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface Parcel {
  id: string;
  name: string;
  area: number | null;
  soil_type?: string | null;
  boundary?: number[][];
}

interface SwipableParcelCardsProps {
  parcels: Parcel[];
  className?: string;
  variant?: 'default' | 'compact' | 'overview';
  selectedParcel?: Parcel | null;
  onParcelSelect?: (parcel: Parcel) => void;
}

const SwipableParcelCards: React.FC<SwipableParcelCardsProps> = ({
  parcels,
  className = '',
  variant = 'default',
  selectedParcel = null,
  onParcelSelect
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync currentIndex with selectedParcel
  useEffect(() => {
    if (selectedParcel && parcels.length > 0) {
      const parcelIndex = parcels.findIndex(p => p.id === selectedParcel.id);
      if (parcelIndex !== -1 && parcelIndex !== currentIndex) {
        setCurrentIndex(parcelIndex);
      }
    }
  }, [selectedParcel, parcels]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentIndex, parcels.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    const diff = currentX - startX;
    setTranslateX(diff);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setTranslateX(diff);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const containerWidth = containerRef.current?.clientWidth || 0;
    const threshold = Math.max(40, containerWidth * 0.2); // responsive swipe threshold
    if (Math.abs(translateX) > threshold) {
      if (translateX > 0 && currentIndex > 0) {
        const newIndex = currentIndex - 1;
        setCurrentIndex(newIndex);
        if (onParcelSelect && parcels[newIndex]) {
          onParcelSelect(parcels[newIndex]);
        }
      } else if (translateX < 0 && currentIndex < parcels.length - 1) {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        if (onParcelSelect && parcels[newIndex]) {
          onParcelSelect(parcels[newIndex]);
        }
      }
    }
    setTranslateX(0);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setTranslateX(0);
    // Trigger parcel selection when navigating
    if (onParcelSelect && parcels[index]) {
      onParcelSelect(parcels[index]);
    }
  };

  const nextSlide = () => {
    if (currentIndex < parcels.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      // Trigger parcel selection when navigating
      if (onParcelSelect && parcels[newIndex]) {
        onParcelSelect(parcels[newIndex]);
      }
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      // Trigger parcel selection when navigating
      if (onParcelSelect && parcels[newIndex]) {
        onParcelSelect(parcels[newIndex]);
      }
    }
  };

  // Generate mock data for each parcel
  const getParcelData = (parcel: Parcel) => {
    const baseId = parseInt(parcel.id.slice(-1)) || 1;
    return {
      health: ['Excellent', 'Bon', 'Attention'][baseId % 3],
      healthColor: ['text-green-600', 'text-blue-600', 'text-yellow-600'][baseId % 3],
      healthBg: ['bg-green-50 dark:bg-green-900/20', 'bg-blue-50 dark:bg-blue-900/20', 'bg-yellow-50 dark:bg-yellow-900/20'][baseId % 3],
      irrigation: (60 + (baseId * 15) % 40),
      yield: (25 + (baseId * 5) % 15).toFixed(1),
      lastUpdate: `Il y a ${baseId + 1} jour${baseId > 0 ? 's' : ''}`,
      ndvi: (0.6 + (baseId * 0.1) % 0.3).toFixed(2),
      issues: baseId % 3 === 2 ? ['Irrigation insuffisante', 'Surveillance requise'] : []
    };
  };

  // Variant-specific styling
  const getCardHeight = () => {
    switch (variant) {
      case 'compact': return 'h-44 sm:h-48';
      case 'overview': return 'h-52 sm:h-56';
      default: return 'h-auto min-h-64 sm:min-h-72';
    }
  };

  const getCardPadding = () => {
    switch (variant) {
      case 'compact': return 'p-3 sm:p-4';
      case 'overview': return 'p-4 sm:p-5';
      default: return 'p-4 sm:p-6';
    }
  };

  const shouldShowMetrics = () => {
    return variant !== 'compact';
  };

  const shouldShowIssues = () => {
    return variant === 'default';
  };

  if (parcels.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Aucune parcelle à afficher</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full max-w-full min-w-0 overflow-x-hidden overscroll-x-contain ${className}`}>
      {/* Main carousel container */}
      <div className="relative overflow-hidden rounded-xl">
        <div
          ref={containerRef}
          className="flex min-w-0 transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 rounded-lg"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${translateX}px))`,
            touchAction: 'pan-y',
            willChange: 'transform'
          }}
          tabIndex={0}
          role="region"
          aria-label={`Carousel de parcelles, ${currentIndex + 1} sur ${parcels.length}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleDragEnd}
        >
          {parcels.map((parcel, index) => {
            const data = getParcelData(parcel);
            return (
              <div
                key={parcel.id}
                className="w-full max-w-full min-w-0 flex-shrink-0 px-2 sm:px-4"
              >
                <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg ${getCardPadding()} ${getCardHeight()} ${data.healthBg} border-2 ${
                  selectedParcel?.id === parcel.id
                    ? 'border-green-500 dark:border-green-400 ring-2 ring-green-200 dark:ring-green-800'
                    : 'border-gray-200 dark:border-gray-700'
                } transition-all duration-200`}>
                  {/* Header */}
                  <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4 mb-4 flex-col sm:flex-row">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                        {parcel.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {parcel.area ? `${parcel.area} hectares` : 'Superficie non définie'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {data.health === 'Excellent' && <CheckCircle className="h-6 w-6 text-green-600" />}
                      {data.health === 'Attention' && <AlertTriangle className="h-6 w-6 text-yellow-600" />}
                      {data.health === 'Bon' && <CheckCircle className="h-6 w-6 text-blue-600" />}
                      <span className={`font-medium ${data.healthColor}`}>
                        {data.health}
                      </span>
                    </div>
                  </div>

                  {/* Soil Type */}
                  {parcel.soil_type && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Type de sol:
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {parcel.soil_type}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Metrics Grid */}
                  {shouldShowMetrics() && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Droplets className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Irrigation
                        </span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {data.irrigation}%
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Rendement prévu
                        </span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {data.yield} t/ha
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          NDVI
                        </span>
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {data.ndvi}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Statut
                        </span>
                      </div>
                      <div className={`text-sm font-medium ${data.healthColor}`}>
                        Surveillé
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Issues/Alerts */}
                  {shouldShowIssues() && data.issues.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Attention requise:
                      </h4>
                      <div className="space-y-1">
                        {data.issues.map((issue, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-xs text-yellow-700 dark:text-yellow-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <span>Dernière mise à jour</span>
                    <span>{data.lastUpdate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation arrows (hidden on small screens, use swipe) */}
      {parcels.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            disabled={currentIndex === 0}
            aria-label="Parcelle précédente"
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={nextSlide}
            disabled={currentIndex === parcels.length - 1}
            aria-label="Parcelle suivante"
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </>
      )}

      {/* Pagination dots */}
      {parcels.length > 1 && (
        <div className="flex justify-center space-x-2 mt-4">
          {parcels.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-green-600'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}

      {/* Parcel counter */}
      {parcels.length > 1 && (
        <div className="text-center mt-2 text-sm text-gray-500 dark:text-gray-400">
          {currentIndex + 1} sur {parcels.length} parcelles
        </div>
      )}
    </div>
  );
};

export default SwipableParcelCards;
