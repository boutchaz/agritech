import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { createTileLayers } from '../lib/map/tile-providers';
import { useMapProvider } from '../hooks/useMapProvider';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import Circle from 'ol/geom/Circle';
import { fromLonLat, transform } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import Draw from 'ol/interaction/Draw';
import type { SensorData } from '../types';
import { useAddParcel, useUpdateParcel } from '../hooks/useParcelsQuery';
import { useSatelliteIndices } from '../hooks/useSatelliteIndices';
import { MapPin, Ruler, Trees as Tree, Droplets, Satellite, Download, BarChart3, Wand2, Grid3x3, Navigation, Search, X, Loader2, Maximize2, Minimize2, Leaf, Sprout } from 'lucide-react';
import { ParcelAutomation, ParcelDrawingAssist, parcelStyles } from '../utils/parcelAutomation';
import { getCurrentPosition, searchMoroccanLocation, searchResultToOLCoordinates, type SearchResult } from '../utils/geocoding';
import {
  calculatePlantCount,
  PLANTING_SYSTEMS,
  getCropTypesByCategory,
  getVarietiesByCropType,
  TREE_CATEGORIES,
  type CropCategory as StaticCropCategory,
} from '../lib/plantingSystemData';
import { useSoilTypes, useIrrigationTypes, useCropCategories, useCropTypes, useVarieties } from '../hooks/useReferenceData';
import type { CropCategory as CropCategoryApi, CropType, Variety } from '../lib/api/reference-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface MapProps {
  center: [number, number];
  zones: {
    id: string;
    name: string;
    center: [number, number];
    radius: number;
    color: string;
    type: string;
  }[];
  sensors?: SensorData[];
  farmId?: string;
  enableDrawing?: boolean;
  onParcelAdded?: (parcel: any) => void;
  selectedParcelId?: string | null;
  onParcelSelect?: (parcelId: string) => void;
  parcels?: any[]; // Allow passing parcels as prop
  editingParcelId?: string | null;
  onBoundaryUpdated?: () => void;
}

interface ParcelDetails {
  id?: string;
  name: string;
  area: number;
  soil_type: string;
  planting_density: number;
  irrigation_type: string;
  trees_count?: number;
  varieties?: string[];
  boundary?: number[][];
  calculated_area?: number;
  perimeter?: number;
  // Enhanced planting system fields
  crop_category?: string;
  crop_type?: string;
  variety?: string;
  planting_system?: string;
  spacing?: string;
  density_per_hectare?: number;
  plant_count?: number;
  planting_date?: string;
  planting_year?: number;
  planting_type?: string;
  rootstock?: string;
}

interface SatelliteIndicesResult {
  index: string;
  value: number;
  unit?: string;
  timestamp: string;
}

interface TimeSeriesResult {
  index: string;
  data: Array<{ date: string; value: number }>;
  statistics?: {
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
  };
}

