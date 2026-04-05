import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { Search, Filter, Award, Building2 } from 'lucide-react';

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
import { Skeleton } from '@/components/ui/skeleton';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLayout } from '@/components/PageLayout';

import { useCertifications } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { CertificationType, CertificationStatus } from '@/lib/api/compliance';

export const Route = createFileRoute('/_authenticated/compliance/certifications/')({
  component: CertificationsPage,
});

function CertificationsPage() {
  const { t } = useTranslation('compliance');
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
    <PageLayout
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization?.name || '', path: '/dashboard' },
            { icon: Award, label: t('breadcrumb.compliance'), path: '/compliance' },
            { icon: Award, label: t('breadcrumb.certifications'), isActive: true },
          ]}
          title={t('certifications.title')}
          subtitle={t('certifications.subtitle')}
          actions={<CreateCertificationDialog />}
        />
      }
    >
    <div className="container mx-auto px-4 py-6 space-y-8">

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('certifications.searchPlaceholder')}
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
              <SelectItem value="all">{t('certifications.allTypes')}</SelectItem>
              {Object.values(CertificationType).map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('table.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('certifications.allStatuses')}</SelectItem>
              <SelectItem value={CertificationStatus.ACTIVE}>{t('status.active')}</SelectItem>
              <SelectItem value={CertificationStatus.PENDING_RENEWAL}>{t('status.pendingRenewal')}</SelectItem>
              <SelectItem value={CertificationStatus.EXPIRED}>{t('status.expired')}</SelectItem>
              <SelectItem value={CertificationStatus.SUSPENDED}>{t('status.suspended')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((skIdx) => (
            <div key={"sk-" + skIdx} className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-28 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between py-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex justify-between py-1">
                  <Skeleton className="h-4 w-18" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('certifications.noCertificationsFound')}</h3>
          <p className="text-muted-foreground mt-1">
            {t('certifications.noCertificationsHint')}
          </p>
        </div>
      )}
    </div>
    </PageLayout>
  );
}
