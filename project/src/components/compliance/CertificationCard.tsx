import { Link } from '@tanstack/react-router';
import { Calendar, Award, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CertificationResponseDto, CertificationStatus } from '@/lib/api/compliance';

interface CertificationCardProps {
  certification: CertificationResponseDto;
}

export function CertificationCard({ certification }: CertificationCardProps) {
  const getStatusColor = (status: CertificationStatus) => {
    switch (status) {
      case CertificationStatus.ACTIVE:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100/80';
      case CertificationStatus.EXPIRED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-100/80';
      case CertificationStatus.PENDING_RENEWAL:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-100/80';
      case CertificationStatus.SUSPENDED:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-100/80';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-100/80';
    }
  };

  const getStatusIcon = (status: CertificationStatus) => {
    switch (status) {
      case CertificationStatus.ACTIVE:
        return <CheckCircle2 className="h-3 w-3 mr-1" />;
      case CertificationStatus.EXPIRED:
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case CertificationStatus.PENDING_RENEWAL:
        return <Clock className="h-3 w-3 mr-1" />;
      case CertificationStatus.SUSPENDED:
        return <AlertCircle className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: CertificationStatus) => {
    switch (status) {
      case CertificationStatus.ACTIVE:
        return 'Active';
      case CertificationStatus.EXPIRED:
        return 'Expirée';
      case CertificationStatus.PENDING_RENEWAL:
        return 'Renouvellement';
      case CertificationStatus.SUSPENDED:
        return 'Suspendue';
      default:
        return status;
    }
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold line-clamp-1">
                {certification.certification_type}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {certification.certification_number}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={getStatusColor(certification.status)}>
            {getStatusIcon(certification.status)}
            {getStatusLabel(certification.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">Organisme:</span>
            <span className="font-medium">{certification.issuing_body}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">Émise le:</span>
            <span className="font-medium">
              {format(new Date(certification.issued_date), 'dd MMM yyyy', { locale: fr })}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Expire le:</span>
            <span className={`font-medium ${
              new Date(certification.expiry_date) < new Date() ? 'text-red-600 dark:text-red-400' : ''
            }`}>
              {format(new Date(certification.expiry_date), 'dd MMM yyyy', { locale: fr })}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild variant="outline" className="w-full">
          <Link to="/_authenticated/compliance/certifications/$certId" params={{ certId: certification.id }}>
            Voir détails
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
