import { format } from 'date-fns';
import { ar, enUS, fr, type Locale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

import {
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLoader } from '@/components/ui/loader';
import { FilterBar, ResponsiveList } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ComplianceCheckResponseDto, ComplianceCheckStatus } from '@/lib/api/compliance';
import { UpdateComplianceCheckDialog } from '@/components/compliance/UpdateComplianceCheckDialog';

interface ComplianceChecksListProps {
  checks: ComplianceCheckResponseDto[];
  isLoading?: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  activeStatus: ComplianceCheckStatus | 'all';
  onStatusChange: (status: ComplianceCheckStatus | 'all') => void;
  onDelete?: (check: ComplianceCheckResponseDto) => void;
}

const dateLocales: Record<string, Locale> = {
  fr,
  en: enUS,
  ar,
};

export function ComplianceChecksList({
  checks,
  isLoading,
  searchValue,
  onSearchChange,
  activeStatus,
  onStatusChange,
  onDelete,
}: ComplianceChecksListProps) {
  const { t, i18n } = useTranslation('compliance');

  const getLocale = () => {
    const language = i18n.language.split('-')[0];
    return dateLocales[language] || enUS;
  };

  const statusFilters = [
    {
      value: 'all',
      label: t('table.allStatuses', 'All statuses'),
    },
    {
      value: ComplianceCheckStatus.COMPLIANT,
      label: t('status.compliant'),
    },
    {
      value: ComplianceCheckStatus.NON_COMPLIANT,
      label: t('status.nonCompliant'),
    },
    {
      value: ComplianceCheckStatus.NEEDS_REVIEW,
      label: t('status.needsReview'),
    },
    {
      value: ComplianceCheckStatus.IN_PROGRESS,
      label: t('status.inProgress'),
    },
  ];

  const getStatusBadge = (status: ComplianceCheckStatus) => {
    switch (status) {
      case ComplianceCheckStatus.COMPLIANT:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('status.compliant')}
          </Badge>
        );
      case ComplianceCheckStatus.NON_COMPLIANT:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            {t('status.nonCompliant')}
          </Badge>
        );
      case ComplianceCheckStatus.NEEDS_REVIEW:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {t('status.needsReview')}
          </Badge>
        );
      case ComplianceCheckStatus.IN_PROGRESS:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            {t('status.inProgress')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
      }
  };

  const getScoreBadge = (score?: number | null) => {
    if (score == null) {
      return <span className="text-muted-foreground">—</span>;
    }

    const scoreClassName = score >= 80
      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
      : score >= 50
        ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';

    return (
      <Badge variant="outline" className={scoreClassName}>
        {score}%
      </Badge>
    );
  };

  const renderActions = (check: ComplianceCheckResponseDto) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t('table.openMenu')}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
        <UpdateComplianceCheckDialog
          check={check}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('dialogs.updateCheck.button')}
            </DropdownMenuItem>
          }
        />
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => onDelete(check)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('table.delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <FilterBar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={t('searchPlaceholder', 'Search compliance checks...')}
          statusFilters={statusFilters}
          activeStatus={activeStatus}
          onStatusChange={(status) => onStatusChange(status as ComplianceCheckStatus | 'all')}
        />
        <SectionLoader className="rounded-md border" />
      </div>
    );
  }

  if (checks.length === 0) {
    return (
      <div className="space-y-4">
        <FilterBar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={t('searchPlaceholder', 'Search compliance checks...')}
          statusFilters={statusFilters}
          activeStatus={activeStatus}
          onStatusChange={(status) => onStatusChange(status as ComplianceCheckStatus | 'all')}
        />
        <EmptyState
          variant="card"
          icon={FileText}
          description={t('noChecksFound')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={t('searchPlaceholder', 'Search compliance checks...')}
        statusFilters={statusFilters}
        activeStatus={activeStatus}
        onStatusChange={(status) => onStatusChange(status as ComplianceCheckStatus | 'all')}
      />

      <ResponsiveList
        items={checks}
        keyExtractor={(check) => check.id}
        emptyIcon={FileText}
        emptyMessage={t('noChecksFound')}
        renderCard={(check) => (
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('table.date')}</p>
                <p className="font-medium">
                  {format(new Date(check.check_date), 'dd MMM yyyy', { locale: getLocale() })}
                </p>
              </div>
              {renderActions(check)}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('table.type')}</p>
                <p className="capitalize">{check.check_type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('table.certification')}</p>
                <p>{check.certification?.certification_type || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('table.auditor')}</p>
                <p>{check.auditor_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('table.score')}</p>
                <div className="pt-1">{getScoreBadge(check.score)}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
              <span className="text-sm text-muted-foreground">{t('table.status')}</span>
              {getStatusBadge(check.status)}
            </div>
          </div>
        )}
        renderTableHeader={
          <TableRow>
            <TableHead>{t('table.date')}</TableHead>
            <TableHead>{t('table.type')}</TableHead>
            <TableHead>{t('table.certification')}</TableHead>
            <TableHead>{t('table.auditor')}</TableHead>
            <TableHead>{t('table.score')}</TableHead>
            <TableHead>{t('table.status')}</TableHead>
            <TableHead className="text-right">{t('table.actions')}</TableHead>
          </TableRow>
        }
        renderTable={(check) => (
          <>
            <TableCell className="font-medium">
              {format(new Date(check.check_date), 'dd MMM yyyy', { locale: getLocale() })}
            </TableCell>
            <TableCell className="capitalize">
              {check.check_type.replace(/_/g, ' ')}
            </TableCell>
            <TableCell>
              {check.certification?.certification_type || '-'}
            </TableCell>
            <TableCell>{check.auditor_name || '-'}</TableCell>
            <TableCell>{getScoreBadge(check.score)}</TableCell>
            <TableCell>{getStatusBadge(check.status)}</TableCell>
            <TableCell className="text-right">{renderActions(check)}</TableCell>
          </>
        )}
      />
    </div>
  );
}
