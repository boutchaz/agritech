import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, X, Home as HomeIcon } from 'lucide-react';
import OrganizationSwitcher from './OrganizationSwitcher';
import FarmSwitcher from './FarmSwitcher';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../hooks/useAuth';
import { useIsMdUp } from '../hooks/useMediaQuery';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import { cn } from '@/lib/utils';
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

const ModernPageHeader = ({
  breadcrumbs,
  title,
  subtitle,
  actions,
  searchPlaceholder = 'Rechercher...',
  onSearch,
  showSearch = false,
}: ModernPageHeaderProps) => {
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
  /** Use md (768px), not lg (1024px), so iPad / tablet get farm + org switchers like desktop. */
  const showExpandedTopBar = useIsMdUp();
  // YouTube-style hide-on-scroll on mobile only. Desktop keeps the
  // header fully pinned — large viewports don't need the extra
  // vertical real estate and the hide/show motion is distracting.
  const hiddenOnScroll = useHideOnScroll({ disabled: showExpandedTopBar });

  // Handle farm change
  const handleFarmChange = (farmId: string) => {
    const selectedFarm = farms.find(farm => farm.id === farmId);
    if (selectedFarm) {
      setCurrentFarm(selectedFarm);
    }
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 shadow-sm transition-transform duration-300 will-change-transform',
        hiddenOnScroll && '-translate-y-full',
      )}
    >
      {/* Top bar: compact on narrow phones only; from md up show farm + org switchers (aligns with sidebar). NotificationBell mounts in one branch only. */}
      {!showExpandedTopBar ? (
        <div className="border-b border-slate-50 dark:border-slate-800/50">
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
                <BreadcrumbList className="text-[10px] font-medium uppercase tracking-widest flex-nowrap gap-1">
                  {breadcrumbs.slice(-2).map((item, index) => {
                    const isLast = index === 1 || breadcrumbs.length === 1;
                    return (
                      <React.Fragment key={item.label}>
                        {index > 0 && <BreadcrumbSeparator className="[&>svg]:w-2 [&>svg]:h-2 opacity-30" />}
                        <BreadcrumbListItem className="truncate">
                          {isLast ? (
                            <BreadcrumbPage className="whitespace-nowrap font-semibold text-slate-900 dark:text-white truncate">
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
        </div>
      ) : (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800/50 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <Breadcrumb className="min-w-0 flex-1 lg:me-4">
              <BreadcrumbList className="text-[10px] font-medium uppercase tracking-[0.2em] gap-2">
                {breadcrumbs.map((item, index) => {
                  const Icon = item.icon;
                  const isLast = index === breadcrumbs.length - 1;

                  return (
                    <React.Fragment key={`${item.path ?? item.label}`}>
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

            <div className="flex w-full flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3 lg:ml-2 lg:w-auto lg:gap-4">
              <div className="flex min-w-0 max-w-full items-center gap-1.5 rounded-2xl border border-slate-100 bg-slate-50 p-1 shadow-inner dark:border-slate-700/50 dark:bg-slate-800/50 sm:gap-2">
                <FarmSwitcher currentFarmId={currentFarmId || ''} onFarmChange={handleFarmChange} />
                <div className="h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
                <OrganizationSwitcher />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <LanguageSwitcher />
                <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                <NotificationBell />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Title, subtitle, search & actions — must render on all breakpoints (was desktop-only). */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="py-4 sm:py-5 lg:py-6">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 xl:gap-6">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0 flex-1 group">
              {CurrentIcon && (
                <div className="flex-shrink-0 p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-[1.25rem] shadow-sm border border-emerald-100/50 dark:border-emerald-800/30 group-hover:scale-110 transition-transform duration-500">
                  <CurrentIcon className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight break-words hyphens-auto">
                  {title || currentPage.label}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl text-pretty line-clamp-2 xl:line-clamp-none">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full min-w-0 xl:w-auto xl:flex-shrink-0 xl:justify-end">
              {showSearch && (
                <div className="relative w-full sm:flex-1 lg:w-96">
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
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
                      <kbd className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-medium text-slate-400 shadow-sm leading-none">⌘</kbd>
                      <kbd className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-medium text-slate-400 shadow-sm leading-none">K</kbd>
                    </div>
                  )}
                </div>
              )}

              {actions && (
                <div className="flex flex-nowrap items-center gap-3 min-w-0 max-w-full overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernPageHeader;
