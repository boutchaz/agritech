import React from 'react';
import { Calendar, MapPin, Package, TrendingUp, Edit, Trash2, Eye, Award } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { HarvestSummary } from '../../types/harvests';

interface HarvestCardProps {
  harvest: HarvestSummary;
  onEdit: (harvest: HarvestSummary) => void;
  onDelete: (harvestId: string) => void;
  onViewDetails: (harvestId: string) => void;
}

const HarvestCard: React.FC<HarvestCardProps> = ({ harvest, onEdit, onDelete, onViewDetails }) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      stored: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      in_delivery: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      sold: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      spoiled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      stored: 'Stocké',
      in_delivery: 'En livraison',
      delivered: 'Livré',
      sold: 'Vendu',
      spoiled: 'Gâté',
    };
    return labels[status] || status;
  };

  const getQualityBadge = (grade?: string) => {
    if (!grade) return null;
    const colors: Record<string, string> = {
      Extra: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      A: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      First: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      Second: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      C: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      Third: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    };
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${colors[grade] || colors.C}`}>
        <Award className="h-3 w-3" />
        {grade}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(harvest.status)}`}>
              {getStatusLabel(harvest.status)}
            </span>
            {getQualityBadge(harvest.quality_grade)}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {harvest.crop_name || 'Culture non spécifiée'}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewDetails(harvest.id)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(harvest)}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(harvest.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">
            {format(new Date(harvest.harvest_date), 'dd MMMM yyyy', { locale: fr })}
          </span>
        </div>

        {harvest.parcel_name && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {harvest.parcel_name}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {harvest.quantity} {harvest.unit}
          </span>
        </div>

        {harvest.estimated_revenue && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-600 dark:text-green-400">
              {harvest.estimated_revenue.toLocaleString()} MAD estimé
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      {harvest.intended_for && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Destination: <span className="font-medium text-gray-700 dark:text-gray-300">{harvest.intended_for}</span>
          </span>
        </div>
      )}

      {harvest.notes && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {harvest.notes}
          </p>
        </div>
      )}
    </div>
  );
};

export default HarvestCard;
