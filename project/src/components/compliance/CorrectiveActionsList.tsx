import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

function DeadlineBadge({ dueDate }: { dueDate: string }) {
  const { t } = useTranslation('compliance');
  const days = differenceInDays(new Date(dueDate), new Date());
  const formattedDate = format(new Date(dueDate), 'dd MMM yyyy', { locale: fr });

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

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="flex items-center gap-4 p-3 border-b bg-muted/30">
          {[1, 2, 3, 4, 5, 6, 7].map((_, skIdx) => (
            <Skeleton key={"sk-" + skIdx} className="h-4 flex-1" />
          ))}
        </div>
        {[1, 2, 3].map((_, skIdx) => (
          <div key={"sk-" + skIdx} className="flex items-center gap-4 p-4 border-b last:border-b-0">
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
      <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
        <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">{t('correctiveActions.noActions')}</p>
        <p className="text-sm mt-1">{t('correctiveActions.noActionsHint')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">{t('correctiveActions.finding')}</TableHead>
            <TableHead className="w-[200px]">{t('correctiveActions.correctiveAction')}</TableHead>
            <TableHead>{t('correctiveActions.priority')}</TableHead>
            <TableHead>{t('correctiveActions.responsible')}</TableHead>
            <TableHead>{t('correctiveActions.deadline')}</TableHead>
            {showCertification && <TableHead>{t('correctiveActions.certification')}</TableHead>}
            <TableHead>{t('table.status')}</TableHead>
            <TableHead className="text-right w-[60px]">{t('table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action) => {
            const status = statusConfig[action.status] || statusConfig[CorrectiveActionStatus.OPEN];
            const priority = priorityConfig[action.priority] || priorityConfig[CorrectiveActionPriority.MEDIUM];
            const StatusIcon = status.icon;

            return (
              <TableRow key={action.id}>
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
                    {action.certification?.certification_type || '-'}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="outline" className={status.className}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {t(status.label)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{t('table.openMenu')}</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onUpdateStatus?.(action)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('correctiveActions.updateStatus')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDelete?.(action)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('table.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
