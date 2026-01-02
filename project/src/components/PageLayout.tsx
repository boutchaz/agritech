import React from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import { useSidebarMargin } from '../hooks/useSidebarLayout';
import type { Module } from '../types';

const defaultModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: [
      { name: 'Rendement', value: 12.5, unit: 't/ha', trend: 'up' },
      { name: 'Irrigation', value: 850, unit: 'm³/ha', trend: 'stable' }
    ]
  },
];

interface PageLayoutProps {
  children: React.ReactNode;
  activeModule?: string;
  modules?: Module[];
  className?: string;
  /** Additional content to render inside main but before children */
  header?: React.ReactNode;
}

/**
 * Shared page layout component that handles:
 * - RTL support (dir attribute)
 * - Sidebar with proper margins
 * - Dark mode support
 *
 * Use this component in route files instead of duplicating layout logic.
 */
export function PageLayout({
  children,
  activeModule = 'dashboard',
  modules = defaultModules,
  className = '',
  header,
}: PageLayoutProps) {
  const { i18n } = useTranslation();
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [currentActiveModule, setCurrentActiveModule] = React.useState(activeModule);

  const isRTL = i18n.language === 'ar';
  const { style: sidebarStyle } = useSidebarMargin(isRTL);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={currentActiveModule}
        onModuleChange={setCurrentActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
      />
      <main
        className={`bg-gray-50 dark:bg-gray-900 min-h-screen transition-all duration-300 ease-in-out ${className}`}
        style={sidebarStyle}
      >
        {header}
        {children}
      </main>
    </div>
  );
}

export default PageLayout;
