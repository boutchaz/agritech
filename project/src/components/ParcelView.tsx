import React, { useState } from 'react';
import { Droplets, Thermometer, Wind, FlaskRound as Flask, Calendar, LineChart, AlertTriangle, Leaf, Edit2 } from 'lucide-react';
import type { Parcel } from '../types';
import SoilAnalysisForm from './SoilAnalysisForm';

interface ParcelViewProps {
  parcel: Parcel;
  onSoilDataUpdate: (parcelId: string, soilData: SoilAnalysis) => void;
}

const ParcelView: React.FC<ParcelViewProps> = ({ parcel, onSoilDataUpdate }) => {
  const [showSoilForm, setShowSoilForm] = useState(false);

  const handleSoilDataSave = (soilData: SoilAnalysis) => {
    onSoilDataUpdate(parcel.id, soilData);
    setShowSoilForm(false);
  };

  if (showSoilForm) {
    return (
      <SoilAnalysisForm
        initialData={parcel.soilData}
        onSave={handleSoilDataSave}
        onCancel={() => setShowSoilForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {parcel.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Créée le {parcel.createdAt.toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Climate Data */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Climat</h3>
            <Thermometer className="h-6 w-6 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Température</span>
              <span>{parcel.climateData.temperature.current}°C</span>
            </div>
            <div className="flex justify-between">
              <span>Min/Max</span>
              <span>{parcel.climateData.temperature.min}°C / {parcel.climateData.temperature.max}°C</span>
            </div>
            <div className="flex justify-between">
              <span>Humidité</span>
              <span>{parcel.climateData.humidity.current}%</span>
            </div>
          </div>
        </div>

        {/* Soil Data */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sol</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSoilForm(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Edit2 className="h-5 w-5" />
              </button>
              <Flask className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Texture</span>
              <span>{parcel.soilData.physical.texture}</span>
            </div>
            <div className="flex justify-between">
              <span>pH</span>
              <span>{parcel.soilData.physical.ph}</span>
            </div>
            <div className="flex justify-between">
              <span>Matière organique</span>
              <span>{parcel.soilData.physical.organicMatter}%</span>
            </div>
          </div>
        </div>

        {/* Rainfall Data */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Précipitations</h3>
            <Droplets className="h-6 w-6 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Cette semaine</span>
              <span>{parcel.climateData.rainfall.lastWeek} mm</span>
            </div>
            <div className="flex justify-between">
              <span>Ce mois</span>
              <span>{parcel.climateData.rainfall.lastMonth} mm</span>
            </div>
            <div className="flex justify-between">
              <span>Annuel</span>
              <span>{parcel.climateData.rainfall.annual} mm</span>
            </div>
          </div>
        </div>

        {/* Wind Data */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Vent</h3>
            <Wind className="h-6 w-6 text-gray-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Vitesse</span>
              <span>{parcel.climateData.wind.speed} km/h</span>
            </div>
            <div className="flex justify-between">
              <span>Direction</span>
              <span>{parcel.climateData.wind.direction}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Soil Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Analyse du Sol</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSoilForm(true)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Edit2 className="h-5 w-5" />
              </button>
              <Leaf className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Composition Chimique</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Azote (N)</span>
                  <span>{parcel.soilData.chemical.nitrogen} g/kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Phosphore (P)</span>
                  <span>{parcel.soilData.chemical.phosphorus} g/kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Potassium (K)</span>
                  <span>{parcel.soilData.chemical.potassium} g/kg</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-medium mb-2">Recommandations</h4>
              <ul className="space-y-2">
                {parcel.soilData.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-green-500">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Climate Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tendances Climatiques</h3>
            <LineChart className="h-6 w-6 text-blue-500" />
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Température</h4>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="h-2 bg-blue-500 rounded-full"
                  style={{
                    width: `${(parcel.climateData.temperature.current / parcel.climateData.temperature.max) * 100}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>{parcel.climateData.temperature.min}°C</span>
                <span>{parcel.climateData.temperature.current}°C</span>
                <span>{parcel.climateData.temperature.max}°C</span>
              </div>
            </div>
            <div className="pt-4">
              <h4 className="font-medium mb-2">Humidité</h4>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="h-2 bg-blue-500 rounded-full"
                  style={{
                    width: `${(parcel.climateData.humidity.current / 100) * 100}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>0%</span>
                <span>{parcel.climateData.humidity.current}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Prochaines Actions</h3>
            <Calendar className="h-6 w-6 text-indigo-500" />
          </div>
          <ul className="space-y-3">
            <li className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                <span>Analyse du sol</span>
              </div>
              <span className="text-sm text-indigo-600 dark:text-indigo-400">Dans 3 jours</span>
            </li>
            <li className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Fertilisation</span>
              </div>
              <span className="text-sm text-green-600 dark:text-green-400">Dans 1 semaine</span>
            </li>
          </ul>
        </div>

        {/* Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Alertes</h3>
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <ul className="space-y-3">
            <li className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>Risque de gel nocturne</span>
              </div>
              <span className="text-sm text-yellow-600 dark:text-yellow-400">Cette nuit</span>
            </li>
            <li className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Précipitations prévues</span>
              </div>
              <span className="text-sm text-blue-600 dark:text-blue-400">Demain</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ParcelView;