import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  MoreHorizontal, 
  FileText,
  Eye
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
import { ComplianceCheckResponseDto, ComplianceCheckStatus } from '@/lib/api/compliance';

interface ComplianceChecksListProps {
  checks: ComplianceCheckResponseDto[];
  isLoading?: boolean;
}

export function ComplianceChecksList({ checks, isLoading }: ComplianceChecksListProps) {
  const getStatusBadge = (status: ComplianceCheckStatus) => {
    switch (status) {
      case ComplianceCheckStatus.COMPLIANT:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Conforme
          </Badge>
        );
      case ComplianceCheckStatus.NON_COMPLIANT:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Non conforme
          </Badge>
        );
      case ComplianceCheckStatus.NEEDS_REVIEW:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            À revoir
          </Badge>
        );
      case ComplianceCheckStatus.IN_PROGRESS:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            En cours
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (checks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/10">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>Aucun contrôle de conformité trouvé.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Certification</TableHead>
            <TableHead>Auditeur</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                {check.score !== undefined ? (
                  <span className={`font-bold ${
                    (check.score || 0) >= 80 ? 'text-green-600' : 
                    (check.score || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {check.score}%
                  </span>
                ) : '-'}
              </TableCell>
              <TableCell>{getStatusBadge(check.status)}</TableCell>
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
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="mr-2 h-4 w-4" />
                      Télécharger rapport
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      Supprimer
                    </DropdownMenuItem>
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
