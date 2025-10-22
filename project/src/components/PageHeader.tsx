import React, { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import OrganizationSwitcher from './OrganizationSwitcher';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem as BreadcrumbItemUI,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';

interface BreadcrumbItem {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  path?: string; // Add path for navigation
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  actions?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ breadcrumbs, actions }) => {
  const navigate = useNavigate();

  const handleBreadcrumbClick = (path?: string) => {
    if (path) {
      navigate({ to: path });
    }
  };

  return (
    <div className="p-3 sm:p-4 pl-16 lg:pl-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
      <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === breadcrumbs.length - 1;

              return (
                <React.Fragment key={index}>
                  <BreadcrumbItemUI>
                    {isLast ? (
                      <BreadcrumbPage className="flex items-center gap-1.5">
                        {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                        <span className="text-xs sm:text-sm">{item.label}</span>
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        onClick={() => handleBreadcrumbClick(item.path)}
                        className={`flex items-center gap-1.5 ${
                          item.path ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                        <span className={`text-xs sm:text-sm ${
                          index === 0 ? 'truncate max-w-[80px] sm:max-w-[120px] lg:max-w-none' : ''
                        }`}>
                          {item.label}
                        </span>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItemUI>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
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
