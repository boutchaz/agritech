import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Search, Filter, Award } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/radix-select';
import { CertificationCard } from '@/components/compliance/CertificationCard';
import { CreateCertificationDialog } from '@/components/compliance/CreateCertificationDialog';

import { useCertifications } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { CertificationType, CertificationStatus } from '@/lib/api/compliance';

export const Route = createFileRoute('/_authenticated/compliance/certifications')({
  component: CertificationsPage,
});

function CertificationsPage() {
  const { currentOrganization } = useAuth();
  const { data: certifications, isLoading } = useCertifications(currentOrganization?.id || null);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredCertifications = certifications?.filter(cert => {
    const matchesSearch = 
      cert.certification_type.toLowerCase().includes(search.toLowerCase()) ||
      cert.certification_number.toLowerCase().includes(search.toLowerCase()) ||
      cert.issuing_body.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === 'all' || cert.certification_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Certifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les certifications de votre organisation.
          </p>
        </div>
        <CreateCertificationDialog />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par type, numéro, organisme..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Type" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.values(CertificationType).map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value={CertificationStatus.ACTIVE}>Active</SelectItem>
              <SelectItem value={CertificationStatus.PENDING_RENEWAL}>Renouvellement</SelectItem>
              <SelectItem value={CertificationStatus.EXPIRED}>Expirée</SelectItem>
              <SelectItem value={CertificationStatus.SUSPENDED}>Suspendue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredCertifications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertifications.map((cert) => (
            <CertificationCard key={cert.id} certification={cert} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
          <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aucune certification trouvée</h3>
          <p className="text-muted-foreground mt-1">
            Essayez de modifier vos filtres ou créez une nouvelle certification.
          </p>
        </div>
      )}
    </div>
  );
}