const MapComponent: React.FC<MapProps> = ({
  center,
  zones,
  sensors = [],
  farmId,
  enableDrawing = true,
  onParcelAdded,
  selectedParcelId,
  onParcelSelect,
  parcels: propParcels,
  editingParcelId,
  onBoundaryUpdated
}) => {
  const roundToTwoDecimals = (value: number): number => Number(value.toFixed(2));
  const { t } = useTranslation();
  const tileProvider = useMapProvider();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [parcelName, setParcelName] = useState('');
  const [tempBoundary, setTempBoundary] = useState<number[][]>([]);
  const [showParcelForm, setShowParcelForm] = useState(false);
  const [isParcelFormDialogOpen, setIsParcelFormDialogOpen] = useState(false);
  const [treeFamily, setTreeFamily] = useState<string>('');
  const [parcelDetails, setParcelDetails] = useState({
    soil_type: '',
    area: 0,
    planting_density: 0,
    irrigation_type: '',
    crop_category: '',
    crop_type: '',
    variety: '',
    planting_system: '',
    spacing: '',
    density_per_hectare: 0,
    plant_count: 0,
    planting_date: '',
    planting_type: '',
    rootstock: ''
  });

  // Fetch reference data from Strapi CMS
  const { data: soilTypesFromApi = [] } = useSoilTypes();
  const { data: irrigationTypesFromApi = [] } = useIrrigationTypes();
  const { data: cropCategories = [] } = useCropCategories();
  
  // Find the selected category by value (e.g., "trees", "cereals", "vegetables", "other")
  // This matches the values used in the static data
  const selectedCategory = parcelDetails.crop_category
    ? (cropCategories as unknown as CropCategoryApi[]).find(cat => {
        // Match by value first (most reliable), then by name or id
        const catValue = cat.value?.toLowerCase();
        const parcelValue = parcelDetails.crop_category?.toLowerCase();
        return catValue === parcelValue || 
               cat.id === parcelDetails.crop_category ||
               cat.name?.toLowerCase() === parcelValue ||
               cat.name_fr?.toLowerCase() === parcelValue;
      })
    : undefined;
  
  // Get crop types from the selected category (already populated from Strapi controller)
  const cropTypesFromCategory: CropType[] = selectedCategory?.crop_types || [];
  
  // Fallback: fetch crop types by category ID if not populated in category
  const selectedCategoryId = selectedCategory?.id;
  const { data: cropTypesFromStrapi = [] } = useCropTypes(selectedCategoryId);
  
  // Use crop types from category if available, otherwise from hook
  const allCropTypesFromStrapi: CropType[] = cropTypesFromCategory.length > 0 
    ? cropTypesFromCategory 
    : (cropTypesFromStrapi as unknown as CropType[]);
  
  // Find the selected crop type by value or name (e.g., "Olivier", "Pommier")
  const selectedCropType = parcelDetails.crop_type && allCropTypesFromStrapi.length > 0
    ? allCropTypesFromStrapi.find(ct => {
        // Match by value, name, or name_fr
        const ctValue = ct.value?.toLowerCase();
        const ctName = ct.name?.toLowerCase();
        const ctNameFr = ct.name_fr?.toLowerCase();
        const parcelValue = parcelDetails.crop_type?.toLowerCase();
        return ctValue === parcelValue || 
               ct.id === parcelDetails.crop_type ||
               ctName === parcelValue ||
               ctNameFr === parcelValue;
      })
    : undefined;
  
  // Get varieties from the selected crop type (already populated from Strapi controller)
  const varietiesFromCropType: Variety[] = selectedCropType?.varieties || [];
  
  // Fallback: fetch varieties by crop type ID if not populated in crop type
  const selectedCropTypeId = selectedCropType?.id;
  const { data: varietiesFromStrapi = [] } = useVarieties(selectedCropTypeId);
  
  // Use varieties from crop type if available, otherwise from hook
  const allVarietiesFromStrapi: Variety[] = varietiesFromCropType.length > 0 
    ? varietiesFromCropType 
    : (varietiesFromStrapi as unknown as Variety[]);

  const soilTypes = soilTypesFromApi;
  const irrigationTypes = irrigationTypesFromApi;

  // Static fallback categories used when CMS returns nothing
  const STATIC_CROP_CATEGORIES = [
    { id: 'trees', value: 'trees', name: 'Fruit trees', name_fr: 'Arbres fruitiers' },
    { id: 'cereals', value: 'cereals', name: 'Cereals', name_fr: 'Céréales' },
    { id: 'vegetables', value: 'vegetables', name: 'Vegetables', name_fr: 'Légumes' },
    { id: 'legumes', value: 'legumes', name: 'Legumes', name_fr: 'Légumineuses' },
    { id: 'fourrages', value: 'fourrages', name: 'Forage crops', name_fr: 'Cultures fourragères' },
    { id: 'industrielles', value: 'industrielles', name: 'Industrial crops', name_fr: 'Cultures industrielles' },
    { id: 'aromatiques', value: 'aromatiques', name: 'Aromatic plants', name_fr: 'Plantes aromatiques' },
    { id: 'other', value: 'other', name: 'Other', name_fr: 'Autre' },
  ];

  // Always use the static list (fully controlled) — the static list is the source of truth
  const availableCropCategories = STATIC_CROP_CATEGORIES;

  // For trees: filter CMS crop types by selected family name (preserves CMS IDs for variety lookup)
  // If no CMS types, fall back to static strings
  const familyNames: string[] = treeFamily
    ? TREE_CATEGORIES[treeFamily as keyof typeof TREE_CATEGORIES] ?? []
    : [];

  const filteredCmsTreeTypes: CropType[] = treeFamily && allCropTypesFromStrapi.length > 0
    ? allCropTypesFromStrapi.filter(ct => {
        const ctName = (ct.name_fr || ct.name || ct.value || '').toLowerCase();
        return familyNames.some(fn => fn.toLowerCase() === ctName || ctName.includes(fn.toLowerCase()) || fn.toLowerCase().includes(ctName));
      })
    : [];

  // For trees: use CMS types filtered by family (keeps IDs for variety lookup), fall back to static strings
  // For other static-only categories: use static list (no CMS data)
  // For cereals/vegetables: use CMS if available, then static
  const staticOnlyCategories = ['legumes', 'fourrages', 'industrielles', 'aromatiques'];
  const availableCropTypes: (CropType | string)[] = parcelDetails.crop_category
    ? parcelDetails.crop_category === 'trees'
      ? treeFamily
        ? filteredCmsTreeTypes.length > 0
          ? filteredCmsTreeTypes  // CMS objects → variety lookup works
          : familyNames           // static strings fallback
        : []                      // no family selected → show nothing
      : staticOnlyCategories.includes(parcelDetails.crop_category)
        ? getCropTypesByCategory(parcelDetails.crop_category as StaticCropCategory)
        : allCropTypesFromStrapi.length > 0
          ? allCropTypesFromStrapi
          : getCropTypesByCategory(parcelDetails.crop_category as StaticCropCategory)
    : [];

  // Strapi varieties first, then static fallback (e.g. olive varieties from plantingSystemData)
  const staticVarieties: string[] = parcelDetails.crop_type
    ? getVarietiesByCropType(parcelDetails.crop_type)
    : [];
  const availableVarieties: (Variety | string)[] = parcelDetails.crop_type
    ? allVarietiesFromStrapi.length > 0
      ? allVarietiesFromStrapi
      : staticVarieties
    : [];

  // Planting systems — use static PLANTING_SYSTEMS (tree systems) as default fallback
  // TODO: Replace with CMS data when available
  const availablePlantingSystems: Array<{ type: string; spacing: string; treesPerHectare?: number; plantsPerHectare?: number; seedsPerHectare?: number }> = PLANTING_SYSTEMS;
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('satellite');
  const [_showGeolocPrompt, setShowGeolocPrompt] = useState(false);
  const [showPlaceNames, setShowPlaceNames] = useState(true);
  const viewRef = useRef<View | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<ParcelDetails | null>(null);
  const [drawingMode, setDrawingMode] = useState<'manual' | 'assisted'>('manual');
  const [autoSnapEnabled, setAutoSnapEnabled] = useState(true);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);
  const [calculatedPerimeter, setCalculatedPerimeter] = useState<number>(0);
  const [showIndicesDialog, setShowIndicesDialog] = useState(false);
  const [showTimeSeriesDialog, setShowTimeSeriesDialog] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<string[]>(['NDVI', 'NDRE']);
  const [selectedTimeSeriesIndex, setSelectedTimeSeriesIndex] = useState<string>('NDVI');
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [userLocationFeature, setUserLocationFeature] = useState<Feature | null>(null);
  const [indicesResults, setIndicesResults] = useState<SatelliteIndicesResult[]>([]);
  const [popupData, setPopupData] = useState<{
    position: [number, number] | null;
    content: string;
    visible: boolean;
  }>({
    position: null,
    content: '',
    visible: false
  });

  // Function to convert map coordinates to pixel position
  const getPopupPixelPosition = (mapCoords: [number, number]) => {
    if (!mapInstanceRef.current) return { left: '50%', top: '50%' };

    try {
      const pixel = mapInstanceRef.current.getPixelFromCoordinate(
        fromLonLat([mapCoords[0], mapCoords[1]])
      );

      if (pixel) {
         return {
           left: `${pixel[0]}px`,
           top: `${pixel[1]}px`
         };
       }
     } catch (_error) {
       // Error converting coordinates to pixels
     }

    return { left: '50%', top: '50%' };
  };
  const [timeSeriesResults, setTimeSeriesResults] = useState<TimeSeriesResult | null>(null);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  // Always call the hook, but pass farmId which might be undefined
  const addParcelMutation = useAddParcel();
  const updateParcelMutation = useUpdateParcel();
  const isSavingParcel = addParcelMutation.isPending || updateParcelMutation.isPending;

  // Use prop parcels if provided, otherwise empty array
  const parcels = Array.isArray(propParcels) ? propParcels : [];
  const {
    calculateIndices,
    getTimeSeries,
    exportIndexMap,
    loading: indicesLoading,
    error: indicesError,
    availableIndices,
    loadAvailableIndices
  } = useSatelliteIndices();

  // Auto-update density when planting system changes
  useEffect(() => {
    if (parcelDetails.planting_system && availablePlantingSystems.length > 0) {
      const system = availablePlantingSystems.find(
        s => s.type === parcelDetails.planting_system ||
          `${s.type} (${s.spacing})` === parcelDetails.planting_system
      );
      if (system) {
        const density = 'treesPerHectare' in system ? system.treesPerHectare :
          'plantsPerHectare' in system ? system.plantsPerHectare :
            'seedsPerHectare' in system ? system.seedsPerHectare : 0;
        setParcelDetails(prev => ({
          ...prev,
          density_per_hectare: density || prev.density_per_hectare,
          spacing: system.spacing || prev.spacing
        }));
      }
    }
  }, [parcelDetails.planting_system, availablePlantingSystems]);

  // Auto-calculate plant count when area or density changes
  useEffect(() => {
    if (parcelDetails.area && parcelDetails.density_per_hectare) {
      const count = calculatePlantCount(parcelDetails.area, parcelDetails.density_per_hectare);
      setParcelDetails(prev => ({
        ...prev,
        plant_count: count
      }));
    }
  }, [parcelDetails.area, parcelDetails.density_per_hectare]);

  // Load available indices on component mount
  useEffect(() => {
    loadAvailableIndices();

    // Check location permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state as 'prompt' | 'granted' | 'denied');
        try {
          const asked = localStorage.getItem('agritech:map:geolocPrompted');
          if (!asked && (result.state === 'prompt' || result.state === 'granted')) {
            setShowGeolocPrompt(true);
          }
        } catch {
          // Ignore errors from permissions query
        }
      });
    }
  }, [loadAvailableIndices]);

  // Load existing parcel data when editingParcelId is set
  useEffect(() => {
    if (editingParcelId && parcels) {
      const parcel = parcels.find(p => p.id === editingParcelId);
      if (parcel) {
        setParcelName(parcel.name);
        if (parcel.boundary && parcel.boundary.length > 0) {
          setTempBoundary(parcel.boundary);
          setCalculatedArea(roundToTwoDecimals(parcel.calculated_area || parcel.area || 0));
          setCalculatedPerimeter(roundToTwoDecimals(parcel.perimeter || 0));
        }
        // Load other parcel details
        setParcelDetails({
          soil_type: parcel.soil_type || '',
          area: roundToTwoDecimals(parcel.area || 0),
          planting_density: parcel.density_per_hectare || 0,
          irrigation_type: parcel.irrigation_type || '',
          crop_category: parcel.crop_category || '',
          crop_type: parcel.crop_type || '',
          variety: parcel.variety || '',
          planting_system: parcel.planting_system || '',
          spacing: parcel.spacing || '',
          density_per_hectare: parcel.density_per_hectare || 0,
          plant_count: parcel.plant_count || 0,
          planting_date: parcel.planting_date || '',
          planting_type: parcel.planting_type || '',
          rootstock: parcel.rootstock || ''
        });
        // Pre-select tree family when editing
        if (parcel.crop_category === 'trees' && parcel.crop_type) {
          const family = Object.entries(TREE_CATEGORIES).find(([, types]) =>
            types.includes(parcel.crop_type!)
          )?.[0] ?? '';
          setTreeFamily(family);
        } else {
          setTreeFamily('');
        }
        // Don't show the form immediately - let the user draw the boundary first
        // The form will be shown after they finish drawing (in the drawend event)
      }
    }
  }, [editingParcelId, parcels]);

  // Handle place names visibility
  useEffect(() => {
    if (mapInstanceRef.current) {
      const layers = mapInstanceRef.current.getLayers();
      const layerArray = layers.getArray();

      layerArray.forEach((layer) => {
        if (layer instanceof TileLayer && layer.getProperties()?.role === 'labels') {
          layer.setVisible(showPlaceNames);
        }
      });
    }
  }, [showPlaceNames]);

  // Handle full-screen mode
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    if (isFullScreen) {
      document.addEventListener('keydown', handleEscape);
    }

    // Resize map when entering/exiting full-screen
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.updateSize();
        } catch (_error) {
          // Error updating map size
        }
      }
    }, 200);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      clearTimeout(timer);
    };
  }, [isFullScreen]);

  // (duplicate place names toggle removed — handled above)

  // Handle map type changes — just toggle layer visibility, no map rebuild
  useEffect(() => {
    if (mapInstanceRef.current) {
      const layers = mapInstanceRef.current.getLayers();
      const layerArray = layers.getArray();

      layerArray.forEach((layer) => {
        if (layer instanceof TileLayer) {
          const role = layer.getProperties()?.role;
          if (role === 'streets') {
            layer.setVisible(mapType === 'osm');
          } else if (role === 'satellite') {
            layer.setVisible(mapType === 'satellite');
          }
        }
      });
    }
  }, [mapType]);

  // Center map on selected parcel when it changes
  useEffect(() => {
    if (selectedParcelId && mapInstanceRef.current && vectorSourceRef.current) {
      const features = vectorSourceRef.current.getFeatures();
      const parcelFeature = features.find(f => f.get('parcelId') === selectedParcelId);

      if (parcelFeature) {
        const geometry = parcelFeature.getGeometry();
        if (geometry instanceof Polygon) {
          const extent = geometry.getExtent();

          // Fit the view to the parcel extent with animation
          mapInstanceRef.current.getView().fit(extent, {
            padding: [200, 200, 200, 400], // More padding at bottom for the parcel info panel
            duration: 1200,
            maxZoom: 17, // Don't zoom in too much
            easing: (t: number) => {
              // Smooth easing function
              return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            }
          });

          // Highlight the selected feature and unhighlight others
          features.forEach((f: Feature) => {
            if (f.get('type') === 'Parcelle') {
              if (f.get('parcelId') === selectedParcelId) {
                f.setStyle(parcelStyles.selected);

                // Also update the internal selectedParcel state
                const details = f.get('details');
                if (details) {
                  setSelectedParcel({
                    id: selectedParcelId,
                    name: f.get('name'),
                    ...details
                  });
                }
              } else {
                f.setStyle(parcelStyles.default);
              }
            }
          });
        }
      } else {
        // If parcel not found in current features, it might not have boundaries yet
        // Try to find the parcel in the parcels array and center on it if it has boundary data
        const parcel = parcels.find(p => p.id === selectedParcelId);
        if (parcel && parcel.boundary && parcel.boundary.length > 0) {
          const firstCoord = parcel.boundary[0];
          let coords;

          if (Math.abs(firstCoord[0]) > 20000 || Math.abs(firstCoord[1]) > 20000) {
            // Already in EPSG:3857
            coords = parcel.boundary.map((coord: number[]) => [coord[0], coord[1]]);
          } else {
            // Convert from geographic
            coords = parcel.boundary.map((coord: number[]) => fromLonLat([coord[0], coord[1]]));
          }

          const polygon = new Polygon([coords]);
          const extent = polygon.getExtent();

          mapInstanceRef.current.getView().fit(extent, {
            padding: [150, 150, 150, 150],
            duration: 1000,
            maxZoom: 17
          });
        }
      }
    }
  }, [selectedParcelId]);

  // Request user location
  const requestUserLocation = async () => {
    try {
      const position = await getCurrentPosition();
      const coords = fromLonLat([position.coords.longitude, position.coords.latitude]);

      // Center map on user location
      if (mapInstanceRef.current) {
        mapInstanceRef.current.getView().animate({
          center: coords,
          zoom: 15,
          duration: 1000
        });

        // Add/update user location marker
        if (vectorSourceRef.current) {
          if (userLocationFeature) {
            vectorSourceRef.current.removeFeature(userLocationFeature);
          }

          const locationFeature = new Feature({
            geometry: new Point(coords),
            name: 'Ma position',
            type: 'user-location'
          });

          locationFeature.setStyle(new Style({
            image: new CircleStyle({
              radius: 8,
              fill: new Fill({ color: '#3b82f6' }),
              stroke: new Stroke({
                color: 'white',
                width: 3
              })
            })
          }));

          vectorSourceRef.current.addFeature(locationFeature);
          setUserLocationFeature(locationFeature);
        }
      }

      setLocationPermission('granted');
      try { localStorage.setItem('agritech:map:geolocPrompted', '1'); } catch {
        // Ignore localStorage errors
      }
      setShowGeolocPrompt(false);
    } catch (error) {
      console.error('Location error:', error);
      setLocationPermission('denied');
      toast.error(error instanceof Error ? error.message : 'Could not get your location');
      try { localStorage.setItem('agritech:map:geolocPrompted', '1'); } catch {
        // Ignore localStorage errors
      }
      setShowGeolocPrompt(false);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchMoroccanLocation(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Go to search result
  const goToSearchResult = (result: SearchResult) => {
    const coords = searchResultToOLCoordinates(result);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.getView().animate({
        center: coords,
        zoom: 14,
        duration: 1000
      });

      // Add a temporary marker for the search result
      if (vectorSourceRef.current) {
        const searchMarker = new Feature({
          geometry: new Point(coords),
          name: result.display_name,
          type: 'search-result'
        });

        searchMarker.setStyle(new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#ef4444' }),
            stroke: new Stroke({
              color: 'white',
              width: 2
            })
          })
        }));

        vectorSourceRef.current.addFeature(searchMarker);

        // Remove the marker after 10 seconds
        setTimeout(() => {
          if (vectorSourceRef.current) {
            vectorSourceRef.current.removeFeature(searchMarker);
          }
        }, 10000);
      }
    }

    // Close search box
    setShowSearchBox(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleCalculateIndices = async () => {
    if (!selectedParcel?.boundary) return;

    try {
      const result = await calculateIndices(
        selectedParcel.boundary,
        selectedParcel.name,
        selectedIndices,
        dateRange
      );
      setIndicesResults(result.indices);
      setShowIndicesDialog(false);
    } catch (error) {
      console.error('Failed to calculate indices:', error);
    }
  };

  const handleGetTimeSeries = async () => {
    if (!selectedParcel?.boundary) return;

    try {
      const result = await getTimeSeries(
        selectedParcel.boundary,
        selectedParcel.name,
        selectedTimeSeriesIndex,
        dateRange
      );
      setTimeSeriesResults(result);
      setShowTimeSeriesDialog(false);
    } catch (error) {
      console.error('Failed to get time series:', error);
    }
  };

  const handleExportIndexMap = async (index: string) => {
    if (!selectedParcel?.boundary) return;

    try {
      const result = await exportIndexMap(
        selectedParcel.boundary,
        selectedParcel.name,
        dateRange.end_date,
        index
      );
      // Open download URL in new tab
      window.open(result.download_url, '_blank');
    } catch (error) {
      console.error('Failed to export index map:', error);
    }
  };


  // Normalize irrigation type to DB-allowed tokens
  const normalizeIrrigationType = (value: string): 'drip' | 'sprinkler' | 'flood' | 'none' | undefined => {
    const trimmed = (value || '').trim();
    if (!trimmed) return undefined;
    const mapping: Record<string, 'drip' | 'sprinkler' | 'flood' | 'none'> = {
      'Goutte-à-goutte': 'drip',
      'Aspersion': 'sprinkler',
      'Micro-aspersion': 'sprinkler',
      'Gravitaire': 'flood',
      'Aucune': 'none',
      'drip': 'drip',
      'sprinkler': 'sprinkler',
      'flood': 'flood',
      'none': 'none'
    };
    return mapping[trimmed] ?? undefined;
  };

  useEffect(() => {
    try {
      if (!mapRef.current) {
        return;
      }

      // Preserve current view state before destroying the map
      let savedZoom: number | undefined;
      let savedCenter: number[] | undefined;
      if (mapInstanceRef.current) {
        const currentView = mapInstanceRef.current.getView();
        savedZoom = currentView.getZoom();
        savedCenter = currentView.getCenter() as number[] | undefined;
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }

      const vectorSource = new VectorSource();
      const vectorLayer = new VectorLayer({
        source: vectorSource,
      });

      // Create tile layers from provider factory
      const { streets: osmLayer, satellite: satelliteLayer, labels: labelsLayer } = createTileLayers(
        tileProvider,
        { initialMapType: mapType, showPlaceNames }
      );

      const view = new View({
        center: savedCenter || fromLonLat([center[1], center[0]]),
        zoom: savedZoom || 6,
      });

      viewRef.current = view;

      const map = new Map({
        target: mapRef.current,
        layers: [
          osmLayer,
          satelliteLayer,
          labelsLayer,
          vectorLayer,
        ],
        view: view,
      });

      // Note: Using React-based full-screen instead of OpenLayers FullScreen control


      // Popup now handled via React state instead of OpenLayers overlay

      if (farmId && enableDrawing) {
        const draw = new Draw({
          source: vectorSource,
          type: 'Polygon',
          style: drawingMode === 'assisted' ? parcelStyles.drawing : undefined,
        });
        map.addInteraction(draw);
        drawInteractionRef.current = draw;

        if (autoSnapEnabled) {
          const snap = ParcelAutomation.createSnapInteraction(vectorSource);
          map.addInteraction(snap);
        }

        const drawingAssist = new ParcelDrawingAssist(vectorSource);
        if (drawingMode === 'assisted') {
          drawingAssist.enableMagneticSnap();
          drawingAssist.enableRightAngleMode();
        }

        draw.on('drawstart', () => {
          if (vectorSourceRef.current) {
            const tempFeatures = vectorSourceRef.current.getFeatures()
              .filter(f => f.get('temp') === true);
            tempFeatures.forEach((f: Feature) => vectorSourceRef.current?.removeFeature(f));
          }
        });

        // Handle drawing abort (Escape key) — reset partial state so user can draw again
        draw.on('drawabort', () => {
          // Remove any unfinished drawn features
          if (vectorSourceRef.current) {
            const features = vectorSourceRef.current.getFeatures();
            const tempFeatures = features.filter(f =>
              !f.get('parcelId') && !f.get('type') && f.getGeometry() instanceof Polygon
            );
            tempFeatures.forEach(f => vectorSourceRef.current?.removeFeature(f));
          }
          setTempBoundary([]);
          setCalculatedArea(0);
          setCalculatedPerimeter(0);
        });

        draw.on('drawend', (event) => {
          const feature = event.feature;
          const geometry = feature.getGeometry();
          if (geometry instanceof Polygon) {
            const area = roundToTwoDecimals(ParcelAutomation.calculateArea(geometry));
            const perimeter = roundToTwoDecimals(ParcelAutomation.calculatePerimeter(geometry));


            setCalculatedArea(area);
            setCalculatedPerimeter(perimeter);

            const coordinates = geometry.getCoordinates()[0];
            // Store coordinates in EPSG:3857 format (Web Mercator) for consistency
            let boundary = coordinates.map((coord: number[]) => [coord[0], coord[1]]);

            // Ensure the polygon is closed
            if (boundary.length > 0) {
              const firstPoint = boundary[0];
              const lastPoint = boundary[boundary.length - 1];
              if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
                boundary.push([firstPoint[0], firstPoint[1]]);
              }
            }

            if (drawingMode === 'assisted') {
              // For smoothing, we need to work with the projected coordinates
              boundary = ParcelAutomation.smoothBoundary(boundary, 0.2);
              boundary = ParcelAutomation.simplifyBoundary(boundary);
            }

            const validation = ParcelAutomation.validateBoundary(boundary);
            if (!validation.valid) {
              feature.setStyle(parcelStyles.error);
              toast.error(`Erreur de dessin: ${validation.errors.join(', ')}`);
              vectorSource.removeFeature(feature);
              return;
            }

            setTempBoundary(boundary);
            setParcelDetails(prev => ({ ...prev, area, calculated_area: area }));

            // If editing an existing parcel, skip name dialog and go directly to form
            if (editingParcelId) {
              setShowParcelForm(true);
              setIsParcelFormDialogOpen(true);
            } else {
              setShowNameDialog(true);
            }
          }
        });
      }

      vectorSourceRef.current = vectorSource;

      // Add existing parcels as polygons on the map
      parcels.forEach(parcel => {
        if (parcel.boundary && parcel.boundary.length > 0) {
          // Check if coordinates are already in projected format (EPSG:3857) or geographic (EPSG:4326)
          const firstCoord = parcel.boundary[0];
          let coordinates;

          // If coordinates have large absolute values (> 20000), they're likely already in Web Mercator (EPSG:3857)
          // Geographic coordinates should be between -180 to 180 for longitude and -90 to 90 for latitude
          if (Math.abs(firstCoord[0]) > 20000 || Math.abs(firstCoord[1]) > 20000) {
            coordinates = parcel.boundary.map((coord: number[]) => [coord[0], coord[1]]);
          } else {
            coordinates = parcel.boundary.map((coord: number[]) => fromLonLat([coord[0], coord[1]]));
          }

          // Ensure polygon is closed
          if (coordinates.length > 0) {
            const firstCoord = coordinates[0];
            const lastCoord = coordinates[coordinates.length - 1];
            if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
              coordinates.push(firstCoord);
            }
          }

          const feature = new Feature({
            geometry: new Polygon([coordinates]),
            name: parcel.name,
            type: 'Parcelle',
            details: {
              ...parcel,
              area: parcel.calculated_area || parcel.area,
              perimeter: parcel.perimeter
            },
            parcelId: parcel.id
          });

          // Highlight if selected
          if (selectedParcelId && parcel.id === selectedParcelId) {
            feature.setStyle(parcelStyles.selected);
          } else {
            feature.setStyle(parcelStyles.default);
          }

          vectorSource.addFeature(feature);
        }
      });

      zones.forEach(zone => {
        const circle = new Feature({
          geometry: new Circle(
            fromLonLat([zone.center[1], zone.center[0]]),
            zone.radius
          ),
        });

        circle.setStyle(new Style({
          fill: new Fill({
            color: `${zone.color}33`,
          }),
          stroke: new Stroke({
            color: zone.color,
            width: 2,
          }),
        }));

        const marker = new Feature({
          geometry: new Point(fromLonLat([zone.center[1], zone.center[0]])),
          name: zone.name,
          type: zone.type,
        });

        marker.setStyle(new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: zone.color }),
            stroke: new Stroke({
              color: 'white',
              width: 2,
            }),
          }),
        }));

        vectorSource.addFeatures([circle, marker]);
      });

      (sensors || []).forEach(sensor => {
        if (!sensor.location) return;

        const coordinates = typeof sensor.location === 'string' ? sensor.location.split(',').map(Number) : [];
        if (coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) return;

        const feature = new Feature({
          geometry: new Point(fromLonLat([coordinates[1], coordinates[0]])),
          properties: {
            type: sensor.type,
            value: sensor.value,
            unit: sensor.unit,
            location: sensor.location,
          },
        });

        feature.setStyle(new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#4ade80' }),
            stroke: new Stroke({
              color: 'white',
              width: 2,
            }),
          }),
        }));

        vectorSource.addFeature(feature);
      });

      map.on('click', (event) => {
        const featureLike = map.forEachFeatureAtPixel(event.pixel, f => f);

        if (featureLike) {
          if (!(featureLike instanceof Feature)) {
            return;
          }
          const feature = featureLike as Feature;
          const properties = feature.getProperties();
          const geometry = feature.getGeometry();

          // Handle parcel polygons
          if (properties.type === 'Parcelle' && geometry instanceof Polygon) {
            const extent = geometry.getExtent();
            const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];

            let content = '';
            if (properties.name) {
              content = `
              <div class="p-2">
                <h3 class="font-semibold">${properties.name}</h3>
                <p class="text-sm text-gray-600">Type: ${properties.type}</p>
              </div>
            `;
              if (properties.details) {
                const details = properties.details;
                content += `
                <div class="text-sm text-gray-600">
                  <p>Surface: ${details.area || 'Non définie'} ha</p>
                  <p>Périmètre: ${details.perimeter || 'Non défini'} m</p>
                  <p>Type de sol: ${details.soil_type || 'Non défini'}</p>
                  <p>Densité: ${details.planting_density || 'Non définie'} arbres/ha</p>
                  <p>Irrigation: ${details.irrigation_type || 'Non définie'}</p>
                </div>
              `;

                // Highlight selected parcel
                feature.setStyle(parcelStyles.selected);

                // Remove highlight from other parcels
                vectorSource.getFeatures().forEach((f) => {
                  if (f instanceof Feature) {
                    if (f !== feature && f.get('type') === 'Parcelle') {
                      f.setStyle(parcelStyles.default);
                    }
                  }
                });

                setSelectedParcel({
                  id: properties.parcelId,
                  name: properties.name,
                  ...details,
                  boundary: details.boundary
                });

                // Notify parent component
                if (onParcelSelect && properties.parcelId) {
                  onParcelSelect(properties.parcelId);
                }
              }
            }

            if (content) {
              const [lng, lat] = transform(center, 'EPSG:3857', 'EPSG:4326');
              setPopupData({
                position: [lng, lat],
                content: content,
                visible: true
              });
            }
          }
          // Handle sensors and other point features
          else if (geometry instanceof Point) {
            const coordinates = geometry.getCoordinates();

            if (properties.properties) {
              const sensorProps = properties.properties;
              const content = `
              <div class="p-2">
                <h3 class="font-semibold">Capteur ${sensorProps.type}</h3>
                <p class="text-sm text-gray-600">
                  Valeur: ${sensorProps.value} ${sensorProps.unit}
                </p>
                <p class="text-sm text-gray-600">
                  Location: ${sensorProps.location}
                </p>
              </div>
            `;

              const [lng, lat] = transform(coordinates, 'EPSG:3857', 'EPSG:4326');
              setPopupData({
                position: [lng, lat],
                content: content,
                visible: true
              });
            }
          }
        } else {
          setPopupData(prev => ({ ...prev, visible: false }));
          // Remove highlight from all parcels
          vectorSource.getFeatures().forEach((f: Feature) => {
            if (f.get('type') === 'Parcelle') {
              f.setStyle(parcelStyles.default);
            }
          });
          setSelectedParcel(null);
        }
      });

      mapInstanceRef.current = map;

      // Center on selected or first parcel if available
      if (selectedParcelId) {
        const selectedParcel = parcels.find(p => p.id === selectedParcelId);
        if (selectedParcel && selectedParcel.boundary && selectedParcel.boundary.length > 0) {
          // Handle coordinate transformation based on coordinate system
          const firstCoord = selectedParcel.boundary[0];
          let coords;

          if (Math.abs(firstCoord[0]) > 20000 || Math.abs(firstCoord[1]) > 20000) {
            // Already in EPSG:3857
            coords = selectedParcel.boundary.map((coord: number[]) => [coord[0], coord[1]]);
          } else {
            // Convert from geographic
            coords = selectedParcel.boundary.map((coord: number[]) => fromLonLat([coord[0], coord[1]]));
          }

          const polygon = new Polygon([coords]);
          const extent = polygon.getExtent();

          map.getView().fit(extent, {
            padding: [200, 200, 200, 400],
            maxZoom: 17
          });
        }
      } else if (parcels.length > 0) {
        // If no selected parcel, try to fit all parcels with boundaries
        const parcelsWithBoundaries = parcels.filter(p => p.boundary && p.boundary.length > 0);

        if (parcelsWithBoundaries.length > 0) {
          // Create a combined extent for all parcels
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

          parcelsWithBoundaries.forEach(parcel => {
            const firstCoord = parcel.boundary![0];

            parcel.boundary!.forEach((coord: number[]) => {
              let x, y;

              if (Math.abs(firstCoord[0]) > 20000 || Math.abs(firstCoord[1]) > 20000) {
                // Already in EPSG:3857
                [x, y] = [coord[0], coord[1]];
              } else {
                // Convert from geographic
                [x, y] = fromLonLat([coord[0], coord[1]]);
              }

              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            });
          });

          if (minX !== Infinity) {
            map.getView().fit([minX, minY, maxX, maxY], {
              padding: [100, 100, 100, 100],
              maxZoom: 15
            });
          }
        }
      }

      return () => {
        // Proper cleanup
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setTarget(undefined);
          mapInstanceRef.current = null;
        }
        if (vectorSourceRef.current) {
          vectorSourceRef.current.clear();
          vectorSourceRef.current = null;
        }
        if (drawInteractionRef.current) {
          drawInteractionRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      // Return a cleanup function even if there was an error
      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setTarget(undefined);
          mapInstanceRef.current = null;
        }
      };
    }
  // NOTE: mapType is NOT in this dependency array on purpose.
  // Layer visibility for mapType is handled by a separate useEffect that
  // toggles layers without destroying the map — preserving zoom/position.
   
  }, [center, zones, sensors, parcels, farmId, enableDrawing, drawingMode, autoSnapEnabled, selectedParcelId, onParcelSelect, tileProvider]);

  // Helper function to clean up drawing state
  const cleanupDrawingState = () => {
    // Remove temporary drawn features from the map
    if (vectorSourceRef.current) {
      const features = vectorSourceRef.current.getFeatures();
      const tempFeatures = features.filter(f =>
        !f.get('parcelId') && // Not a saved parcel
        f.getGeometry() instanceof Polygon // Is a polygon (drawn parcel)
      );
      tempFeatures.forEach(f => vectorSourceRef.current?.removeFeature(f));
    }

    // Reset state
    setShowNameDialog(false);
    setShowParcelForm(false);
    setIsParcelFormDialogOpen(false);
    setParcelName('');
    setTempBoundary([]);
    setTreeFamily('');
    setParcelDetails({
      soil_type: '',
      area: 0,
      planting_density: 0,
      irrigation_type: '',
      crop_category: '',
      crop_type: '',
      variety: '',
      planting_system: '',
      spacing: '',
      density_per_hectare: 0,
      plant_count: 0,
      planting_date: '',
      planting_type: '',
      rootstock: ''
    });
    setCalculatedArea(0);
    setCalculatedPerimeter(0);
  };

  const handleSaveParcel = async () => {
    if (!farmId || !parcelName || tempBoundary.length === 0 || isSavingParcel) return;

    try {
      const normalizedIrrigation = normalizeIrrigationType(parcelDetails.irrigation_type);

      if (editingParcelId) {
        // Update existing parcel - exclude farm_id
        const updateData = {
          name: parcelName,
          boundary: tempBoundary,
          description: '',
          area: parcelDetails.area || calculatedArea,
          area_unit: 'hectares',
          soil_type: parcelDetails.soil_type || undefined,
          irrigation_type: normalizedIrrigation || undefined,
          crop_category: parcelDetails.crop_category || undefined,
          crop_type: parcelDetails.crop_type || undefined,
          variety: parcelDetails.variety || undefined,
          planting_system: parcelDetails.planting_system || undefined,
          spacing: parcelDetails.spacing || undefined,
          density_per_hectare: parcelDetails.density_per_hectare || undefined,
          plant_count: parcelDetails.plant_count || undefined,
          planting_date: parcelDetails.planting_date || undefined,
          planting_year: parcelDetails.planting_date ? new Date(parcelDetails.planting_date).getFullYear() : undefined,
          planting_type: parcelDetails.planting_type || undefined,
          rootstock: parcelDetails.rootstock || undefined,
          calculated_area: calculatedArea,
          perimeter: calculatedPerimeter
        };

        await updateParcelMutation.mutateAsync({
          id: editingParcelId,
          updates: updateData
        });

        cleanupDrawingState();

        if (onBoundaryUpdated) {
          onBoundaryUpdated();
        }
      } else {
        // Create new parcel - include farm_id
        const createData = {
          name: parcelName,
          farm_id: farmId,
          boundary: tempBoundary,
          description: '',
          area: parcelDetails.area || calculatedArea,
          area_unit: 'hectares',
          soil_type: parcelDetails.soil_type || undefined,
          irrigation_type: normalizedIrrigation || undefined,
          crop_category: parcelDetails.crop_category || undefined,
          crop_type: parcelDetails.crop_type || undefined,
          variety: parcelDetails.variety || undefined,
          planting_system: parcelDetails.planting_system || undefined,
          spacing: parcelDetails.spacing || undefined,
          density_per_hectare: parcelDetails.density_per_hectare || undefined,
          plant_count: parcelDetails.plant_count || undefined,
          planting_date: parcelDetails.planting_date || undefined,
          planting_year: parcelDetails.planting_date ? new Date(parcelDetails.planting_date).getFullYear() : undefined,
          planting_type: parcelDetails.planting_type || undefined,
          rootstock: parcelDetails.rootstock || undefined,
          calculated_area: calculatedArea,
          perimeter: calculatedPerimeter
        };

        const newParcel = await addParcelMutation.mutateAsync(createData);

        cleanupDrawingState();

        if (onParcelAdded) {
          onParcelAdded(newParcel);
        }
      }
    } catch (error) {
      console.error('Error saving parcel:', error);
      toast.error(`Erreur lors de ${editingParcelId ? 'la mise à jour' : 'la création'} de la parcelle: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const handleNameSubmit = () => {
    if (parcelName) {
      setShowNameDialog(false);
      setShowParcelForm(true);
      setIsParcelFormDialogOpen(true);
    }
  };

  return (
    <>
      {isFullScreen && <div className="fixed inset-0 z-40 bg-white" />}
      <div className={isFullScreen ? "fixed inset-0 z-50" : "space-y-4"}>
        <div className={`relative w-full ${isFullScreen ? "h-full" : "h-96"}`}>
          <div
            ref={mapRef}
            className="w-full h-full"
            key="openlayers-map-container"
          />

          {/* Tile provider badge */}
          {tileProvider !== 'default' && (
            <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-black/50 text-white backdrop-blur-sm">
                {tileProvider === 'mapbox' ? 'Mapbox' : tileProvider}
              </span>
            </div>
          )}

          {/* Full-Screen Close Button */}
          {isFullScreen && (
            <div className="absolute top-4 left-4 z-50">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsFullScreen(false)}
                aria-label={t('map.exitFullscreen')}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* React-based popup to avoid DOM manipulation conflicts */}
          {popupData.visible && popupData.position && (
            <div
              className="absolute bg-white rounded-lg shadow-lg border border-gray-200 p-4 pointer-events-none z-40"
              style={{
                ...getPopupPixelPosition(popupData.position),
                transform: 'translate(-50%, -100%)',
                minWidth: '200px',
                maxWidth: '300px'
              }}
              dangerouslySetInnerHTML={{ __html: popupData.content }}
            />
          )}

          {farmId && enableDrawing && showNameDialog && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
                <h3 className="text-lg font-semibold mb-4">{t('map.nameParcel')}</h3>
                <input
                  type="text"
                  value={parcelName}
                  onChange={(e) => setParcelName(e.target.value)}
                  placeholder={t('map.parcelNamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                  autoFocus
                />
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="ghost"
                    onClick={cleanupDrawingState}
                  >
                    {t('map.cancel')}
                  </Button>
                  <Button
                    onClick={handleNameSubmit}
                    disabled={!parcelName}
                  >
                    {t('map.next')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Dialog open={isParcelFormDialogOpen} onOpenChange={(open) => {
            if (!open) {
              cleanupDrawingState();
            }
          }}>
            <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">{t('map.parcelDetails')} {parcelName}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Sprout className="w-4 h-4" />
                    {t('map.basicInfo')}
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('map.areaHectares')}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={roundToTwoDecimals(parcelDetails.area || 0)}
                        onChange={(e) => setParcelDetails(prev => ({
                          ...prev,
                          area: roundToTwoDecimals(Number(e.target.value))
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white"
                        min="0"
                        step="0.01"
                        readOnly
                      />
                      <span className="text-sm text-green-600 font-medium">{t('map.autoCalculated')}</span>
                    </div>
                    {calculatedPerimeter > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('map.perimeter')}: {roundToTwoDecimals(calculatedPerimeter)} m
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('map.soilType')}
                    </label>
                    <select
                      value={parcelDetails.soil_type}
                      onChange={(e) => setParcelDetails(prev => ({
                        ...prev,
                        soil_type: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">{t('map.select')}</option>
                      {soilTypes.map(type => {
                        const s = type as { id?: string; value?: string; name?: string; name_fr?: string };
                        const key = s.id || s.value || '';
                        const value = s.value || '';
                        const label = s.name_fr || s.name || s.value || '';
                        return (
                          <option key={key} value={value}>{label}</option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('map.irrigationType')}
                    </label>
                    <select
                      value={parcelDetails.irrigation_type}
                      onChange={(e) => setParcelDetails(prev => ({
                        ...prev,
                        irrigation_type: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">{t('map.select')}</option>
                      {irrigationTypes.map(type => {
                        const irr = type as { id?: string; value?: string; name?: string; name_fr?: string };
                        const key = irr.id || irr.value || '';
                        const value = irr.value || '';
                        const label = irr.name_fr || irr.name || irr.value || '';
                        return (
                          <option key={key} value={value}>{label}</option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Crop Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    {t('map.cropAndPlanting')}
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('map.cropCategory')}
                    </label>
                    <select
                      value={parcelDetails.crop_category}
                      onChange={(e) => {
                        setTreeFamily('');
                        setParcelDetails(prev => ({
                          ...prev,
                          crop_category: e.target.value,
                          crop_type: '', // Reset dependent fields
                          variety: '',
                          planting_system: ''
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">{t('map.select')}</option>
                      {availableCropCategories.map(category => {
                        const cat = category as { id?: string; value?: string; name?: string; name_fr?: string };
                        const key = cat.id || cat.value || '';
                        const value = cat.value || '';
                        const label = cat.name_fr || cat.name || cat.value || '';
                        return (
                          <option key={key} value={value}>{label}</option>
                        );
                      })}
                    </select>
                  </div>

                  {parcelDetails.crop_category === 'trees' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('map.treeFamily', "Famille d'arbres")}
                      </label>
                      <select
                        value={treeFamily}
                        onChange={(e) => {
                          setTreeFamily(e.target.value);
                          setParcelDetails(prev => ({ ...prev, crop_type: '' }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">{t('map.treeFamilyAll', 'Toutes les familles')}</option>
                        {Object.keys(TREE_CATEGORIES).map(family => (
                          <option key={family} value={family}>{family}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {parcelDetails.crop_category && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('map.cropType')}
                      </label>
                      {availableCropTypes.length > 0 ? (
                        <select
                          value={parcelDetails.crop_type}
                          onChange={(e) => setParcelDetails(prev => ({
                            ...prev,
                            crop_type: e.target.value,
                            variety: '' // Reset variety when crop changes
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">{t('map.select')}</option>
                          {availableCropTypes.map(crop => {
                            if (typeof crop === 'string') {
                              return (
                                <option key={crop} value={crop}>
                                  {crop}
                                </option>
                              );
                            }
                            const cropType = crop as CropType;
                            const key = cropType.id;
                            const value = cropType.value;
                            const label = cropType.name || cropType.name_fr || cropType.value;
                            return (
                              <option key={key} value={value}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={parcelDetails.crop_type}
                          onChange={(e) => setParcelDetails(prev => ({
                            ...prev,
                            crop_type: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                          placeholder={t('map.cropTypePlaceholder')}
                        />
                      )}
                    </div>
                  )}

                  {parcelDetails.crop_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('map.variety')}
                      </label>
                      {availableVarieties.length > 0 ? (
                        <select
                          value={parcelDetails.variety}
                          onChange={(e) => setParcelDetails(prev => ({
                            ...prev,
                            variety: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">{t('map.select')}</option>
                          {availableVarieties.map(variety => {
                            if (typeof variety === 'string') {
                              return (
                                <option key={variety} value={variety}>
                                  {variety}
                                </option>
                              );
                            }
                            const varietyObj = variety as Variety;
                            return (
                              <option key={varietyObj.id} value={varietyObj.value}>
                                {varietyObj.name || varietyObj.name_fr || varietyObj.value}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={parcelDetails.variety}
                          onChange={(e) => setParcelDetails(prev => ({
                            ...prev,
                            variety: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                          placeholder={t('map.varietyPlaceholder', 'Saisir la variété...')}
                        />
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('parcels.plantingType')}
                    </label>
                    <select
                      value={parcelDetails.planting_type}
                      onChange={(e) => setParcelDetails(prev => ({
                        ...prev,
                        planting_type: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">{t('map.select')}</option>
                      <option value="traditional">{t('parcels.plantingTypes.traditional')}</option>
                      <option value="intensive">{t('parcels.plantingTypes.intensive')}</option>
                      <option value="super_intensive">{t('parcels.plantingTypes.super_intensive')}</option>
                      <option value="organic">{t('parcels.plantingTypes.organic')}</option>
                    </select>
                  </div>

                  {parcelDetails.crop_category === 'trees' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('map.rootstock')}
                      </label>
                      <input
                        type="text"
                        value={parcelDetails.rootstock}
                        onChange={(e) => setParcelDetails(prev => ({
                          ...prev,
                          rootstock: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                        placeholder={t('map.rootstockPlaceholder')}
                      />
                    </div>
                  )}
                </div>

                {/* Planting System — always visible */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Sprout className="w-4 h-4" />
                    {t('map.plantingSystem')}
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('map.plantingDate')}
                    </label>
                    <input
                      type="date"
                      value={parcelDetails.planting_date}
                      onChange={(e) => setParcelDetails(prev => ({
                        ...prev,
                        planting_date: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    />
                    {parcelDetails.planting_date && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('map.plantingYear')}: {new Date(parcelDetails.planting_date).getFullYear()}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('map.systemType')}
                    </label>
                    <select
                      value={parcelDetails.planting_system}
                      onChange={(e) => setParcelDetails(prev => ({
                        ...prev,
                        planting_system: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">{t('map.select')}</option>
                      {availablePlantingSystems.map((system, idx) => (
                        <option key={idx} value={system.type}>
                          {system.type} ({system.spacing})
                        </option>
                      ))}
                    </select>
                  </div>

                  {parcelDetails.planting_system && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('map.spacing')}
                          </label>
                          <input
                            type="text"
                            value={parcelDetails.spacing}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white"
                            readOnly
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('map.densityPlantsHa')}
                          </label>
                          <input
                            type="number"
                            value={parcelDetails.density_per_hectare}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white"
                            readOnly
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('map.totalPlants')}
                        </label>
                        <input
                          type="number"
                          value={parcelDetails.plant_count}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white"
                          readOnly
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('map.autoCalculatedFormula', { area: parcelDetails.area, density: parcelDetails.density_per_hectare })}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={cleanupDrawingState}
                >
                  {t('map.cancel')}
                </Button>
                <Button
                  onClick={handleSaveParcel}
                  disabled={isSavingParcel}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('map.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Location and Search Controls */}
          <div className="absolute top-4 right-4 space-y-2 z-20">
            <div className="flex flex-col space-y-2">
              {/* Location Button */}
              <Button
                size="icon"
                variant="outline"
                onClick={requestUserLocation}
                aria-label={t('map.goToMyPosition')}
                className="bg-white dark:bg-gray-800 shadow-md"
              >
                <Navigation className={`h-5 w-5 ${locationPermission === 'granted' ? 'text-blue-600' : 'text-gray-600'}`} />
              </Button>

              {/* Search Button */}
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowSearchBox(!showSearchBox)}
                aria-label={t('map.searchLocation')}
                className="bg-white dark:bg-gray-800 shadow-md"
              >
                <Search className="h-5 w-5 text-gray-600" />
              </Button>

              {/* Place Names Toggle Button */}
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowPlaceNames(!showPlaceNames)}
                aria-label={showPlaceNames ? t('map.hidePlaceNames') : t('map.showPlaceNames')}
                className="bg-white dark:bg-gray-800 shadow-md"
              >
                <MapPin className={`h-5 w-5 ${showPlaceNames ? 'text-blue-600' : 'text-gray-600'}`} />
              </Button>

              {/* Map Type Toggle Button */}
              <Button
                size="icon"
                variant="outline"
                onClick={() => setMapType(mapType === 'osm' ? 'satellite' : 'osm')}
                aria-label={mapType === 'osm' ? t('map.satelliteView') : t('map.mapView')}
                className="bg-white dark:bg-gray-800 shadow-md"
              >
                {mapType === 'osm' ? (
                  <Satellite className="h-5 w-5 text-gray-600" />
                ) : (
                  <div className="h-5 w-5 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-gray-600 rounded-sm"></div>
                  </div>
                )}
              </Button>

              {/* Full-Screen Toggle Button */}
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsFullScreen(!isFullScreen)}
                aria-label={isFullScreen ? t('map.exitFullscreenMode') : t('map.fullscreenMode')}
                className="bg-white dark:bg-gray-800 shadow-md"
              >
                {isFullScreen ? (
                  <Minimize2 className="h-5 w-5 text-gray-600" />
                ) : (
                  <Maximize2 className="h-5 w-5 text-gray-600" />
                )}
              </Button>
            </div>

            {/* Search Box */}
            {showSearchBox && !showNameDialog && !showParcelForm && !isParcelFormDialogOpen && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-80 z-30">
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={t('map.searchPlaceholder')}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    size="icon"
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setShowSearchBox(false);
                      setSearchResults([]);
                      setSearchQuery('');
                    }}
                    aria-label={t('common.close', 'Close')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.map((result) => (
                      <div
                        key={result.place_id}
                        onClick={() => goToSearchResult(result)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.display_name.split(',')[0]}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {result.display_name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('map.noResultsFound')}
                  </p>
                )}
              </div>
            )}
          </div>

          {farmId && enableDrawing && !showNameDialog && !showParcelForm && !isParcelFormDialogOpen && (
            <div className="absolute top-4 left-4 space-y-3 z-10">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('map.drawInstructions')}
                </p>

                <div className="flex items-center space-x-2 mb-3">
                  <Button
                    size="sm"
                    variant={drawingMode === 'assisted' ? 'default' : 'outline'}
                    onClick={() => setDrawingMode(drawingMode === 'manual' ? 'assisted' : 'manual')}
                  >
                    <Wand2 className="h-4 w-4" />
                    <span>{t('map.assistedMode')}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant={autoSnapEnabled ? 'default' : 'outline'}
                    onClick={() => setAutoSnapEnabled(!autoSnapEnabled)}
                    className={autoSnapEnabled ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    <Grid3x3 className="h-4 w-4" />
                    <span>{t('map.magnetism')}</span>
                  </Button>
                </div>

                {calculatedArea > 0 && (
                  <div className="text-xs space-y-1 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('map.area')}: <span className="font-semibold text-gray-900 dark:text-white">{roundToTwoDecimals(calculatedArea)} ha</span>
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('map.perimeter')}: <span className="font-semibold text-gray-900 dark:text-white">{roundToTwoDecimals(calculatedPerimeter)} m</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Satellite Indices Dialog */}
          {showIndicesDialog && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Satellite className="h-5 w-5 text-blue-600" />
                  <span>{t('map.calculateVegetationIndices')}</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('map.analysisPeriod')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('map.startDate')}</label>
                        <input
                          type="date"
                          value={dateRange.start_date}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('map.endDate')}</label>
                        <input
                          type="date"
                          value={dateRange.end_date}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('map.indicesToCalculate')}
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-3">
                      {availableIndices.map((index) => (
                        <label key={index} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedIndices.includes(index)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIndices(prev => [...prev, index]);
                              } else {
                                setSelectedIndices(prev => prev.filter(i => i !== index));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-gray-700 dark:text-gray-300">{index}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {indicesError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{indicesError}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setShowIndicesDialog(false)}
                  >
                    {t('map.cancel')}
                  </Button>
                  <Button
                    onClick={handleCalculateIndices}
                    disabled={indicesLoading || selectedIndices.length === 0}
                  >
                    {indicesLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    <span>{t('map.calculate')}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Time Series Dialog */}
          {showTimeSeriesDialog && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[500px]">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span>{t('map.timeSeriesAnalysis')}</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('map.analysisPeriod')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('map.startDate')}</label>
                        <input
                          type="date"
                          value={dateRange.start_date}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('map.endDate')}</label>
                        <input
                          type="date"
                          value={dateRange.end_date}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('map.indexToAnalyze')}
                    </label>
                    <select
                      value={selectedTimeSeriesIndex}
                      onChange={(e) => setSelectedTimeSeriesIndex(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {availableIndices.map((index) => (
                        <option key={index} value={index}>{index}</option>
                      ))}
                    </select>
                  </div>

                  {indicesError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{indicesError}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setShowTimeSeriesDialog(false)}
                  >
                    {t('map.cancel')}
                  </Button>
                  <Button
                    onClick={handleGetTimeSeries}
                    disabled={indicesLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {indicesLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    <span>{t('map.analyze')}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedParcel && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <span>{selectedParcel.name}</span>
              </h3>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => setShowIndicesDialog(true)}
                  disabled={indicesLoading || !selectedParcel.boundary}
                >
                  <Satellite className="h-4 w-4" />
                  <span>{t('map.indices', 'Indices')}</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowTimeSeriesDialog(true)}
                  disabled={indicesLoading || !selectedParcel.boundary}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>{t('map.timeSeries')}</span>
                </Button>
                {/* Delete functionality removed - handled in parent component */}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start space-x-3">
                <Ruler className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('map.area')}</p>
                  <p className="text-lg font-semibold">{selectedParcel.area} ha</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Tree className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('map.trees')}</p>
                  <p className="text-lg font-semibold">{selectedParcel.trees_count || 0}</p>
                  <p className="text-sm text-gray-500">
                    {selectedParcel.planting_density} {t('map.treesPerHa')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Droplets className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('map.irrigation')}</p>
                  <p className="text-lg font-semibold">{selectedParcel.irrigation_type}</p>
                </div>
              </div>

              {selectedParcel.varieties && (
                <div className="flex items-start space-x-3">
                  <Tree className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('map.varieties')}</p>
                    <p className="text-lg font-semibold">{selectedParcel.varieties.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Satellite Indices Results */}
            {indicesResults.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-md font-semibold mb-3 flex items-center space-x-2">
                  <Satellite className="h-4 w-4 text-blue-600" />
                  <span>{t('map.vegetationIndices')}</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {indicesResults.map((result, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {result.index}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleExportIndexMap(result.index)}
                          aria-label={t('map.downloadMap')}
                          className="h-auto w-auto p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {result.value.toFixed(3)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Series Results */}
            {timeSeriesResults && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-md font-semibold mb-3 flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <span>{t('map.timeSeries')} - {timeSeriesResults.index}</span>
                </h4>

                {timeSeriesResults.statistics && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{t('map.average')}</p>
                      <p className="text-lg font-semibold">{timeSeriesResults.statistics.mean.toFixed(3)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{t('map.min')}</p>
                      <p className="text-lg font-semibold">{timeSeriesResults.statistics.min.toFixed(3)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{t('map.max')}</p>
                      <p className="text-lg font-semibold">{timeSeriesResults.statistics.max.toFixed(3)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{t('map.median')}</p>
                      <p className="text-lg font-semibold">{timeSeriesResults.statistics.median.toFixed(3)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{t('map.standardDeviation')}</p>
                      <p className="text-lg font-semibold">{timeSeriesResults.statistics.std.toFixed(3)}</p>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {timeSeriesResults.data.map((point, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-300">
                          {new Date(point.date).toLocaleDateString()}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {point.value.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default MapComponent;
