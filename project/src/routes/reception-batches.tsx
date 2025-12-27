import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { MobileNavBar } from '../components/MobileNavBar';
import ReceptionBatchList from '@/components/Stock/ReceptionBatchList';
import ReceptionBatchForm from '@/components/Stock/ReceptionBatchForm';
import { Building2, ClipboardCheck } from 'lucide-react';
import type { Module } from '../types';
import type { ReceptionBatch } from '@/types/reception';

const mockModules: Module[] = [
  {
    id: 'reception-batches',
    name: 'Lots de Réception',
    icon: 'ClipboardCheck',
    active: true,
    category: 'agriculture',
    description: 'Gestion des lots de réception',
    metrics: []
  }
];

function ReceptionBatchesPage() {
  const { currentOrganization } = useAuth();
  const [activeModule, setActiveModule] = useState('reception-batches');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules] = useState(mockModules);
  const [showForm, setShowForm] = useState(false);
  const [batchToEdit, setBatchToEdit] = useState<ReceptionBatch | null>(null);
  const [_selectedBatch, setSelectedBatch] = useState<ReceptionBatch | null>(null);
  const search = Route.useSearch();
  const defaultHarvestId = search.harvest_id;

  useEffect(() => {
    if (defaultHarvestId) {
      setShowForm(true);
    }
  }, [defaultHarvestId]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleViewBatch = (batch: ReceptionBatch) => {
    setSelectedBatch(batch);
  };

  const handleEditBatch = (batch: ReceptionBatch) => {
    setBatchToEdit(batch);
    setShowForm(true);
  };

  const handleFormClose = (open: boolean) => {
    setShowForm(open);
    if (!open) {
      setBatchToEdit(null);
    }
  };

  const handleCreateClick = () => {
    setBatchToEdit(null);
    setShowForm(true);
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de l'organisation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar with mobile menu support */}
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
      />

      <main className="flex-1 bg-gray-50 dark:bg-gray-900 w-full lg:w-auto">
        {/* Mobile Navigation Bar */}
        <MobileNavBar title="Lots de Réception" />

        {/* Desktop Header */}
        <div className="hidden md:block">
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
              { icon: ClipboardCheck, label: 'Lots de Réception', isActive: true }
            ]}
            title="Gestion des Lots de Réception"
            subtitle="Traçabilité de la réception et contrôle qualité des récoltes"
          />
        </div>

        <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
          <ReceptionBatchList
            onCreateClick={handleCreateClick}
            onViewClick={handleViewBatch}
            onEditClick={handleEditBatch}
          />
        </div>

        <ReceptionBatchForm
          open={showForm}
          onOpenChange={handleFormClose}
          defaultHarvestId={defaultHarvestId}
          batchToEdit={batchToEdit}
        />
      </main>
    </div>
  );
}

export const Route = createFileRoute('/reception-batches')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      harvest_id: search.harvest_id as string | undefined,
    };
  },
  component: ReceptionBatchesPage,
});
