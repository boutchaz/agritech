import React, { useState } from 'react';
import { Droplets, AlertCircle, CheckCircle, Loader, TrendingUp } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getIrrigationSchedule, type IrrigationRequest } from '../lib/edge-functions-api';
import { supabase } from '../lib/supabase';

interface IrrigationSchedulingProps {
  parcelId: string;
  parcelName: string;
}

const IrrigationScheduling: React.FC<IrrigationSchedulingProps> = ({
  parcelId,
  parcelName
}) => {
  const [soilMoisture, setSoilMoisture] = useState<number>(50);
  const [growthStage, setGrowthStage] = useState<string>('vegetative');

  // Fetch current crop for the parcel
  const { data: currentCrop } = useQuery({
    queryKey: ['current-crop', parcelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crops')
        .select('id, name, planting_date, expected_harvest_date, crop_varieties(name, water_requirements)')
        .eq('parcel_id', parcelId)
        .eq('status', 'growing')
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Mutation to get irrigation schedule
  const scheduleMutation = useMutation({
    mutationFn: async (request: IrrigationRequest) => {
      return getIrrigationSchedule(request);
    },
  });

  const handleGenerateSchedule = () => {
    const request: IrrigationRequest = {
      parcel_id: parcelId,
      current_soil_moisture: soilMoisture,
      crop_data: {
        growth_stage: growthStage,
        water_requirements: currentCrop?.crop_varieties?.water_requirements === 'high' ? 150 :
                           currentCrop?.crop_varieties?.water_requirements === 'medium' ? 100 : 50,
        root_depth: 0.5
      }
    };

    scheduleMutation.mutate(request);
  };

  const schedule = scheduleMutation.data?.irrigation_schedule;
  const parcelInfo = scheduleMutation.data?.parcel_info;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          <span>Planification d'Irrigation</span>
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Obtenez des recommandations d'irrigation basées sur l'IA pour {parcelName}
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Humidité actuelle du sol (%)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              value={soilMoisture}
              onChange={(e) => setSoilMoisture(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-semibold text-gray-900 dark:text-white w-12 text-right">
              {soilMoisture}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Sec</span>
            <span>Optimal</span>
            <span>Saturé</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stade de croissance
          </label>
          <select
            value={growthStage}
            onChange={(e) => setGrowthStage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="seedling">Semis</option>
            <option value="vegetative">Végétatif</option>
            <option value="flowering">Floraison</option>
            <option value="fruiting">Fructification</option>
          </select>
        </div>

        {currentCrop && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>Culture actuelle:</strong> {currentCrop.name} ({currentCrop.crop_varieties?.name})
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Besoins en eau: {currentCrop.crop_varieties?.water_requirements || 'Non spécifié'}
            </p>
          </div>
        )}

        <button
          onClick={handleGenerateSchedule}
          disabled={scheduleMutation.isPending}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scheduleMutation.isPending ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Analyse en cours...</span>
            </>
          ) : (
            <>
              <TrendingUp className="w-5 h-5" />
              <span>Générer le planning</span>
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {scheduleMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900 dark:text-red-300">Erreur</h4>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {scheduleMutation.error instanceof Error ? scheduleMutation.error.message : 'Erreur lors de la génération du planning'}
            </p>
          </div>
        </div>
      )}

      {/* Irrigation Schedule Results */}
      {schedule && (
        <div className="space-y-4">
          {/* Recommendation Card */}
          <div className={`rounded-lg border-2 p-6 ${
            schedule.recommended_irrigation
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-start space-x-3">
              {schedule.recommended_irrigation ? (
                <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h4 className={`text-lg font-semibold ${
                  schedule.recommended_irrigation
                    ? 'text-blue-900 dark:text-blue-300'
                    : 'text-green-900 dark:text-green-300'
                }`}>
                  {schedule.recommended_irrigation ? 'Irrigation recommandée' : 'Pas d\'irrigation nécessaire'}
                </h4>
                {schedule.recommended_irrigation && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Quantité</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {schedule.irrigation_amount.toFixed(1)} mm
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Durée</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {schedule.irrigation_duration} min
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Heure optimale</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {schedule.optimal_time}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Parcel Info */}
          {parcelInfo && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Informations de la parcelle</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Surface:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{parcelInfo.area} ha</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Type de sol:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{parcelInfo.soil_type}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Irrigation:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{parcelInfo.irrigation_type}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Prochaine irrigation:</span>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {new Date(schedule.next_irrigation_date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reasoning */}
          {schedule.reasoning.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Analyse</h5>
              <ul className="space-y-2">
                {schedule.reasoning.map((reason, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {schedule.warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Avertissements</h5>
                  <ul className="space-y-1">
                    {schedule.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-700 dark:text-yellow-400">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IrrigationScheduling;