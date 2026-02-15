import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  FileText,
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
    label: 'Critique',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
  [CorrectiveActionPriority.HIGH]: {
    label: 'Haute',
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
  },
  [CorrectiveActionPriority.MEDIUM]: {
    label: 'Moyenne',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  },
  [CorrectiveActionPriority.LOW]: {
    label: 'Basse',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
};

const statusConfig: Record<CorrectiveActionStatus, { label: string; icon: typeof Clock; className: string }> = {
  [CorrectiveActionStatus.OPEN]: {
    label: 'Ouverte',
    icon: CircleDot,
    className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  },
  [CorrectiveActionStatus.IN_PROGRESS]: {
    label: 'En cours',
    icon: RefreshCw,
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  [CorrectiveActionStatus.RESOLVED]: {
    label: 'Résolue',
    icon: CheckCircle2,
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  [CorrectiveActionStatus.VERIFIED]: {
    label: 'Vérifiée',
    icon: ShieldCheck,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  },
  [CorrectiveActionStatus.OVERDUE]: {
    label: 'En retard',
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
};

function DeadlineBadge({ dueDate }: { dueDate: string }) {
  const days = differenceInDays(new Date(dueDate), new Date());
  const formattedDate = format(new Date(dueDate), 'dd MMM yyyy', { locale: fr });

  if (days < 0) {
    return (
      <div className="space-y-0.5">
        <span className="text-sm">{formattedDate}</span>
        <div className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {Math.abs(days)}j en retard
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
          {days}j restants
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <span className="text-sm">{formattedDate}</span>
      <span className="text-xs text-muted-foreground">{days}j restants</span>
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
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
        <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Aucune action corrective</p>
        <p className="text-sm mt-1">Les actions correctives issues des contrôles apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Constat</TableHead>
            <TableHead className="w-[200px]">Action corrective</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Échéance</TableHead>
            {showCertification && <TableHead>Certification</TableHead>}
            <TableHead>Statut</TableHead>
            <TableHead className="text-right w-[60px]">Actions</TableHead>
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
                    {priority.label}
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
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onUpdateStatus?.(action)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Mettre à jour le statut
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        Voir les détails
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDelete?.(action)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
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
