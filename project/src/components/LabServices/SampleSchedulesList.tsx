import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterBar, ResponsiveList } from '@/components/ui/data-table';
import { SectionLoader } from '@/components/ui/loader';

interface SampleSchedulesListProps {
  schedules: Array<{
    id: string;
    next_collection_date: string;
    service_type?: { name?: string };
    farm?: { name?: string };
    parcel?: { name?: string };
    frequency?: string;
  }>;
  isLoading: boolean;
  onCreate?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

const getDaysUntil = (date: string) => {
  const nextDate = new Date(date);
  const today = new Date();

  return Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export function SampleSchedulesList({
  schedules,
  isLoading,
  onCreate,
  searchValue,
  onSearchChange,
}: SampleSchedulesListProps) {
  const { t } = useTranslation('stock');
  const [internalSearchValue, setInternalSearchValue] = useState('');

  const currentSearchValue = searchValue ?? internalSearchValue;

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
      return;
    }

    setInternalSearchValue(value);
  };

  const filteredSchedules = useMemo(() => {
    const normalizedSearch = currentSearchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return schedules;
    }

    return schedules.filter((schedule) =>
      [
        schedule.service_type?.name,
        schedule.farm?.name,
        schedule.parcel?.name,
        schedule.frequency,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch)),
    );
  }, [currentSearchValue, schedules]);

  const createAction = onCreate
    ? {
        label: t('sampleSchedules.create', 'Create schedule'),
        onClick: onCreate,
      }
    : undefined;

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('sampleSchedules.title', 'Scheduled collections')}
        </h3>
        <Button className="gap-2" onClick={onCreate} disabled={!onCreate}>
          <Plus className="h-4 w-4" />
          {t('sampleSchedules.new', 'New schedule')}
        </Button>
      </div>

      <FilterBar
        searchValue={currentSearchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('sampleSchedules.searchPlaceholder', 'Search schedules...')}
      />

      <ResponsiveList
        items={filteredSchedules}
        isLoading={isLoading}
        keyExtractor={(schedule) => schedule.id}
        emptyIcon={Calendar}
        emptyMessage={t('sampleSchedules.empty', 'No scheduled collections')}
        emptyAction={createAction}
        renderTableHeader={
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('sampleSchedules.columns.serviceType', 'Service type')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('sampleSchedules.columns.farm', 'Farm')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('sampleSchedules.columns.parcel', 'Parcel')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('sampleSchedules.columns.frequency', 'Frequency')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('sampleSchedules.columns.nextCollection', 'Next collection')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('sampleSchedules.columns.urgency', 'Urgency')}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('sampleSchedules.columns.actions', 'Actions')}
            </th>
          </tr>
        }
        renderCard={(schedule) => {
          const nextDate = new Date(schedule.next_collection_date);
          const daysUntil = getDaysUntil(schedule.next_collection_date);
          const isUrgent = daysUntil >= 0 && daysUntil <= 3;

          return (
            <Card className={isUrgent ? 'border-orange-500 dark:border-orange-600' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {schedule.service_type?.name}
                      </h4>
                      {isUrgent && (
                        <Badge variant="default" className="bg-orange-500">
                          {t('sampleSchedules.dueInDays', {
                            count: daysUntil,
                            defaultValue: 'In {{count}} day',
                            defaultValue_plural: 'In {{count}} days',
                          })}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        {t('sampleSchedules.labels.farm', 'Farm:')} {schedule.farm?.name ?? '—'}
                      </p>
                      <p>
                        {t('sampleSchedules.labels.parcel', 'Parcel:')} {schedule.parcel?.name ?? '—'}
                      </p>
                      <p>
                        {t('sampleSchedules.labels.frequency', 'Frequency:')} {schedule.frequency ?? '—'}
                      </p>
                      <p>
                        {t('sampleSchedules.labels.nextCollection', 'Next collection:')} {nextDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    {t('sampleSchedules.edit', 'Edit')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }}
        renderTable={(schedule) => {
          const nextDate = new Date(schedule.next_collection_date);
          const daysUntil = getDaysUntil(schedule.next_collection_date);
          const isUrgent = daysUntil >= 0 && daysUntil <= 3;

          return (
            <>
              <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                {schedule.service_type?.name ?? '—'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                {schedule.farm?.name ?? '—'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                {schedule.parcel?.name ?? '—'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                {schedule.frequency ?? '—'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                {nextDate.toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                {isUrgent ? (
                  <Badge variant="default" className="bg-orange-500">
                    {t('sampleSchedules.dueInDays', {
                      count: daysUntil,
                      defaultValue: 'In {{count}} day',
                      defaultValue_plural: 'In {{count}} days',
                    })}
                  </Badge>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <Button variant="outline" size="sm">
                  {t('sampleSchedules.edit', 'Edit')}
                </Button>
              </td>
            </>
          );
        }}
      />
    </div>
  );
}
