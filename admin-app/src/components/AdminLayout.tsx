import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Database,
  BarChart3,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Reference Data',
    icon: Database,
    children: [
      { label: 'Account Templates', href: '/reference/account-templates' },
      { label: 'Account Mappings', href: '/reference/account-mappings' },
      { label: 'Modules', href: '/reference/modules' },
      { label: 'Currencies', href: '/reference/currencies' },
      { label: 'Roles', href: '/reference/roles' },
      { label: 'Permissions', href: '/reference/permissions' },
      { label: 'Work Units', href: '/reference/work-units' },
      { label: 'Tree Categories', href: '/reference/tree-categories' },
      { label: 'Crop Types', href: '/reference/crop-types' },
      { label: 'Item Categories', href: '/reference/item-categories' },
      { label: 'Soil Types', href: '/reference/soil-types' },
      { label: 'Irrigation Types', href: '/reference/irrigation-types' },
      { label: 'Rootstocks', href: '/reference/rootstocks' },
      { label: 'Plantation Systems', href: '/reference/plantation-systems' },
    ],
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    children: [
      { label: 'Overview', href: '/analytics/overview' },
      { label: 'Organizations', href: '/analytics/organizations' },
      { label: 'Subscriptions', href: '/analytics/subscriptions' },
      { label: 'Events', href: '/analytics/events' },
    ],
  },
  {
    label: 'Job Logs',
    href: '/jobs',
    icon: FileText,
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [expandedItems, setExpandedItems] = useState<string[]>(['Reference Data', 'Analytics']);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => currentPath === href;
  const isParentActive = (children: { href: string }[]) =>
    children.some((child) => currentPath === child.href);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-primary">AgriTech Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${isParentActive(item.children)
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedItems.includes(item.label) ? 'rotate-180' : ''
                          }`}
                      />
                    </button>
                    {expandedItems.includes(item.label) && (
                      <ul className="mt-1 ml-8 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              to={child.href}
                              className={`block px-3 py-2 rounded-md text-sm transition-colors ${isActive(child.href)
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.href!}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.href!)
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500">Internal Admin</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
