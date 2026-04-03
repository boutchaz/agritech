import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, X, Home as HomeIcon } from 'lucide-react';
import OrganizationSwitcher from './OrganizationSwitcher';
import FarmSwitcher from './FarmSwitcher';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem as BreadcrumbListItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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
    <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300">
      {/* ===== MOBILE HEADER (<lg) ===== */}
      <div className="lg:hidden">
        {/* Mobile Navigation Bar */}
        <div className="flex gap-2 py-2 px-3 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/' })}
            className="flex-shrink-0 h-9 w-9 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl"
            aria-label="Go to home"
          >
            <HomeIcon className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList className="text-[10px] font-black uppercase tracking-widest flex-nowrap gap-1">
                {breadcrumbs.slice(-2).map((item, index) => {
                  const isLast = index === 1 || breadcrumbs.length === 1;
                  return (
                    <React.Fragment key={item.label}>
                      {index > 0 && <BreadcrumbSeparator className="[&>svg]:w-2 [&>svg]:h-2 opacity-30" />}
                      <BreadcrumbListItem className="truncate">
                        {isLast ? (
                          <BreadcrumbPage className="whitespace-nowrap font-black text-slate-900 dark:text-white truncate">
                            {item.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            className="whitespace-nowrap cursor-pointer text-slate-400"
                            onClick={() => handleBreadcrumbClick(item.path)}
                          >
                            {item.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbListItem>
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <NotificationBell />
            <div className="w-px h-4 bg-slate-100 dark:bg-slate-800 mx-1" />
            <LanguageSwitcher compact />
          </div>
        </div>

        {/* Mobile Actions */}
        {actions && (
          <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-50 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
            {actions}
          </div>
        )}
      </div>

      {/* ===== DESKTOP HEADER (lg+) ===== */}
      <div className="hidden lg:block">
        <div className="px-6 lg:px-8">
          {/* Top Section - Breadcrumbs & Organization */}
          <div className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-slate-800/50">
            {/* Breadcrumbs */}
            <Breadcrumb className="flex-1 me-4">
              <BreadcrumbList className="text-[10px] font-black uppercase tracking-[0.2em] gap-2">
                {breadcrumbs.map((item, index) => {
                  const Icon = item.icon;
                  const isLast = index === breadcrumbs.length - 1;

                  return (
                    <React.Fragment key={`${item.path ?? item.label}-${index}`}>
                      {index > 0 && <BreadcrumbSeparator className="opacity-20" />}
                      <BreadcrumbListItem>
                        {isLast ? (
                          <BreadcrumbPage className="inline-flex items-center gap-2 whitespace-nowrap text-slate-900 dark:text-white">
                            {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />}
                            <span>{item.label}</span>
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            className="inline-flex items-center gap-2 whitespace-nowrap cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                            onClick={() => handleBreadcrumbClick(item.path)}
                          >
                            {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />}
                            <span>{item.label}</span>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbListItem>
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>

            {/* Organization Switcher & Notifications */}
            <div className="flex flex-shrink-0 items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-inner">
                <FarmSwitcher currentFarmId={currentFarmId || ''} onFarmChange={handleFarmChange} />
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                <OrganizationSwitcher />
              </div>
              <div className="flex items-center gap-3 ml-2">
                <LanguageSwitcher />
                <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                <NotificationBell />
              </div>
            </div>
          </div>

          {/* Main Section - Title & Actions */}
          <div className="py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Title & Subtitle */}
              <div className="flex items-center gap-5 min-w-0 flex-1 group">
                {CurrentIcon && (
                  <div className="flex-shrink-0 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-[1.25rem] shadow-sm border border-emerald-100/50 dark:border-emerald-800/30 group-hover:scale-110 transition-transform duration-500">
                    <CurrentIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                    {title || currentPage.label}
                  </h1>
                  {subtitle && (
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Search & Actions */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Search Bar */}
                {showSearch && (
                  <div className="relative flex-1 lg:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                    <Input
                      type="search"
                      placeholder={searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-11 pr-12 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 h-12 rounded-2xl focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium"
                    />
                    {searchQuery ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <X className="h-4 w-4 text-slate-500" />
                      </Button>
                    ) : (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-black text-slate-400 shadow-sm leading-none">⌘</kbd>
                        <kbd className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-black text-slate-400 shadow-sm leading-none">K</kbd>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Actions */}
                {actions && (
                  <div className="flex items-center gap-3">
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
