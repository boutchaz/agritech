import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useHarvest } from '../../hooks/useHarvests';
import type { HarvestSummary } from '../../types/harvests';
import { Button } from '@/components/ui/button';

interface Props {
  harvestId: string;
  onClose: () => void;
  onEdit: (harvest: HarvestSummary) => void;
}

const HarvestDetailsModal: React.FC<Props> = ({ harvestId, onClose, onEdit }) => {
  const { t } = useTranslation();
  const { data: harvest, isLoading } = useHarvest(harvestId);

  if (isLoading || !harvest) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{t('dialogs.harvestDetails.title')}</h2>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label={t('common.close', 'Close')}><X className="h-5 w-5" /></Button>
        </div>
        <div className="p-6 space-y-4">
          <div><strong>{t('dialogs.harvestDetails.date')}:</strong> {harvest.harvest_date}</div>
          <div><strong>{t('dialogs.harvestDetails.quantity')}:</strong> {harvest.quantity} {harvest.unit}</div>
          <div><strong>{t('dialogs.harvestDetails.parcel')}:</strong> {harvest.parcel_name}</div>
          <Button onClick={() => onEdit(harvest)}>{t('app.edit')}</Button>
        </div>
      </div>
    </div>
  );
};

export default HarvestDetailsModal;
