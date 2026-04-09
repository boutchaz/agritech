import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { Filter, Award, Building2 } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/radix-select';
import { CertificationCard } from '@/components/compliance/CertificationCard';
import { CreateCertificationDialog } from '@/components/compliance/CreateCertificationDialog';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLayout } from '@/components/PageLayout';
import { FilterBar, ListPageLayout, ResponsiveList } from '@/components/ui/data-table';

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
    <div className="container mx-auto px-4 py-6">
      <ListPageLayout
        filters={
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <FilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder={t('certifications.searchPlaceholder')}
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
        }
      >
        <ResponsiveList
          items={filteredCertifications}
          isLoading={isLoading}
          keyExtractor={(cert) => cert.id}
          emptyIcon={Award}
          emptyTitle={t('certifications.noCertificationsFound')}
          emptyMessage={t('certifications.noCertificationsHint')}
          renderCard={(cert) => (
            <CertificationCard certification={cert} />
          )}
          renderTable={(cert) => (
            <CertificationCard certification={cert} />
          )}
        />
      </ListPageLayout>
    </div>
    </PageLayout>
  );
}
