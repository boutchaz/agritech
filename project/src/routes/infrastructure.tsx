import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../components/MultiTenantAuthProvider'
import Sidebar from '../components/Sidebar'
import InfrastructureManagement from '../components/InfrastructureManagement'

import { MobileNavBar } from '../components/MobileNavBar'
import ModernPageHeader from '../components/ModernPageHeader'
import { useState } from 'react'
import { Building2, Building } from 'lucide-react'
import type { Module } from '../types'
import { useTranslation } from 'react-i18next'

// Note: These mock modules are not displayed in the infrastructure page
// They are left for reference but not actively used
const mockModules: Module[] = [];

const AppContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentOrganization, currentFarm: _currentFarm } = useAuth();
  const [activeModule, setActiveModule] = useState('infrastructure');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);
  const isRTL = i18n.language === 'ar';

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'dark' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
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
        <MobileNavBar title={t('nav.infrastructure')} />

        {/* Desktop Header */}
        <div className="hidden md:block">
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building, label: currentOrganization.name, path: '/settings/organization' },
              { icon: Building2, label: t('nav.infrastructure'), isActive: true }
            ]}
            title={t('nav.infrastructure')}
            subtitle={t('infrastructure.subtitle')}
          />
        </div>

        <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
          <InfrastructureManagement />
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/infrastructure')({
  component: AppContent,
})
