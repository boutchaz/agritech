import { Calendar, MapPin, Package, TrendingUp, Edit, Trash2, Eye, Award, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, enUS, ar, type Locale } from 'date-fns/locale';
import type { HarvestSummary } from '../../types/harvests';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const dateLocales: Record<string, Locale> = { fr, en: enUS, ar };

interface HarvestTableProps {
  harvests: HarvestSummary[];
  onEdit: (harvest: HarvestSummary) => void;
  onDelete: (harvestId: string) => void;
  onViewDetails: (harvestId: string) => void;
  onCreateReception?: (harvest: HarvestSummary) => void;
}

const HarvestTable = ({ harvests, onEdit, onDelete, onViewDetails, onCreateReception }: HarvestTableProps) => {
  const { t, i18n } = useTranslation();
  const currentLocale = dateLocales[i18n.language] || fr;

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
    return t(`harvests.statuses.${status}`, status);
  };

  const getQualityBadge = (grade?: string) => {
    if (!grade) return <span className="text-gray-400">-</span>;
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('harvests.table.date', 'Date')}</TableHead>
              <TableHead>{t('harvests.table.crop', 'Crop')}</TableHead>
              <TableHead>{t('harvests.table.parcel', 'Parcel')}</TableHead>
              <TableHead className="text-right">{t('harvests.table.quantity', 'Quantity')}</TableHead>
              <TableHead>{t('harvests.table.quality', 'Quality')}</TableHead>
              <TableHead>{t('harvests.table.status', 'Status')}</TableHead>
              <TableHead>{t('harvests.table.destination', 'Destination')}</TableHead>
              <TableHead className="text-right">{t('harvests.table.revenue', 'Revenue')}</TableHead>
              <TableHead className="text-right">{t('harvests.table.actions', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {harvests.map((harvest) => (
              <TableRow key={harvest.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {format(new Date(harvest.harvest_date), 'dd MMM yyyy', { locale: currentLocale })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {harvest.crop_name || t('harvests.unspecifiedCrop', 'Unspecified crop')}
                  </span>
                </TableCell>
                <TableCell>
                  {harvest.parcel_name ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{harvest.parcel_name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {harvest.quantity} {harvest.unit}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getQualityBadge(harvest.quality_grade)}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(harvest.status)}`}>
                    {getStatusLabel(harvest.status)}
                  </span>
                </TableCell>
                <TableCell>
                  {harvest.intended_for ? (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t(`harvests.intendedFor.${harvest.intended_for}`, harvest.intended_for)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {harvest.estimated_revenue ? (
                    <div className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">
                        {harvest.estimated_revenue.toLocaleString()} MAD
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onCreateReception && harvest.status === 'stored' && (
                      <Button
                        onClick={() => onCreateReception(harvest)}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title={t('harvests.actions.createReception', 'Create Reception Batch')}
                      >
                        <ClipboardCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => onViewDetails(harvest.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title={t('harvests.actions.viewDetails', 'View details')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => onEdit(harvest)}
                      className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={t('common.edit', 'Edit')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => onDelete(harvest.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={t('common.delete', 'Delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default HarvestTable;
