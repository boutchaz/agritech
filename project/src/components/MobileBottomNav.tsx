import React from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  MapPin,
  CheckSquare,
  Package,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string; // Direct label for bottom nav (shorter)
  icon: typeof LayoutDashboard;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard', // Short label for bottom nav
    icon: LayoutDashboard,
    path: '/',
  },
  {
    id: 'parcels',
    label: 'Parcelles', // Short label for bottom nav
    icon: MapPin,
    path: '/parcels',
  },
  {
    id: 'tasks',
    label: 'Tâches', // Short label for bottom nav
    icon: CheckSquare,
    path: '/tasks',
  },
  {
    id: 'stock',
    label: 'Stock', // Short label for bottom nav
    icon: Package,
    path: '/stock',
  },
  {
    id: 'more',
    label: 'Plus', // Short label for bottom nav
    icon: MoreHorizontal,
    path: '#more',
  },
];

const MobileBottomNav: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Translations for short labels
  const labels: Record<string, Record<string, string>> = {
    en: {
      dashboard: 'Home',
      parcels: 'Parcels',
      tasks: 'Tasks',
      stock: 'Stock',
      more: 'More',
    },
    fr: {
      dashboard: 'Accueil',
      parcels: 'Parcelles',
      tasks: 'Tâches',
      stock: 'Stock',
      more: 'Plus',
    },
    ar: {
      dashboard: 'الرئيسية',
      parcels: 'القطع',
      tasks: 'المهام',
      stock: 'المخزون',
      more: 'المزيد',
    },
  };

  const getLabel = (id: string) => {
    return labels[i18n.language]?.[id] || labels.en[id] || id;
  };

  const handleNavigate = (item: NavItem) => {
    if (item.id === 'more') {
      // TODO: Open more menu sheet
      return;
    }
    navigate({ to: item.path as any });
  };

  const isActive = (item: NavItem) => {
    if (item.id === 'dashboard' && location.pathname === '/') {
      return true;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 min-w-0 py-2 relative',
                'transition-colors duration-200',
                'touch-manipulation',
                active
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
              aria-label={getLabel(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1.5 font-medium overflow-hidden text-ellipsis whitespace-nowrap w-full text-center px-0.5">
                {getLabel(item.id)}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 dark:bg-green-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
