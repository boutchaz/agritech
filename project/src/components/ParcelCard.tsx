import React, { useMemo, useCallback } from 'react';
import { TrendingUp, FlaskConical as Flask, Satellite, BarChart3 as ChartBar, FileSpreadsheet, MapPin, Droplets, Trees as Tree, DollarSign, Cloud } from 'lucide-react';
import type { SensorData } from '../types';
import SensorChart from './SensorChart';
import Recommendations from './Recommendations';
import { useRecommendations } from '../hooks/useRecommendations';
import ProductApplications from './ProductApplications';
import { useNavigate } from '@tanstack/react-router';
import IndicesCalculator from './SatelliteAnalysis/IndicesCalculator';
import TimeSeriesChart from './SatelliteAnalysis/TimeSeriesChart';
import StatisticsCalculator from './SatelliteAnalysis/StatisticsCalculator';
import IndexImageViewer from './SatelliteAnalysis/IndexImageViewer';
import ParcelReportGenerator from './ParcelReportGenerator';
import ParcelProfitability from './ParcelProfitability';
import WeatherAnalyticsView from './WeatherAnalytics/WeatherAnalyticsView';

interface Parcel {
  id: string;
  name: string;
  area: number | null;
  soil_type?: string | null;
  boundary?: number[][];
  tree_type?: string | null;
  tree_count?: number | null;
  planting_year?: number | null;
  variety?: string | null;
  rootstock?: string | null;
}

interface ParcelCardProps {
  parcel: Parcel;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  sensorData: SensorData[];
  isAssigned?: boolean;
  disableInnerScroll?: boolean;
}

