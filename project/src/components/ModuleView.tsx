import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight, FlaskRound as Flask, Wifi, Satellite, BarChart as ChartBar, Database, Brain, FileSpreadsheet, Sprout } from 'lucide-react';
import type { Module, SensorData } from '../types';
import SensorChart from './SensorChart';
import Recommendations from './Recommendations';
import { useRecommendations } from '../hooks/useRecommendations';
import WeatherForecast from './WeatherForecast';
import ProductApplications from './ProductApplications';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface ModuleViewProps {
  module: Module;
  sensorData: SensorData[];
}

const ModuleView: React.FC<ModuleViewProps> = ({ module, sensorData }) => {
  const { recommendations, loading, error } = useRecommendations(module, sensorData);
  const [activeTab, setActiveTab] = useState('overview');
  const [cropId, setCropId] = useState<string | null>(null);

  useEffect(() => {
    if (module.id === 'fruit-trees') {
      createFruitTreesCrop();
    }
  }, [module.id]);

  const createFruitTreesCrop = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: farms } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!farms) return;

      const { data: existingCrop } = await supabase
        .from('crops')
        .select('id')
        .eq('farm_id', farms.id)
        .eq('type', 'fruit-trees')
        .single();

      if (existingCrop) {
        setCropId(existingCrop.id);
        return;
      }

      const { data: newCrop, error } = await supabase
        .from('crops')
        .insert({
          name: 'Arbres Fruitiers',
          type: 'fruit-trees',
          farm_id: farms.id,
          status: 'growing',
          field_id: 'default',
          planting_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      if (newCrop) {
        setCropId(newCrop.id);
      }
    } catch (error) {
      console.error('Error creating fruit trees crop:', error);
    }
  };

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

  const tabs = module.id === 'fruit-trees' ? [
    { id: 'overview', name: 'Vue d\'ensemble', icon: ChartBar },
    { id: 'soil', name: 'Analyse Sol', icon: Flask },
    { id: 'sensors', name: 'Capteurs', icon: Wifi },
    { id: 'satellite', name: 'Imagerie', icon: Satellite },
    { id: 'yield', name: 'Rendement', icon: TrendingUp },
    { id: 'applications', name: 'Applications', icon: Sprout },
    { id: 'products', name: 'Produits', icon: Database },
    { id: 'ai', name: 'IA', icon: Brain },
    { id: 'reports', name: 'Rapports', icon: FileSpreadsheet },
  ] : [];

  const renderFruitTreesContent = () => {
    switch (activeTab) {
      case 'applications':
        return <ProductApplications />;

      case 'soil':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Analyse Physique</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Texture</span>
                    <span>Limono-sableuse</span>
                  </div>
                  <div className="flex justify-between">
                    <span>pH</span>
                    <span>6.8</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Matière organique</span>
                    <span>2.5%</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Analyse Chimique</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Azote (N)</span>
                    <span>1.2 g/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phosphore (P)</span>
                    <span>0.8 g/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Potassium (K)</span>
                    <span>1.5 g/kg</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Recommandations</h4>
                <div className="space-y-2 text-sm">
                  <p>• Apport de compost: 20t/ha</p>
                  <p>• Chaulage: 2t/ha</p>
                  <p>• Engrais NPK: 800kg/ha</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'sensors':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Sol</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Humidité</span>
                    <span>32%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Température</span>
                    <span>18°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>pH</span>
                    <span>6.8</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Air</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Température</span>
                    <span>22°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Humidité</span>
                    <span>65%</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Irrigation</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>pH</span>
                    <span>7.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EC</span>
                    <span>1.2 mS/cm</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Météo</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Pluviométrie</span>
                    <span>2.5 mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vent</span>
                    <span>12 km/h</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold mb-4">Historique des mesures</h4>
              <div className="h-64">
                <SensorChart data={sensorData} />
              </div>
            </div>
          </div>
        );

      case 'satellite':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">NDVI</h4>
                <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                  Carte NDVI
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Indice de végétation moyen: 0.72
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">NDRE</h4>
                <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                  Carte NDRE
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Indice de chlorophylle moyen: 0.45
                </div>
              </div>
            </div>
          
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <WeatherForecast latitude={31.7917} longitude={-7.0926} />
            </div>
          </div>
        );

      case 'yield':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Prévisions</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Rendement prévu</span>
                    <span>35 t/ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Calibre moyen</span>
                    <span>75-80 mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date récolte estimée</span>
                    <span>15/09/2025</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Historique</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>2024</span>
                    <span>32 t/ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2023</span>
                    <span>28 t/ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2022</span>
                    <span>30 t/ha</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Engrais</h4>
                <div className="space-y-2 text-sm">
                  <p>• NPK 15-15-15</p>
                  <p>• Nitrate de calcium</p>
                  <p>• Sulfate de potassium</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Amendements</h4>
                <div className="space-y-2 text-sm">
                  <p>• Compost</p>
                  <p>• Chaux agricole</p>
                  <p>• Fumier composté</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Foliaires</h4>
                <div className="space-y-2 text-sm">
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
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <Recommendations
                recommendations={recommendations}
                loading={loading}
                error={error}
              />
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">État des parcelles</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Verger A</span>
                    <span className="text-green-500">Optimal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verger B</span>
                    <span className="text-yellow-500">Attention</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Interventions prévues</h4>
                <div className="space-y-2 text-sm">
                  <p>• Taille d'été: 20/06/2025</p>
                  <p>• Traitement foliaire: 25/06/2025</p>
                  <p>• Analyse sol: 01/07/2025</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
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
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
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

      {module.id === 'fruit-trees' && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {renderFruitTreesContent()}
    </div>
  );
};

export default ModuleView;