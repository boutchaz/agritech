
import { useTranslation } from 'react-i18next';
import { X, Calendar, MapPin, Package, TrendingUp, Award, Warehouse, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useHarvest } from '../../hooks/useHarvests';
import type { HarvestSummary } from '../../types/harvests';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Props {
  harvestId: string;
  onClose: () => void;
  onEdit: (harvest: HarvestSummary) => void;
}

const HarvestDetailsModal = ({ harvestId, onClose, onEdit }: Props) => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { data: harvest, isLoading } = useHarvest(currentOrganization?.id || '', harvestId);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      stored: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      in_delivery: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      sold: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      spoiled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!harvest) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('harvests.details.title', 'Harvest Details')}
            </h2>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(harvest.status)}`}>
              {t(`harvests.statuses.${harvest.status}`, harvest.status)}
            </span>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label={t('common.close', 'Close')}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6 space-y-5">
          {/* Lot Number */}
          {harvest.lot_number && (
            <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
              {harvest.lot_number}
            </div>
          )}

          {/* Crop & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">{t('harvests.details.crop', 'Crop')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {harvest.crop_name || t('harvests.details.unspecifiedCrop', 'Not specified')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">{t('harvests.details.parcel', 'Parcel')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {harvest.parcel_name || '-'}
              </span>
            </div>
          </div>

          {/* Date & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">{t('harvests.details.date', 'Date')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {format(new Date(harvest.harvest_date), 'dd/MM/yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {harvest.quantity} {harvest.unit}
              </span>
            </div>
          </div>

          {/* Quality */}
          {(harvest.quality_grade || harvest.quality_score) && (
            <div className="flex items-center gap-4">
              {harvest.quality_grade && (
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="text-gray-600 dark:text-gray-400">{t('harvests.details.quality', 'Quality')}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{harvest.quality_grade}</span>
                </div>
              )}
              {harvest.quality_score && (
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('harvests.details.score', 'Score')}:</span>
                  <span className="font-medium text-gray-900 dark:text-white ml-1">{harvest.quality_score}/10</span>
                </div>
              )}
            </div>
          )}

          {/* Revenue */}
          {harvest.estimated_revenue ? (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-600 dark:text-green-400">
                {harvest.estimated_revenue.toLocaleString()} MAD {t('harvests.details.estimated', 'estimated')}
              </span>
            </div>
          ) : null}

          {/* Storage */}
          {(harvest.storage_location || harvest.intended_for) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {harvest.storage_location && (
                <div className="flex items-center gap-2 text-sm">
                  <Warehouse className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{t('harvests.details.storage', 'Storage')}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{harvest.storage_location}</span>
                </div>
              )}
              {harvest.intended_for && (
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('harvests.details.destination', 'Destination')}:</span>
                  <span className="font-medium text-gray-900 dark:text-white ml-1">
                    {t(`harvests.intendedFor.${harvest.intended_for}`, harvest.intended_for)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {harvest.notes && (
            <div className="flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('harvests.details.notes', 'Notes')}:</span>
                <p className="text-gray-900 dark:text-white mt-1">{harvest.notes}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button variant="outline" onClick={onClose}>
              {t('common.close', 'Close')}
            </Button>
            <Button variant="green" onClick={() => onEdit(harvest as HarvestSummary)}>
              {t('common.edit', 'Edit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HarvestDetailsModal;
