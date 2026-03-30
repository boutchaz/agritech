import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import { ComplianceCheckResponseDto, ComplianceCheckStatus } from '@/lib/api/compliance';
import { UpdateComplianceCheckDialog } from '@/components/compliance/UpdateComplianceCheckDialog';

interface ComplianceChecksListProps {
  checks: ComplianceCheckResponseDto[];
  isLoading?: boolean;
  onDelete?: (check: ComplianceCheckResponseDto) => void;
}

export function ComplianceChecksList({ checks, isLoading, onDelete }: ComplianceChecksListProps) {
  const { t } = useTranslation('compliance');

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

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="flex items-center gap-4 p-3 border-b bg-muted/30">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-8 rounded ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (checks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/10">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>{t('noChecksFound')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('table.date')}</TableHead>
            <TableHead>{t('table.type')}</TableHead>
            <TableHead>{t('table.certification')}</TableHead>
            <TableHead>{t('table.auditor')}</TableHead>
            <TableHead>{t('table.score')}</TableHead>
            <TableHead>{t('table.status')}</TableHead>
            <TableHead className="text-right">{t('table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checks.map((check) => (
            <TableRow key={check.id}>
              <TableCell className="font-medium">
                {format(new Date(check.check_date), 'dd MMM yyyy', { locale: fr })}
              </TableCell>
              <TableCell className="capitalize">
                {check.check_type.replace(/_/g, ' ')}
              </TableCell>
              <TableCell>
                {check.certification?.certification_type || '-'}
              </TableCell>
              <TableCell>{check.auditor_name || '-'}</TableCell>
              <TableCell>
                {check.score != null ? (
                  <span className={`font-bold ${
                    check.score >= 80 ? 'text-green-600' :
                    check.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {check.score}%
                  </span>
                ) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>{getStatusBadge(check.status)}</TableCell>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
