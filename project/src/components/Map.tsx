import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import Circle from 'ol/geom/Circle';
import { fromLonLat, transform } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import Overlay from 'ol/Overlay';
import Draw from 'ol/interaction/Draw';
import type { SensorData } from '../types';
import { useParcels } from '../hooks/useParcels';
import { useSatelliteIndices } from '../hooks/useSatelliteIndices';
import { MapPin, Ruler, Trees as Tree, Droplets, Satellite, Download, BarChart3, Wand2, Grid3x3, Navigation, Search, X, Loader2, Trash2 } from 'lucide-react';
import { ParcelAutomation, ParcelDrawingAssist, parcelStyles } from '../utils/parcelAutomation';
import { getCurrentPosition, searchMoroccanLocation, searchResultToOLCoordinates, type SearchResult } from '../utils/geocoding';

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
  onParcelAdded?: () => void;
  selectedParcelId?: string | null;
  onParcelSelect?: (parcelId: string) => void;
  parcels?: any[]; // Allow passing parcels as prop
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
  parcels: propParcels
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [parcelName, setParcelName] = useState('');
  const [tempBoundary, setTempBoundary] = useState<number[][]>([]);
  const [showParcelForm, setShowParcelForm] = useState(false);
  const [parcelDetails, setParcelDetails] = useState({
    soil_type: '',
    area: 0,
    planting_density: 0,
    irrigation_type: ''
  });
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('osm');
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
  const [timeSeriesResults, setTimeSeriesResults] = useState<TimeSeriesResult | null>(null);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const { addParcel, deleteParcel, parcels: hookParcels } = farmId ? useParcels(farmId) : { addParcel: null, deleteParcel: null, parcels: [] };

  // Use prop parcels if provided, otherwise fall back to hook parcels
  const parcels = propParcels || hookParcels;
  const { 
    calculateIndices, 
    getTimeSeries, 
    exportIndexMap, 
    loading: indicesLoading, 
    error: indicesError,
    availableIndices,
    loadAvailableIndices 
  } = useSatelliteIndices();

  // Load available indices on component mount
  useEffect(() => {
    loadAvailableIndices();

    // Check location permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state as 'prompt' | 'granted' | 'denied');
      });
    }
  }, [loadAvailableIndices]);

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
          features.forEach(f => {
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
        console.warn(`Parcel ${selectedParcelId} not found on map. It may not have boundary data.`);

        // Try to find the parcel in the parcels array and center on it if it has boundary data
        const parcel = parcels.find(p => p.id === selectedParcelId);
        if (parcel && parcel.boundary && parcel.boundary.length > 0) {
          const firstCoord = parcel.boundary[0];
          let coords;

          if (Math.abs(firstCoord[0]) > 20000 || Math.abs(firstCoord[1]) > 20000) {
            // Already in EPSG:3857
            coords = parcel.boundary.map(coord => [coord[0], coord[1]]);
          } else {
            // Convert from geographic
            coords = parcel.boundary.map(coord => fromLonLat([coord[0], coord[1]]));
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
    } catch (error) {
      console.error('Location error:', error);
      setLocationPermission('denied');
      alert(error instanceof Error ? error.message : 'Could not get your location');
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
    if (!mapRef.current) return;

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    // OpenStreetMap layer
    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: mapType === 'osm'
    });

    // Satellite layer (using ESRI World Imagery - free)
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attributions: 'Tiles © Esri'
      }),
      visible: mapType === 'satellite'
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        osmLayer,
        satelliteLayer,
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([center[1], center[0]]),
        zoom: 6,
      }),
    });

    // Add layer switcher control
    const layerSwitcher = document.createElement('div');
    layerSwitcher.className = 'layer-switcher';
    layerSwitcher.style.position = 'absolute';
    layerSwitcher.style.top = '10px';
    layerSwitcher.style.right = '10px';
    layerSwitcher.style.backgroundColor = 'white';
    layerSwitcher.style.padding = '5px';
    layerSwitcher.style.borderRadius = '4px';
    layerSwitcher.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

    const switchButton = document.createElement('button');
    switchButton.textContent = mapType === 'osm' ? 'Vue Satellite' : 'Vue Carte';
    switchButton.className = 'px-3 py-1 bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50';
    switchButton.onclick = () => {
      const newType = mapType === 'osm' ? 'satellite' : 'osm';
      setMapType(newType);
      osmLayer.setVisible(newType === 'osm');
      satelliteLayer.setVisible(newType === 'satellite');
      switchButton.textContent = newType === 'osm' ? 'Vue Satellite' : 'Vue Carte';
    };

    layerSwitcher.appendChild(switchButton);
    map.getViewport().appendChild(layerSwitcher);

    const popup = new Overlay({
      element: popupRef.current!,
      positioning: 'bottom-center',
      offset: [0, -10],
      autoPan: true,
    });
    map.addOverlay(popup);

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
          tempFeatures.forEach(f => vectorSourceRef.current?.removeFeature(f));
        }
      });

      draw.on('drawend', (event) => {
        const feature = event.feature;
        const geometry = feature.getGeometry();
        if (geometry instanceof Polygon) {
          const area = ParcelAutomation.calculateArea(geometry);
          const perimeter = ParcelAutomation.calculatePerimeter(geometry);


          setCalculatedArea(area);
          setCalculatedPerimeter(perimeter);

          const coordinates = geometry.getCoordinates()[0];
          // Store coordinates in EPSG:3857 format (Web Mercator) for consistency
          let boundary = coordinates.map((coord: number[]) => [coord[0], coord[1]]);

          console.log('Drawing coordinates (EPSG:3857):', boundary[0], 'to', boundary[boundary.length - 1]);

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
            alert(`Erreur de dessin: ${validation.errors.join(', ')}`);
            vectorSource.removeFeature(feature);
            return;
          }

          setTempBoundary(boundary);
          setParcelDetails(prev => ({ ...prev, area, calculated_area: area }));
          setShowNameDialog(true);
        }
      });
    }

    vectorSourceRef.current = vectorSource;

    // Add existing parcels as polygons on the map
    console.log('Rendering parcels on map:', parcels.length, 'parcels'); // Debug

    parcels.forEach(parcel => {
      console.log('Processing parcel:', parcel.name, 'has boundary:', !!parcel.boundary, 'sample coord:', parcel.boundary?.[0]); // Debug
      if (parcel.boundary && parcel.boundary.length > 0) {
        // Check if coordinates are already in projected format (EPSG:3857) or geographic (EPSG:4326)
        const firstCoord = parcel.boundary[0];
        let coordinates;

        // If coordinates have large absolute values (> 20000), they're likely already in Web Mercator (EPSG:3857)
        // Geographic coordinates should be between -180 to 180 for longitude and -90 to 90 for latitude
        if (Math.abs(firstCoord[0]) > 20000 || Math.abs(firstCoord[1]) > 20000) {
          console.log(`EPSG:3857 detected - Using coordinates as-is: [${firstCoord[0]}, ${firstCoord[1]}]`);
          coordinates = parcel.boundary.map(coord => [coord[0], coord[1]]);
        } else {
          console.log(`Geographic coords detected - Converting to EPSG:3857: [${firstCoord[0]}, ${firstCoord[1]}]`);
          coordinates = parcel.boundary.map(coord => fromLonLat([coord[0], coord[1]]));
        }

        console.log('Final coordinates for rendering:', coordinates[0], 'to', coordinates[coordinates.length - 1]);

        // Test coordinate conversion - what would this look like in geographic coords?
        const testCoordGeo = transform([coordinates[0][0], coordinates[0][1]], 'EPSG:3857', 'EPSG:4326');
        console.log('First coordinate converted to geographic (lon, lat):', testCoordGeo);

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

    sensors.forEach(sensor => {
      if (!sensor.location) return;

      const coordinates = sensor.location.split(',').map(Number);
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
      const feature = map.forEachFeatureAtPixel(event.pixel, feature => feature);

      if (feature) {
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
              vectorSource.getFeatures().forEach(f => {
                if (f !== feature && f.get('type') === 'Parcelle') {
                  f.setStyle(parcelStyles.default);
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
            popup.setPosition(center);
            if (popupRef.current) {
              popupRef.current.innerHTML = content;
              popupRef.current.style.display = 'block';
            }
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

            popup.setPosition(coordinates);
            if (popupRef.current) {
              popupRef.current.innerHTML = content;
              popupRef.current.style.display = 'block';
            }
          }
        }
      } else {
        if (popupRef.current) {
          popupRef.current.style.display = 'none';
        }
        // Remove highlight from all parcels
        vectorSource.getFeatures().forEach(f => {
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
          coords = selectedParcel.boundary.map(coord => [coord[0], coord[1]]);
        } else {
          // Convert from geographic
          coords = selectedParcel.boundary.map(coord => fromLonLat([coord[0], coord[1]]));
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

          parcel.boundary!.forEach(coord => {
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
      map.setTarget(undefined);
    };
  }, [center, zones, sensors, parcels, farmId, enableDrawing, mapType, drawingMode, autoSnapEnabled, selectedParcelId, onParcelSelect]);

  const handleSaveParcel = async () => {
    if (!addParcel || !parcelName || tempBoundary.length === 0) return;

    console.log('Saving parcel with boundary:', tempBoundary[0], 'to', tempBoundary[tempBoundary.length - 1]);

    try {
      const normalizedIrrigation = normalizeIrrigationType(parcelDetails.irrigation_type);
      await addParcel(parcelName, tempBoundary, {
        ...parcelDetails,
        irrigation_type: normalizedIrrigation,
        calculated_area: calculatedArea,
        perimeter: calculatedPerimeter
      });
      setShowNameDialog(false);
      setShowParcelForm(false);
      setParcelName('');
      setTempBoundary([]);
      setParcelDetails({
        soil_type: '',
        area: 0,
        planting_density: 0,
        irrigation_type: ''
      });
      setCalculatedArea(0);
      setCalculatedPerimeter(0);

      // Call the callback if provided
      if (onParcelAdded) {
        onParcelAdded();
      }
    } catch (error) {
      console.error('Error saving parcel:', error);
    }
  };

  const handleNameSubmit = () => {
    if (parcelName) {
      setShowNameDialog(false);
      setShowParcelForm(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full h-96">
        <div ref={mapRef} className="w-full h-full" />
        <div
          ref={popupRef}
          className="absolute bg-white rounded-lg shadow-lg hidden"
          style={{ minWidth: '200px' }}
        />
        
        {farmId && enableDrawing && showNameDialog && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Nommer la parcelle</h3>
              <input
                type="text"
                value={parcelName}
                onChange={(e) => setParcelName(e.target.value)}
                placeholder="Nom de la parcelle"
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                autoFocus
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNameDialog(false);
                    setParcelName('');
                    setTempBoundary([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={handleNameSubmit}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  disabled={!parcelName}
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}

        {farmId && enableDrawing && showParcelForm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-[500px]">
              <h3 className="text-lg font-semibold mb-4">Détails de la parcelle: {parcelName}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de sol
                  </label>
                  <select
                    value={parcelDetails.soil_type}
                    onChange={(e) => setParcelDetails(prev => ({
                      ...prev,
                      soil_type: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Argileux">Argileux</option>
                    <option value="Limoneux">Limoneux</option>
                    <option value="Sableux">Sableux</option>
                    <option value="Argilo-limoneux">Argilo-limoneux</option>
                    <option value="Limono-sableux">Limono-sableux</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Surface (hectares)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={parcelDetails.area}
                      onChange={(e) => setParcelDetails(prev => ({
                        ...prev,
                        area: Number(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      min="0"
                      step="0.1"
                      readOnly
                    />
                    <span className="text-sm text-green-600 font-medium">Auto-calculée</span>
                  </div>
                  {calculatedPerimeter > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Périmètre: {calculatedPerimeter} m
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Densité de plantation (arbres/ha)
                  </label>
                  <input
                    type="number"
                    value={parcelDetails.planting_density}
                    onChange={(e) => setParcelDetails(prev => ({
                      ...prev,
                      planting_density: Number(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d'irrigation
                  </label>
                  <select
                    value={parcelDetails.irrigation_type}
                    onChange={(e) => setParcelDetails(prev => ({
                      ...prev,
                      irrigation_type: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="drip">Goutte-à-goutte</option>
                    <option value="sprinkler">Aspersion</option>
                    <option value="sprinkler">Micro-aspersion</option>
                    <option value="flood">Gravitaire</option>
                    <option value="none">Aucune</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowParcelForm(false);
                    setShowNameDialog(false);
                    setParcelName('');
                    setTempBoundary([]);
                    setParcelDetails({
                      soil_type: '',
                      area: 0,
                      planting_density: 0,
                      irrigation_type: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveParcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location and Search Controls */}
        <div className="absolute top-4 right-4 space-y-2" style={{ zIndex: 1000 }}>
          <div className="flex flex-col space-y-2">
            {/* Location Button */}
            <button
              onClick={requestUserLocation}
              className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              title="Aller à ma position"
            >
              <Navigation className={`h-5 w-5 ${locationPermission === 'granted' ? 'text-blue-600' : 'text-gray-600'}`} />
            </button>

            {/* Search Button */}
            <button
              onClick={() => setShowSearchBox(!showSearchBox)}
              className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              title="Rechercher un lieu"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Search Box */}
          {showSearchBox && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-80">
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Rechercher un lieu au Maroc..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setShowSearchBox(false);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
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
                  Aucun résultat trouvé
                </p>
              )}
            </div>
          )}
        </div>

        {farmId && enableDrawing && (
          <div className="absolute top-4 left-4 space-y-3">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Cliquez sur la carte et dessinez le contour de votre parcelle
              </p>

              <div className="flex items-center space-x-2 mb-3">
                <button
                  onClick={() => setDrawingMode(drawingMode === 'manual' ? 'assisted' : 'manual')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm ${
                    drawingMode === 'assisted'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Wand2 className="h-4 w-4" />
                  <span>Mode assisté</span>
                </button>

                <button
                  onClick={() => setAutoSnapEnabled(!autoSnapEnabled)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm ${
                    autoSnapEnabled
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Grid3x3 className="h-4 w-4" />
                  <span>Magnétisme</span>
                </button>
              </div>

              {calculatedArea > 0 && (
                <div className="text-xs space-y-1 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-gray-600 dark:text-gray-400">
                    Surface: <span className="font-semibold text-gray-900 dark:text-white">{calculatedArea} ha</span>
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Périmètre: <span className="font-semibold text-gray-900 dark:text-white">{calculatedPerimeter} m</span>
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
                <span>Calculer les Indices de Végétation</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Période d'analyse
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Date de début</label>
                      <input
                        type="date"
                        value={dateRange.start_date}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Date de fin</label>
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
                    Indices à calculer
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
                <button
                  onClick={() => setShowIndicesDialog(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCalculateIndices}
                  disabled={indicesLoading || selectedIndices.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
                >
                  {indicesLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>Calculer</span>
                </button>
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
                <span>Analyse de Série Temporelle</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Période d'analyse
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Date de début</label>
                      <input
                        type="date"
                        value={dateRange.start_date}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Date de fin</label>
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
                    Index à analyser
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
                <button
                  onClick={() => setShowTimeSeriesDialog(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleGetTimeSeries}
                  disabled={indicesLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 flex items-center space-x-2"
                >
                  {indicesLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>Analyser</span>
                </button>
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
              <button
                onClick={() => setShowIndicesDialog(true)}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                disabled={indicesLoading || !selectedParcel.boundary}
              >
                <Satellite className="h-4 w-4" />
                <span>Indices</span>
              </button>
              <button
                onClick={() => setShowTimeSeriesDialog(true)}
                className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                disabled={indicesLoading || !selectedParcel.boundary}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Série Temporelle</span>
              </button>
              {selectedParcel.id && deleteParcel && (
                <button
                  onClick={async () => {
                    if (confirm(`Êtes-vous sûr de vouloir supprimer la parcelle "${selectedParcel.name}" ?`)) {
                      try {
                        await deleteParcel(selectedParcel.id);
                        setSelectedParcel(null);
                        // Remove from map
                        if (vectorSourceRef.current) {
                          const features = vectorSourceRef.current.getFeatures();
                          const parcelFeature = features.find(f => f.get('parcelId') === selectedParcel.id);
                          if (parcelFeature) {
                            vectorSourceRef.current.removeFeature(parcelFeature);
                          }
                        }
                      } catch (error) {
                        alert('Erreur lors de la suppression de la parcelle');
                      }
                    }
                  }}
                  className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start space-x-3">
              <Ruler className="h-5 w-5 text-blue-500 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-600">Surface</p>
                <p className="text-lg font-semibold">{selectedParcel.area} ha</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Tree className="h-5 w-5 text-green-500 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-600">Arbres</p>
                <p className="text-lg font-semibold">{selectedParcel.trees_count || 0}</p>
                <p className="text-sm text-gray-500">
                  {selectedParcel.planting_density} arbres/ha
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Droplets className="h-5 w-5 text-blue-500 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-600">Irrigation</p>
                <p className="text-lg font-semibold">{selectedParcel.irrigation_type}</p>
              </div>
            </div>

            {selectedParcel.varieties && (
              <div className="flex items-start space-x-3">
                <Tree className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Variétés</p>
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
                <span>Indices de Végétation</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {indicesResults.map((result, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {result.index}
                      </span>
                      <button
                        onClick={() => handleExportIndexMap(result.index)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Télécharger la carte"
                      >
                        <Download className="h-4 w-4" />
                      </button>
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
                <span>Série Temporelle - {timeSeriesResults.index}</span>
              </h4>
              
              {timeSeriesResults.statistics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Moyenne</p>
                    <p className="text-lg font-semibold">{timeSeriesResults.statistics.mean.toFixed(3)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Min</p>
                    <p className="text-lg font-semibold">{timeSeriesResults.statistics.min.toFixed(3)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Max</p>
                    <p className="text-lg font-semibold">{timeSeriesResults.statistics.max.toFixed(3)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Médiane</p>
                    <p className="text-lg font-semibold">{timeSeriesResults.statistics.median.toFixed(3)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Écart-type</p>
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
  );
};

export default MapComponent;