const ParcelCard: React.FC<ParcelCardProps> = ({ parcel, activeTab, onTabChange, sensorData, isAssigned = false, disableInnerScroll = false }) => {
  const _navigate = useNavigate();

  // Memoize the module object to prevent infinite re-renders
  const fruitTreesModule = useMemo(() => ({ id: 'fruit-trees' }), []);
  const { recommendations, loading, error } = useRecommendations(fruitTreesModule as any, sensorData);

  const tabs = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: ChartBar },
    { id: 'soil', name: 'Analyse Sol', icon: Flask },
    // { id: 'sensors', name: 'Capteurs', icon: Wifi },
    { id: 'satellite', name: 'Imagerie', icon: Satellite },
    { id: 'weather', name: 'Météo & Climat', icon: Cloud },
    { id: 'profitability', name: 'Rentabilité', icon: DollarSign },
    // { id: 'fruit-trees', name: 'Arbres Fruitiers', icon: Tree },
    // { id: 'yield', name: 'Rendement', icon: TrendingUp },
    // { id: 'applications', name: 'Applications', icon: Sprout },
    // { id: 'products', name: 'Produits', icon: Database },
    // { id: 'ai', name: 'IA', icon: Brain },
    { id: 'reports', name: 'Rapports', icon: FileSpreadsheet },
  ];

  // Memoize parcel data to prevent recalculation on every render
  const data = useMemo(() => {
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
  }, [parcel.id]);

  // Memoize random values to prevent recalculation on every render
  const randomValues = useMemo(() => {
    const baseId = parseInt(parcel.id.slice(-1)) || 1;
    const seed = baseId; // Use parcel ID as seed for consistent "random" values
    return {
      ph: (6.5 + (seed * 0.1) % 1).toFixed(1),
      organicMatter: (2 + (seed * 0.2) % 2).toFixed(1),
      nitrogen: (1 + (seed * 0.05) % 0.5).toFixed(1),
      phosphorus: (0.5 + (seed * 0.05) % 0.5).toFixed(1),
      potassium: (1.2 + (seed * 0.06) % 0.6).toFixed(1),
      compost: Math.floor(15 + (seed * 2) % 10),
      lime: (1.5 + (seed * 0.1) % 1).toFixed(1),
      npk: Math.floor(700 + (seed * 20) % 200),
      soilMoisture: Math.floor((seed * 2) % 20 + 25),
      soilTemp: Math.floor((seed * 0.8) % 8 + 15),
      airTemp: Math.floor((seed * 1) % 10 + 18),
      airMoisture: Math.floor((seed * 2) % 20 + 55),
      satelliteNdvi: (0.6 + (seed * 0.03) % 0.3).toFixed(2),
      satelliteNdre: (0.35 + (seed * 0.025) % 0.25).toFixed(2),
      vegetation: seed % 2 === 0 ? 'optimal' : 'satisfaisant',
      expectedYield: Math.floor((seed * 1) % 10 + 30),
      totalVolume: (Math.floor((seed * 1) % 10 + 30) * (parcel.area || 1)).toFixed(1),
      irrigationStatus: seed % 2 === 0 ? 'Optimale' : 'Améliorable',
      irrigationColor: seed % 2 === 0 ? 'text-green-600' : 'text-yellow-600'
    };
  }, [parcel.id, parcel.area]);

  // Memoize tab click handler
  const handleTabClick = useCallback((tabId: string) => {
    onTabChange(tabId);
  }, [onTabChange]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Parcel Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                  {data.health}
                </div>
              </div>
            </div>

            {/* Quick Summary */}
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Résumé</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Surface:</span>
                  <span className="font-medium">{parcel.area ? `${parcel.area} ha` : 'Non définie'}</span>
                </div>
                {parcel.soil_type && (
                  <div className="flex justify-between">
                    <span>Type de sol:</span>
                    <span className="font-medium">{parcel.soil_type}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Dernière mise à jour:</span>
                  <span className="font-medium">{data.lastUpdate}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'soil':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Analyse Physique</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Texture du sol:</span>
                    <span className="font-medium">{parcel.soil_type || 'Limono-sableuse'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>pH:</span>
                    <span className="font-medium text-green-600">{randomValues.ph}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Matière organique:</span>
                    <span className="font-medium">{randomValues.organicMatter}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Analyse Chimique</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Azote (N):</span>
                    <span className="font-medium">{randomValues.nitrogen} g/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phosphore (P):</span>
                    <span className="font-medium">{randomValues.phosphorus} g/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Potassium (K):</span>
                    <span className="font-medium">{randomValues.potassium} g/kg</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Recommandations</h5>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Apport de compost: {randomValues.compost}t/ha</li>
                <li>• Chaulage: {randomValues.lime}t/ha</li>
                <li>• Engrais NPK: {randomValues.npk}kg/ha</li>
              </ul>
            </div>
          </div>
        );

      case 'sensors':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                <h5 className="font-medium mb-2 text-sm">Sol</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Humidité:</span>
                    <span className="font-medium">{randomValues.soilMoisture}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Température:</span>
                    <span className="font-medium">{randomValues.soilTemp}°C</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                <h5 className="font-medium mb-2 text-sm">Air</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Température:</span>
                    <span className="font-medium">{randomValues.airTemp}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Humidité:</span>
                    <span className="font-medium">{randomValues.airMoisture}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
              <h5 className="font-medium mb-3 text-sm">Graphique des mesures</h5>
              <div className="h-32">
                <SensorChart data={sensorData} />
              </div>
            </div>
          </div>
        );

      case 'satellite':
        return (
          <div className="space-y-6">
            {parcel.boundary ? (
              <>
                <IndexImageViewer
                  parcelId={parcel.id}
                  parcelName={parcel.name}
                  boundary={parcel.boundary}
                />
                <StatisticsCalculator
                  parcelId={parcel.id}
                  parcelName={parcel.name}
                  boundary={parcel.boundary}
                />
                <IndicesCalculator
                  parcelId={parcel.id}
                  parcelName={parcel.name}
                  boundary={parcel.boundary}
                />
                <TimeSeriesChart
                  parcelId={parcel.id}
                  parcelName={parcel.name}
                  boundary={parcel.boundary}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <Satellite className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Les données de délimitation de la parcelle sont requises pour l'analyse satellite.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Veuillez définir les limites de la parcelle pour accéder aux fonctionnalités d'imagerie satellite.
                </p>
              </div>
            )}
          </div>
        );

      case 'fruit-trees': {
        const currentYear = new Date().getFullYear();
        const treeAge = parcel.planting_year ? currentYear - parcel.planting_year : null;

        return (
          <div className="space-y-4">
            {parcel.tree_type ? (
              <>
                {/* Tree Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Tree className="w-5 h-5 text-green-600" />
                      Informations des Arbres
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="font-medium">{parcel.tree_type}</span>
                      </div>
                      {parcel.variety && (
                        <div className="flex justify-between">
                          <span>Variété:</span>
                          <span className="font-medium">{parcel.variety}</span>
                        </div>
                      )}
                      {parcel.rootstock && (
                        <div className="flex justify-between">
                          <span>Porte-greffe:</span>
                          <span className="font-medium">{parcel.rootstock}</span>
                        </div>
                      )}
                      {parcel.tree_count && (
                        <div className="flex justify-between">
                          <span>Nombre d'arbres:</span>
                          <span className="font-medium">{parcel.tree_count}</span>
                        </div>
                      )}
                      {parcel.planting_year && (
                        <div className="flex justify-between">
                          <span>Année de plantation:</span>
                          <span className="font-medium">{parcel.planting_year}</span>
                        </div>
                      )}
                      {treeAge && (
                        <div className="flex justify-between">
                          <span>Âge des arbres:</span>
                          <span className="font-medium">{treeAge} ans</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Métriques</h4>
                    <div className="space-y-2 text-sm">
                      {parcel.tree_count && parcel.area && (
                        <div className="flex justify-between">
                          <span>Densité:</span>
                          <span className="font-medium">
                            {Math.round(parcel.tree_count / parcel.area)} arbres/ha
                          </span>
                        </div>
                      )}
                      {treeAge && (
                        <div className="flex justify-between">
                          <span>Phase:</span>
                          <span className="font-medium">
                            {treeAge < 3 ? 'Jeune plantation' :
                             treeAge < 8 ? 'Développement' :
                             treeAge < 20 ? 'Production optimale' : 'Mature'}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>État sanitaire:</span>
                        <span className="font-medium text-green-600">Bon</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Age-based Recommendations */}
                {treeAge && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                      Recommandations selon l'âge ({treeAge} ans)
                    </h5>
                    <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      {treeAge < 3 && (
                        <>
                          <p>• Formation des arbres - taille de formation annuelle</p>
                          <p>• Irrigation régulière et fertilisation azotée</p>
                          <p>• Protection contre les ravageurs jeunes plants</p>
                        </>
                      )}
                      {treeAge >= 3 && treeAge < 8 && (
                        <>
                          <p>• Taille de fructification pour équilibrer croissance/production</p>
                          <p>• Surveillance sanitaire renforcée</p>
                          <p>• Ajustement de la fertilisation selon l'analyse foliaire</p>
                        </>
                      )}
                      {treeAge >= 8 && treeAge < 20 && (
                        <>
                          <p>• Optimisation de la production - éclaircissage si nécessaire</p>
                          <p>• Taille d'entretien et renouvellement du bois</p>
                          <p>• Gestion intégrée des ravageurs et maladies</p>
                        </>
                      )}
                      {treeAge >= 20 && (
                        <>
                          <p>• Taille de rajeunissement progressive</p>
                          <p>• Évaluation pour renouvellement de plantation</p>
                          <p>• Surveillance accrue des maladies du bois</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Seasonal Actions */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 dark:text-green-100 mb-3">
                    Actions saisonnières recommandées
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h6 className="font-medium text-green-800 dark:text-green-200 mb-2">Printemps</h6>
                      <ul className="text-green-700 dark:text-green-300 space-y-1">
                        <li>• Taille de nettoyage après floraison</li>
                        <li>• Application d'engrais de printemps</li>
                        <li>• Traitement préventif contre les maladies</li>
                      </ul>
                    </div>
                    <div>
                      <h6 className="font-medium text-green-800 dark:text-green-200 mb-2">Été</h6>
                      <ul className="text-green-700 dark:text-green-300 space-y-1">
                        <li>• Surveillance irrigation et stress hydrique</li>
                        <li>• Éclaircissage des fruits si nécessaire</li>
                        <li>• Taille verte pour aérer la ramure</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Tree className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Cette parcelle n'est pas configurée pour les arbres fruitiers.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Ajoutez les informations sur les arbres pour accéder aux recommandations spécialisées.
                </p>
              </div>
            )}
          </div>
        );
      }

      case 'yield':
        return (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
              <h5 className="font-medium mb-3">Prévisions 2025</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Rendement prévu:</span>
                  <span className="font-semibold text-green-600">{randomValues.expectedYield} t/ha</span>
                </div>
                <div className="flex justify-between">
                  <span>Volume total:</span>
                  <span className="font-medium">{randomValues.totalVolume} tonnes</span>
                </div>
                <div className="flex justify-between">
                  <span>Date récolte:</span>
                  <span className="font-medium">15/09/2025</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <h6 className="font-medium text-amber-900 dark:text-amber-100 mb-2 text-sm">Facteurs influents</h6>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>Irrigation:</span>
                  <span className={randomValues.irrigationColor}>
                    {randomValues.irrigationStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Santé arbres:</span>
                  <span className="text-green-600">Bonne</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'applications':
        return (
          <div className="p-4">
            <ProductApplications />
          </div>
        );

      case 'products':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                <h5 className="font-medium mb-2 text-sm">Engrais</h5>
                <div className="space-y-1 text-xs">
                  <p>• NPK 15-15-15</p>
                  <p>• Nitrate de calcium</p>
                  <p>• Sulfate de potassium</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                <h5 className="font-medium mb-2 text-sm">Amendements</h5>
                <div className="space-y-1 text-xs">
                  <p>• Compost</p>
                  <p>• Chaux agricole</p>
                  <p>• Fumier composté</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                <h5 className="font-medium mb-2 text-sm">Foliaires</h5>
                <div className="space-y-1 text-xs">
                  <p>• Oligo-éléments</p>
                  <p>• Calcium foliaire</p>
                  <p>• Biostimulants</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="p-4">
            <Recommendations
              recommendations={recommendations}
              loading={loading}
              error={error}
            />
          </div>
        );

      case 'weather':
        return parcel.boundary && parcel.boundary.length > 0 ? (
          <WeatherAnalyticsView
            parcelBoundary={parcel.boundary}
            parcelName={parcel.name}
          />
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <Cloud className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Les données de localisation de la parcelle sont requises pour l'analyse météorologique.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Veuillez définir les limites de la parcelle pour accéder aux analyses météo & climatiques.
            </p>
          </div>
        );

      case 'profitability':
        return (
          <ParcelProfitability
            parcelId={parcel.id}
            parcelName={parcel.name}
          />
        );

      case 'reports':
        return (
          <ParcelReportGenerator
            parcelId={parcel.id}
            parcelName={parcel.name}
            parcelData={{
              parcel,
              metrics: {
                ndvi: parseFloat(data.ndvi),
                irrigation: data.irrigation,
                yield: parseFloat(data.yield),
                health: data.health,
                soil_moisture: randomValues.soilMoisture,
                soil_temp: randomValues.soilTemp
              },
              analysis: {
                soil: {
                  ph: parseFloat(randomValues.ph),
                  organicMatter: parseFloat(randomValues.organicMatter),
                  nitrogen: parseFloat(randomValues.nitrogen),
                  phosphorus: parseFloat(randomValues.phosphorus),
                  potassium: parseFloat(randomValues.potassium)
                },
                recommendations: [
                  `Apport de compost: ${randomValues.compost}t/ha`,
                  `Chaulage: ${randomValues.lime}t/ha`,
                  `Engrais NPK: ${randomValues.npk}kg/ha`
                ]
              }
            }}
          />
        );

      default:
        return <div>Contenu non disponible</div>;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 h-full w-full overflow-hidden overflow-x-hidden min-w-0 flex flex-col ${
      isAssigned
        ? `${data.healthBg} border-green-500 dark:border-green-400`
        : `${data.healthBg} border-gray-200 dark:border-gray-700 opacity-75`
    } transition-all duration-200`}
    style={{maxWidth: '100%'}}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2 w-full min-w-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {parcel.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {parcel.area ? `${parcel.area} hectares` : 'Superficie non définie'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isAssigned ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Assignée</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Non assignée</span>
              </div>
            )}
            <span className={`font-medium ${data.healthColor}`}>
              {data.health}
            </span>
          </div>
        </div>

        {/* Soil Type */}
        {parcel.soil_type && (
          <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Type de sol: {parcel.soil_type}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-hidden">
        <nav className="flex space-x-2 px-3 sm:px-4 overflow-x-auto overscroll-x-contain scrollbar-hide w-full min-w-0" style={{scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch'}}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                flex items-center space-x-1 py-3 px-1 border-b-2 font-medium text-xs whitespace-nowrap flex-shrink-0
                ${activeTab === tab.id
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className={`p-3 sm:p-4 flex-1 overflow-x-hidden ${disableInnerScroll ? 'overflow-y-visible' : 'overflow-y-auto'}`}>
        {renderTabContent()}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-750 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Dernière mise à jour</span>
          <span>{data.lastUpdate}</span>
        </div>
      </div>
    </div>
  );
};

export default ParcelCard;
