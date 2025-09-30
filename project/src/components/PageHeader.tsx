import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import OrganizationSwitcher from './OrganizationSwitcher';

interface BreadcrumbItem {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  actions?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ breadcrumbs, actions }) => {
  return (
    <div className="p-3 sm:p-4 pl-16 lg:pl-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
      <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm whitespace-nowrap">
          {breadcrumbs.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === breadcrumbs.length - 1;

            return (
              <React.Fragment key={index}>
                <div
                  className={`flex items-center space-x-1 ${
                    isLast
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                  <span className={index === 0 ? 'truncate max-w-[80px] sm:max-w-[120px] lg:max-w-none' : ''}>
                    {item.label}
                  </span>
                </div>
                {!isLast && (
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
        {actions}
        <div className="w-full sm:w-auto">
          <OrganizationSwitcher />
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
