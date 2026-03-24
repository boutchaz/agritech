import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, X, Home as HomeIcon } from 'lucide-react';
import OrganizationSwitcher from './OrganizationSwitcher';
import FarmSwitcher from './FarmSwitcher';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../hooks/useAuth';

interface BreadcrumbItem {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  path?: string;
}

interface ModernPageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

const ModernPageHeader: React.FC<ModernPageHeaderProps> = ({
  breadcrumbs,
  title,
  subtitle,
  actions,
  searchPlaceholder = 'Rechercher...',
  onSearch,
  showSearch = false,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleBreadcrumbClick = (path?: string) => {
    if (path) {
      navigate({ to: path });
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch?.('');
  };

  // Get the current page info from breadcrumbs
  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const CurrentIcon = currentPage.icon;
  const { currentFarm, farms, setCurrentFarm } = useAuth();
  const currentFarmId = currentFarm?.id;

  // Handle farm change
  const handleFarmChange = (farmId: string) => {
    const selectedFarm = farms.find(farm => farm.id === farmId);
    if (selectedFarm) {
      setCurrentFarm(selectedFarm);
    }
  };

  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      {/* ===== MOBILE HEADER (<lg) ===== */}
      <div className="lg:hidden">
        {/* Mobile Navigation Bar */}
        <div className="flex gap-1 py-1.5 pl-16 pr-2 items-center">
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center"
            aria-label="Go to home"
            style={{ alignSelf: 'center' }}
          >
            <HomeIcon className="h-5 w-5" />
          </button>
          <nav className="flex flex-col justify-center flex-1 min-w-0">
            <div className="flex items-center gap-1 text-xs">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={item.label}>
                    {index > 0 && (
                      <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">/</span>
                    )}
                    {isLast ? (
                      <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {item.label}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBreadcrumbClick(item.path)}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap transition-colors outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
                      >
                        {item.label}
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </nav>
          <div className="flex flex-col justify-center gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              <OrganizationSwitcher compact />
              <LanguageSwitcher compact />
              <NotificationBell />
            </div>
          </div>
        </div>

        {/* Mobile Actions */}
        {actions && (
          <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 dark:border-gray-700/50 overflow-x-auto">
            {actions}
          </div>
        )}
      </div>

      {/* ===== DESKTOP HEADER (lg+) ===== */}
      <div className="hidden lg:block">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Top Section - Breadcrumbs & Organization */}
          <div className="flex items-center justify-between py-1.5">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-xs flex-1 me-3 min-h-[1.25rem]" aria-label="Breadcrumb">
              {breadcrumbs.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <React.Fragment key={`${item.path ?? item.label}-${index}`}>
                    {index > 0 && (
                      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 select-none" aria-hidden>/</span>
                    )}
                    {isLast ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                        {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                        <span className={index === 0 ? 'hidden sm:inline' : ''}>
                          {item.label}
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBreadcrumbClick(item.path)}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
                      >
                        {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                        <span className={index === 0 ? 'hidden sm:inline' : ''}>
                          {item.label}
                        </span>
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            {/* Organization Switcher & Notifications */}
            <div className="flex flex-shrink-0 items-center gap-2">
              <FarmSwitcher currentFarmId={currentFarmId || ''} onFarmChange={handleFarmChange} />
              <OrganizationSwitcher />
              <LanguageSwitcher />
              <NotificationBell />
            </div>
          </div>

          {/* Main Section - Title & Actions */}
          <div className="py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left: Title & Subtitle */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {CurrentIcon && (
                  <div className="flex-shrink-0 p-2.5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl">
                    <CurrentIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {title || currentPage.label}
                  </h1>
                  {subtitle && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Search & Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Search Bar */}
                {showSearch && (
                  <div className="relative flex-1 lg:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    ) : (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-xs text-gray-400">
                        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">⌘</kbd>
                        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">K</kbd>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Actions */}
                {actions && (
                  <div className="flex items-center gap-2">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernPageHeader;
