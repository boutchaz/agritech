import { useMemo, useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ar, enUS, fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  ShieldAlert,
  RefreshCw,
  Trash2,
  CircleDot,
  ShieldCheck,
} from 'lucide-react';

import {
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  FilterBar,
  ResponsiveList,
  type FilterSelect,
  type StatusFilterOption,
} from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type CorrectiveActionPlanResponseDto,
  CorrectiveActionStatus,
  CorrectiveActionPriority,
} from '@/lib/api/compliance';

interface CorrectiveActionsListProps {
  actions: CorrectiveActionPlanResponseDto[];
  isLoading?: boolean;
  showCertification?: boolean;
  onUpdateStatus?: (action: CorrectiveActionPlanResponseDto) => void;
  onDelete?: (action: CorrectiveActionPlanResponseDto) => void;
}

const priorityConfig: Record<CorrectiveActionPriority, { label: string; className: string }> = {
  [CorrectiveActionPriority.CRITICAL]: {
    label: 'priority.critical',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  [CorrectiveActionPriority.HIGH]: {
    label: 'priority.high',
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
  },
  [CorrectiveActionPriority.MEDIUM]: {
    label: 'priority.medium',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  },
  [CorrectiveActionPriority.LOW]: {
    label: 'priority.low',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
};

const statusConfig: Record<CorrectiveActionStatus, { label: string; icon: typeof Clock; className: string }> = {
  [CorrectiveActionStatus.OPEN]: {
    label: 'status.open',
    icon: CircleDot,
    className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  },
  [CorrectiveActionStatus.IN_PROGRESS]: {
    label: 'status.inProgress',
    icon: RefreshCw,
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  [CorrectiveActionStatus.RESOLVED]: {
    label: 'status.resolved',
    icon: CheckCircle2,
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  [CorrectiveActionStatus.VERIFIED]: {
    label: 'status.verified',
    icon: ShieldCheck,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  },
  [CorrectiveActionStatus.OVERDUE]: {
    label: 'status.overdue',
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
};

const SKELETON_HEADER_KEYS = [
  'finding',
  'action',
  'priority',
  'responsible',
  'deadline',
  'status',
  'actions',
] as const;

const SKELETON_ROW_KEYS = ['row-1', 'row-2', 'row-3'] as const;

type FilterStatus = 'all' | 'open' | 'in_progress' | 'completed' | 'overdue';
type FilterPriority = 'all' | CorrectiveActionPriority;

function DeadlineBadge({ dueDate }: { dueDate: string }) {
  const { t, i18n } = useTranslation('compliance');
  const days = differenceInDays(new Date(dueDate), new Date());
  const locale = i18n.language.startsWith('ar') ? ar : i18n.language.startsWith('en') ? enUS : fr;
  const formattedDate = format(new Date(dueDate), 'dd MMM yyyy', { locale });

  if (days < 0) {
    return (
      <div className="space-y-0.5">
        <span className="text-sm">{formattedDate}</span>
        <div className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {t('correctiveActions.daysOverdue', { days: Math.abs(days) })}
        </div>
      </div>
    );
  }

  if (days <= 7) {
    return (
      <div className="space-y-0.5">
        <span className="text-sm">{formattedDate}</span>
        <div className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
          <Clock className="h-3 w-3" />
          {t('correctiveActions.daysRemaining', { days })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <span className="text-sm">{formattedDate}</span>
      <span className="text-xs text-muted-foreground">{t('correctiveActions.daysRemaining', { days })}</span>
    </div>
  );
}

export function CorrectiveActionsList({
  actions,
  isLoading,
  showCertification,
  onUpdateStatus,
  onDelete,
}: CorrectiveActionsListProps) {
  const { t } = useTranslation('compliance');
  const [searchValue, setSearchValue] = useState('');
  const [activeStatus, setActiveStatus] = useState<FilterStatus>('all');
  const [activePriority, setActivePriority] = useState<FilterPriority>('all');

  const statusFilters = useMemo<StatusFilterOption[]>(
    () => [
      { value: 'all', label: t('correctiveActions.filters.status.all', 'All') },
      { value: CorrectiveActionStatus.OPEN, label: t('status.open', 'Open') },
      {
        value: CorrectiveActionStatus.IN_PROGRESS,
        label: t('status.inProgress', 'In progress'),
      },
      { value: 'completed', label: t('correctiveActions.filters.status.completed', 'Completed') },
      { value: CorrectiveActionStatus.OVERDUE, label: t('status.overdue', 'Overdue') },
    ],
    [t],
  );

  const priorityFilters = useMemo<FilterSelect[]>(
    () => [
      {
        key: 'priority',
        value: activePriority,
        onChange: (value) => setActivePriority(value as FilterPriority),
        placeholder: t('correctiveActions.priority', 'Priority'),
        options: [
          { value: 'all', label: t('correctiveActions.filters.priority.all', 'All priorities') },
          {
            value: CorrectiveActionPriority.CRITICAL,
            label: t('priority.critical', 'Critical'),
          },
          { value: CorrectiveActionPriority.HIGH, label: t('priority.high', 'High') },
          { value: CorrectiveActionPriority.MEDIUM, label: t('priority.medium', 'Medium') },
          { value: CorrectiveActionPriority.LOW, label: t('priority.low', 'Low') },
        ],
      },
    ],
    [activePriority, t],
  );

  const filteredActions = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return actions.filter((action) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          action.finding_description,
          action.action_description,
          action.responsible_person,
          action.requirement_code,
          action.certification?.certification_type,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedSearch));

      const matchesStatus =
        activeStatus === 'all' ||
        (activeStatus === 'completed'
          ? [CorrectiveActionStatus.RESOLVED, CorrectiveActionStatus.VERIFIED].includes(action.status)
          : action.status === activeStatus);

      const matchesPriority = activePriority === 'all' || action.priority === activePriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [actions, activePriority, activeStatus, searchValue]);

  const hasActiveFilters =
    searchValue.trim().length > 0 || activeStatus !== 'all' || activePriority !== 'all';

  const resetFilters = () => {
    setSearchValue('');
    setActiveStatus('all');
    setActivePriority('all');
  };

  const renderActionsMenu = (action: CorrectiveActionPlanResponseDto) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t('table.openMenu', 'Open menu')}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('table.actions', 'Actions')}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onUpdateStatus?.(action)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('correctiveActions.updateStatus', 'Update status')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={() => onDelete?.(action)}>
          <Trash2 className="mr-2 h-4 w-4" />
          {t('table.delete', 'Delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderTableCells = (action: CorrectiveActionPlanResponseDto) => {
    const status = statusConfig[action.status] || statusConfig[CorrectiveActionStatus.OPEN];
    const priority = priorityConfig[action.priority] || priorityConfig[CorrectiveActionPriority.MEDIUM];
    const StatusIcon = status.icon;

    return (
      <>
        <TableCell>
          <div className="space-y-1">
            <p className="text-sm font-medium line-clamp-2">{action.finding_description}</p>
            {action.requirement_code && (
              <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {action.requirement_code}
              </code>
            )}
          </div>
        </TableCell>
        <TableCell>
          <p className="text-sm line-clamp-2">{action.action_description}</p>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={priority.className}>
            {t(priority.label)}
          </Badge>
        </TableCell>
        <TableCell className="text-sm">{action.responsible_person}</TableCell>
        <TableCell>
          <DeadlineBadge dueDate={action.due_date} />
        </TableCell>
        {showCertification && (
          <TableCell className="text-sm">
            {action.certification?.certification_type || t('table.notAvailable', 'N/A')}
          </TableCell>
        )}
        <TableCell>
          <Badge variant="outline" className={status.className}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {t(status.label)}
          </Badge>
        </TableCell>
        <TableCell className="text-right">{renderActionsMenu(action)}</TableCell>
      </>
    );
  };

  const renderCard = (action: CorrectiveActionPlanResponseDto) => {
    const status = statusConfig[action.status] || statusConfig[CorrectiveActionStatus.OPEN];
    const priority = priorityConfig[action.priority] || priorityConfig[CorrectiveActionPriority.MEDIUM];
    const StatusIcon = status.icon;

    return (
      <div className="rounded-lg border bg-background p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={priority.className}>
                {t(priority.label)}
              </Badge>
              <Badge variant="outline" className={status.className}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {t(status.label)}
              </Badge>
            </div>
            <p className="font-medium text-sm leading-5">{action.finding_description}</p>
          </div>
          {renderActionsMenu(action)}
        </div>

        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('correctiveActions.correctiveAction', 'Corrective action')}
            </p>
            <p className="mt-1 text-foreground">{action.action_description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('correctiveActions.responsible', 'Responsible')}
              </p>
              <p className="mt-1 text-foreground">{action.responsible_person}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('correctiveActions.deadline', 'Deadline')}
              </p>
              <div className="mt-1">
                <DeadlineBadge dueDate={action.due_date} />
              </div>
            </div>
            {showCertification && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('correctiveActions.certification', 'Certification')}
                </p>
                <p className="mt-1 text-foreground">
                  {action.certification?.certification_type || t('table.notAvailable', 'N/A')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="flex items-center gap-4 p-3 border-b bg-muted/30">
          {SKELETON_HEADER_KEYS.map((key) => (
            <Skeleton key={key} className="h-4 flex-1" />
          ))}
        </div>
        {SKELETON_ROW_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-4 p-4 border-b last:border-b-0">
            <div className="w-[250px] space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-18 rounded-full" />
            <Skeleton className="h-8 w-8 rounded ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <EmptyState
        variant="card"
        icon={ShieldAlert}
        title={t('correctiveActions.noActions', 'No corrective actions')}
        description={t(
          'correctiveActions.noActionsHint',
          'Create a corrective action plan to start tracking remediation work.',
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder={t(
          'correctiveActions.filters.searchPlaceholder',
          'Search by finding, action, assignee, or requirement...',
        )}
        statusFilters={statusFilters}
        activeStatus={activeStatus}
        onStatusChange={(status) => setActiveStatus(status as FilterStatus)}
        filters={priorityFilters}
      />

      {filteredActions.length === 0 ? (
        <EmptyState
          variant="card"
          icon={ShieldAlert}
          title={t('correctiveActions.filters.emptyTitle', 'No matching corrective actions')}
          description={t(
            'correctiveActions.filters.emptyDescription',
            'Try adjusting your search or filters to find a corrective action.',
          )}
          action={hasActiveFilters ? {
            label: t('dataTable.clearFilters', 'Clear filters'),
            onClick: resetFilters,
            variant: 'outline',
          } : undefined}
        />
      ) : (
        <ResponsiveList
          items={filteredActions}
          isLoading={isLoading}
          keyExtractor={(action) => action.id}
          emptyIcon={ShieldAlert}
          emptyTitle={t('correctiveActions.noActions', 'No corrective actions')}
          emptyMessage={t(
            'correctiveActions.noActionsHint',
            'Create a corrective action plan to start tracking remediation work.',
          )}
          renderCard={renderCard}
          renderTableHeader={
            <TableRow>
              <TableHead className="w-[250px]">{t('correctiveActions.finding', 'Finding')}</TableHead>
              <TableHead className="w-[200px]">
                {t('correctiveActions.correctiveAction', 'Corrective action')}
              </TableHead>
              <TableHead>{t('correctiveActions.priority', 'Priority')}</TableHead>
              <TableHead>{t('correctiveActions.responsible', 'Responsible')}</TableHead>
              <TableHead>{t('correctiveActions.deadline', 'Deadline')}</TableHead>
              {showCertification && (
                <TableHead>{t('correctiveActions.certification', 'Certification')}</TableHead>
              )}
              <TableHead>{t('table.status', 'Status')}</TableHead>
              <TableHead className="w-[60px] text-right">{t('table.actions', 'Actions')}</TableHead>
            </TableRow>
          }
          renderTable={renderTableCells}
        />
      )}
    </div>
  );
}
