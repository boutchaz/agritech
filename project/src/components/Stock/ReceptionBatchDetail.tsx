import { useTranslation } from 'react-i18next';
import { useReceptionBatch } from '@/hooks/useReceptionBatches';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Loader2,
  Package,
  Calendar,
  Warehouse,
  MapPin,
  Scale,
  Thermometer,
  Droplet,
  User,
  ClipboardCheck,
  Truck,
  Layers,
  Star,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type {
  ReceptionBatchStatus,
  ReceptionDecision,
  QualityGrade,
} from '@/types/reception';

const STATUS_COLORS: Record<ReceptionBatchStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  quality_checked: 'bg-purple-100 text-purple-800',
  decision_made: 'bg-orange-100 text-orange-800',
  processed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const DECISION_COLORS: Record<ReceptionDecision, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  direct_sale: 'bg-green-100 text-green-800',
  storage: 'bg-blue-100 text-blue-800',
  transformation: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
};

const QUALITY_GRADE_COLORS: Record<QualityGrade, string> = {
  Extra: 'bg-emerald-100 text-emerald-800',
  A: 'bg-green-100 text-green-800',
  First: 'bg-green-100 text-green-800',
  B: 'bg-yellow-100 text-yellow-800',
  Second: 'bg-yellow-100 text-yellow-800',
  C: 'bg-orange-100 text-orange-800',
  Third: 'bg-orange-100 text-orange-800',
};

interface ReceptionBatchDetailProps {
  batchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReceptionBatchDetail({ batchId, open, onOpenChange }: ReceptionBatchDetailProps) {
  const { t } = useTranslation('stock');
  const { data: batch, isLoading } = useReceptionBatch(batchId ?? undefined);

  if (!open) return null;

  if (isLoading) {
    return (
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        size="3xl"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3">{t('receptionBatches.detail.loading')}</span>
        </div>
      </ResponsiveDialog>
    );
  }

  if (!batch) {
    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange} size="3xl">
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">{t('receptionBatches.detail.notFound')}</p>
        </div>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="3xl"
      contentClassName="max-h-[90vh] overflow-y-auto"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5" />
          {batch.batch_code}
        </DialogTitle>
        <DialogDescription>
          {t('receptionBatches.detail.title')}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-6 space-y-6 px-6 pb-6">
        {/* General Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('receptionBatches.detail.batchCode')}</p>
              <p className="font-semibold text-lg">{batch.batch_code}</p>
            </div>
            <Badge className={STATUS_COLORS[batch.status]}>
              {batch.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {t('receptionBatches.detail.receptionDate')}
              </p>
              <p className="font-medium">
                {batch.reception_date ? new Date(batch.reception_date).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {t('receptionBatches.detail.receptionTime')}
              </p>
              <p className="font-medium">{batch.reception_time || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Warehouse className="w-4 h-4" />
                {t('receptionBatches.detail.warehouse')}
              </p>
              <p className="font-medium">{batch.warehouse?.name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {t('receptionBatches.detail.parcel')}
              </p>
              <p className="font-medium">{batch.parcel?.name || '—'}</p>
              {batch.parcel?.farm && (
                <p className="text-xs text-gray-500">{batch.parcel.farm.name}</p>
              )}
            </div>
          </div>

          {(batch.crop?.name || batch.harvest?.id) && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              {batch.crop?.name && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    {t('receptionBatches.detail.crop')}
                  </p>
                  <p className="font-medium">{batch.crop.name}</p>
                </div>
              )}
              {batch.harvest?.id && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    {t('receptionBatches.detail.harvest')}
                  </p>
                  <p className="font-medium">
                    {new Date(batch.harvest.harvest_date).toLocaleDateString()}
                    {batch.harvest.quantity ? ` — ${batch.harvest.quantity} kg` : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {(batch.producer_name || batch.received_by) && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              {batch.producer_name && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {t('receptionBatches.detail.producer')}
                  </p>
                  <p className="font-medium">{batch.producer_name}</p>
                </div>
              )}
              {batch.receiver && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {t('receptionBatches.detail.receivedBy')}
                  </p>
                  <p className="font-medium">
                    {batch.receiver.first_name} {batch.receiver.last_name}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weight */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold">{t('receptionBatches.detail.weightInfo')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('receptionBatches.detail.weight')}</p>
              <p className="text-lg font-semibold">
                {batch.weight.toFixed(2)} {batch.weight_unit}
              </p>
            </div>
            {batch.quantity && (
              <div>
                <p className="text-sm text-gray-500">{t('receptionBatches.detail.quantity')}</p>
                <p className="text-lg font-semibold">
                  {batch.quantity} {batch.quantity_unit || ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quality Control */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold">{t('receptionBatches.detail.qualityControl')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('receptionBatches.detail.grade')}</p>
              {batch.quality_grade ? (
                <Badge className={QUALITY_GRADE_COLORS[batch.quality_grade]}>
                  {batch.quality_grade}
                </Badge>
              ) : (
                <p className="text-gray-400">—</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('receptionBatches.detail.score')}</p>
              <p className="text-lg font-semibold">
                {batch.quality_score != null ? `${batch.quality_score}/10` : '—'}
              </p>
            </div>
          </div>

          {(batch.humidity_percentage != null || batch.maturity_level || batch.temperature != null || batch.moisture_content != null) && (
            <div className="grid grid-cols-2 gap-4 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              {batch.humidity_percentage != null && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Droplet className="w-4 h-4" />
                    {t('receptionBatches.detail.humidity')}
                  </p>
                  <p className="font-medium">{batch.humidity_percentage}%</p>
                </div>
              )}
              {batch.maturity_level && (
                <div>
                  <p className="text-sm text-gray-500">{t('receptionBatches.detail.maturity')}</p>
                  <p className="font-medium">{batch.maturity_level}</p>
                </div>
              )}
              {batch.temperature != null && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Thermometer className="w-4 h-4" />
                    {t('receptionBatches.detail.temperature')}
                  </p>
                  <p className="font-medium">{batch.temperature}°C</p>
                </div>
              )}
              {batch.moisture_content != null && (
                <div>
                  <p className="text-sm text-gray-500">{t('receptionBatches.detail.moisture')}</p>
                  <p className="font-medium">{batch.moisture_content}%</p>
                </div>
              )}
            </div>
          )}

          {batch.quality_notes && (
            <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500">{t('receptionBatches.detail.qualityNotes')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{batch.quality_notes}</p>
            </div>
          )}
        </div>

        {/* Decision */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold">{t('receptionBatches.detail.decision')}</h3>
          </div>
          <Badge className={DECISION_COLORS[batch.decision]}>
            {batch.decision}
          </Badge>
        </div>

        {/* Notes */}
        {batch.notes && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">{t('receptionBatches.detail.notes')}</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{batch.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">{t('receptionBatches.detail.created')}</span>
            <span>{batch.created_at ? new Date(batch.created_at).toLocaleString() : '—'}</span>
          </div>
          {batch.updated_at && batch.updated_at !== batch.created_at && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t('receptionBatches.detail.updated')}</span>
              <span>{new Date(batch.updated_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
