import React from 'react';
import { Trash2, MapPin, Beaker, Leaf, Droplet } from 'lucide-react';
import type { Analysis, SoilAnalysis, PlantAnalysis, WaterAnalysis } from '../../types/analysis';

interface AnalysisCardProps {
  analysis: Analysis;
  viewMode: 'card' | 'list';
  parcelName?: string;
  onDelete: (id: string) => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, viewMode, parcelName, onDelete }) => {
  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR');

  const getAnalysisIcon = () => {
    switch (analysis.analysis_type) {
      case 'soil':
        return <Beaker className="h-5 w-5 text-amber-600" />;
      case 'plant':
        return <Leaf className="h-5 w-5 text-green-600" />;
      case 'water':
        return <Droplet className="h-5 w-5 text-blue-600" />;
    }
  };

  const renderSoilData = (data: SoilAnalysis['data']) => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Propriétés Physiques
        </h4>
        <div className="space-y-1 text-sm">
          {data.ph_level && (
            <div className="flex justify-between">
              <span>pH</span>
              <span className="font-medium">{data.ph_level}</span>
            </div>
          )}
          {data.texture && (
            <div className="flex justify-between">
              <span>Texture</span>
              <span className="font-medium">{data.texture}</span>
            </div>
          )}
          {data.organic_matter_percentage !== undefined && (
            <div className="flex justify-between">
              <span>Matière organique</span>
              <span className="font-medium">{data.organic_matter_percentage}%</span>
            </div>
          )}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Propriétés Chimiques
        </h4>
        <div className="space-y-1 text-sm">
          {data.nitrogen_ppm && (
            <div className="flex justify-between">
              <span>Azote (N)</span>
              <span className="font-medium">{data.nitrogen_ppm} ppm</span>
            </div>
          )}
          {data.phosphorus_ppm && (
            <div className="flex justify-between">
              <span>Phosphore (P)</span>
              <span className="font-medium">{data.phosphorus_ppm} ppm</span>
            </div>
          )}
          {data.potassium_ppm && (
            <div className="flex justify-between">
              <span>Potassium (K)</span>
              <span className="font-medium">{data.potassium_ppm} ppm</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPlantData = (data: PlantAnalysis['data']) => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Informations
        </h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Partie analysée</span>
            <span className="font-medium">{data.plant_part}</span>
          </div>
          {data.growth_stage && (
            <div className="flex justify-between">
              <span>Stade de croissance</span>
              <span className="font-medium">{data.growth_stage}</span>
            </div>
          )}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Macronutriments
        </h4>
        <div className="space-y-1 text-sm">
          {data.nitrogen_percentage !== undefined && (
            <div className="flex justify-between">
              <span>Azote (N)</span>
              <span className="font-medium">{data.nitrogen_percentage}%</span>
            </div>
          )}
          {data.phosphorus_percentage !== undefined && (
            <div className="flex justify-between">
              <span>Phosphore (P)</span>
              <span className="font-medium">{data.phosphorus_percentage}%</span>
            </div>
          )}
          {data.potassium_percentage !== undefined && (
            <div className="flex justify-between">
              <span>Potassium (K)</span>
              <span className="font-medium">{data.potassium_percentage}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderWaterData = (data: WaterAnalysis['data']) => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Informations
        </h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Source</span>
            <span className="font-medium">{data.water_source}</span>
          </div>
          {data.irrigation_suitability && (
            <div className="flex justify-between">
              <span>Convenance irrigation</span>
              <span className="font-medium">{data.irrigation_suitability}</span>
            </div>
          )}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Propriétés Physico-chimiques
        </h4>
        <div className="space-y-1 text-sm">
          {data.ph_level !== undefined && (
            <div className="flex justify-between">
              <span>pH</span>
              <span className="font-medium">{data.ph_level}</span>
            </div>
          )}
          {data.ec_ds_per_m !== undefined && (
            <div className="flex justify-between">
              <span>CE</span>
              <span className="font-medium">{data.ec_ds_per_m} dS/m</span>
            </div>
          )}
          {data.tds_ppm !== undefined && (
            <div className="flex justify-between">
              <span>TDS</span>
              <span className="font-medium">{data.tds_ppm} ppm</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnalysisData = () => {
    switch (analysis.analysis_type) {
      case 'soil':
        return renderSoilData((analysis as SoilAnalysis).data);
      case 'plant':
        return renderPlantData((analysis as PlantAnalysis).data);
      case 'water':
        return renderWaterData((analysis as WaterAnalysis).data);
    }
  };

  if (viewMode === 'card') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              {getAnalysisIcon()}
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                {formatDate(analysis.analysis_date)}
              </h3>
            </div>
            {parcelName && (
              <div className="flex items-center space-x-1 text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{parcelName}</span>
              </div>
            )}
            {analysis.laboratory && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Laboratoire: {analysis.laboratory}
              </p>
            )}
          </div>
          <button
            onClick={() => onDelete(analysis.id)}
            className="text-gray-400 hover:text-red-500 ml-2"
          >
            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {renderAnalysisData()}

        {analysis.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">{analysis.notes}</p>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                {getAnalysisIcon()}
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {formatDate(analysis.analysis_date)}
                </h3>
              </div>
              {parcelName && (
                <div className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400">
                  <MapPin className="h-3 w-3" />
                  <span>{parcelName}</span>
                </div>
              )}
              {analysis.laboratory && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Laboratoire: {analysis.laboratory}
                </p>
              )}
            </div>
            <button
              onClick={() => onDelete(analysis.id)}
              className="text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>

          {renderAnalysisData()}

          {analysis.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">{analysis.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisCard;
