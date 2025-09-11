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
import Circle from 'ol/geom/Circle';
import { fromLonLat } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import Overlay from 'ol/Overlay';
import Draw from 'ol/interaction/Draw';
import type { SensorData } from '../types';
import { useParcels } from '../hooks/useParcels';
import { MapPin, Ruler, Trees as Tree, Droplets } from 'lucide-react';

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
  cropId?: string;
}

interface ParcelDetails {
  name: string;
  area: number;
  soil_type: string;
  planting_density: number;
  irrigation_type: string;
  trees_count?: number;
  varieties?: string[];
}

const MapComponent: React.FC<MapProps> = ({ center, zones, sensors = [], cropId }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
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
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('satellite');
  const [selectedParcel, setSelectedParcel] = useState<ParcelDetails | null>(null);

  const { addParcel, parcels } = cropId ? useParcels(cropId) : { addParcel: null, parcels: [] };

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

    // Satellite layer (using Mapbox Satellite)
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
        maxZoom: 19
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

    if (cropId) {
      const draw = new Draw({
        source: vectorSource,
        type: 'Polygon',
      });
      map.addInteraction(draw);

      draw.on('drawend', (event) => {
        const feature = event.feature;
        const geometry = feature.getGeometry();
        if (geometry) {
          const coordinates = geometry.getCoordinates()[0];
          const boundary = coordinates.map(coord => [coord[1], coord[0]]);
          setTempBoundary(boundary);
          setShowNameDialog(true);
        }
      });
    }

    // Add test parcel for Bni Yagrine ferme
    const testParcelCoordinates = [
      [-7.589, 32.2424], // Example coordinates for Morocco
      [-7.5892, 32.2426],
      [-7.5894, 32.2424],
      [-7.5892, 32.2422],
      [-7.589, 32.2424]
    ];

    const testParcel = {
      id: 'test-parcel',
      name: 'Bni Yagrine ferme',
      boundary: testParcelCoordinates,
      details: {
        area: 2.5,
        soil_type: 'Argilo-calcaire',
        planting_density: 180, // 450 trees / 2.5 ha
        irrigation_type: 'Goutte-à-goutte',
        trees_count: 450,
        varieties: ['Haouzia', 'Menara']
      }
    };

    const coordinates = testParcel.boundary.map(coord => fromLonLat([coord[0], coord[1]]));
    const feature = new Feature({
      geometry: new Point(coordinates[0]),
      name: testParcel.name,
      type: 'Parcelle',
      details: testParcel.details
    });

    feature.setStyle(new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: '#22c55e' }),
        stroke: new Stroke({
          color: 'white',
          width: 2,
        }),
      }),
    }));

    vectorSource.addFeature(feature);

    parcels.forEach(parcel => {
      const coordinates = parcel.boundary.map(coord => fromLonLat([coord[1], coord[0]]));
      const feature = new Feature({
        geometry: new Point(coordinates[0]),
        name: parcel.name,
        type: 'Parcelle',
        details: parcel
      });

      feature.setStyle(new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color: '#22c55e' }),
          stroke: new Stroke({
            color: 'white',
            width: 2,
          }),
        }),
      }));

      vectorSource.addFeature(feature);
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
        const geometry = feature.getGeometry();
        if (geometry instanceof Point) {
          const coordinates = geometry.getCoordinates();
          const properties = feature.getProperties();
          
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
                  <p>Densité: ${details.planting_density || 'Non définie'} arbres/ha</p>
                  <p>Type de sol: ${details.soil_type || 'Non défini'}</p>
                  <p>Irrigation: ${details.irrigation_type || 'Non définie'}</p>
                  ${details.trees_count ? `<p>Nombre d'arbres: ${details.trees_count}</p>` : ''}
                  ${details.varieties ? `<p>Variétés: ${details.varieties.join(', ')}</p>` : ''}
                </div>
              `;
              setSelectedParcel({
                name: properties.name,
                ...details
              });
            }
          } else if (properties.properties) {
            const sensorProps = properties.properties;
            content = `
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
          }

          if (content) {
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
        setSelectedParcel(null);
      }
    });

    mapInstanceRef.current = map;

    // Center map on test parcel
    map.getView().setCenter(fromLonLat([testParcelCoordinates[0][0], testParcelCoordinates[0][1]]));
    map.getView().setZoom(15);

    // Set initial selected parcel
    setSelectedParcel({
      name: testParcel.name,
      ...testParcel.details
    });

    return () => {
      map.setTarget(undefined);
    };
  }, [center, zones, sensors, parcels, cropId, mapType]);

  const handleSaveParcel = async () => {
    if (!addParcel || !parcelName || tempBoundary.length === 0) return;

    try {
      await addParcel(parcelName, tempBoundary, parcelDetails);
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
        
        {cropId && showNameDialog && (
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

        {cropId && showParcelForm && (
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
                  <input
                    type="number"
                    value={parcelDetails.area}
                    onChange={(e) => setParcelDetails(prev => ({
                      ...prev,
                      area: Number(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.1"
                  />
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
                    <option value="Goutte-à-goutte">Goutte-à-goutte</option>
                    <option value="Aspersion">Aspersion</option>
                    <option value="Micro-aspersion">Micro-aspersion</option>
                    <option value="Gravitaire">Gravitaire</option>
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

        {cropId && (
          <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cliquez sur la carte et dessinez le contour de votre parcelle
            </p>
          </div>
        )}
      </div>

      {selectedParcel && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-green-600" />
            <span>{selectedParcel.name}</span>
          </h3>
          
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
        </div>
      )}
    </div>
  );
};

export default MapComponent;