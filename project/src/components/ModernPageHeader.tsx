import React, { ReactNode, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, X, ChevronRight, Command } from 'lucide-react';
import OrganizationSwitcher from './OrganizationSwitcher';

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

  return (
    <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Top Section - Breadcrumbs & Organization */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700/50">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm overflow-x-auto flex-1 mr-4">
            {breadcrumbs.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === breadcrumbs.length - 1;

              return (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => !isLast && handleBreadcrumbClick(item.path)}
                    disabled={isLast}
                    className={`flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                      isLast
                        ? 'text-gray-900 dark:text-white font-medium cursor-default'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                    <span className={index === 0 ? 'hidden sm:inline' : ''}>
                      {item.label}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          {/* Organization Switcher */}
          <div className="flex-shrink-0">
            <OrganizationSwitcher />
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
  );
};

export default ModernPageHeader;
