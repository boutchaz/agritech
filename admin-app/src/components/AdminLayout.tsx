import { useEffect, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import {
  Database,
  LogOut,
  Users,
  CalendarCheck,
  Building2,
  CreditCard,
  Mail,
  Clock,
  Menu,
  X,
  Megaphone,
  BookOpen,
  Globe,
  Package,
  Library,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

const COLLAPSED_KEY = 'admin-sidebar-collapsed';
import { useAuth } from '@/hooks/useAuth';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const navItems = [
    { to: '/', label: 'Référentiels', icon: Database, match: (p: string) => p === '/' || p.startsWith('/referentiels') },
    { to: '/clients', label: 'Clients', icon: Building2, match: (p: string) => p === '/clients' || p.startsWith('/clients/') },
    { to: '/subscription-model', label: 'Subscription Model', icon: CreditCard },
    { to: '/modules', label: 'Modules', icon: Package },
    { to: '/email-templates', label: 'Email Templates', icon: Mail },
    { to: '/cron-jobs', label: 'Cron Jobs', icon: Clock },
    { to: '/banners', label: 'Banners', icon: Megaphone },
    { to: '/rag-sources', label: 'RAG Corpus', icon: Library },
    { to: '/changelog', label: 'Changelog', icon: BookOpen },
    { to: '/supported-countries', label: 'Supported Countries', icon: Globe },
    { to: '/rdv', label: 'RDV SIAM', icon: CalendarCheck },
  ];

  useEffect(() => {
    void pathname;
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="flex min-h-dvh flex-col bg-gray-100 md:h-screen md:max-h-screen md:flex-row">
      {/* Mobile top bar — base layout first */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 pt-[env(safe-area-inset-top)] md:hidden">
        <button
          type="button"
          aria-expanded={mobileNavOpen}
          aria-controls="admin-nav"
          aria-label="Open navigation menu"
          onClick={() => setMobileNavOpen(true)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
        >
          <Menu className="h-6 w-6 shrink-0" />
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-emerald-800">
          AgroGina Admin
        </span>
        <span className="w-10 shrink-0" aria-hidden />
      </header>

      {/* Overlay when mobile drawer open */}
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      {/* Sidebar: off-canvas on small screens, persistent from md, collapsible on desktop */}
      <aside
        id="admin-nav"
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[min(18rem,100vw)] max-w-full flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 ease-out',
          'md:static md:z-0 md:max-w-none md:translate-x-0 md:shadow-none md:transition-[width] md:duration-200',
          collapsed ? 'md:w-16' : 'md:w-64',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          className={clsx(
            'flex h-14 items-center border-b border-gray-200 px-4 md:h-16',
            collapsed ? 'md:justify-center md:px-2' : 'md:px-6 justify-between',
          )}
        >
          {!collapsed && (
            <span className="truncate text-lg font-bold text-emerald-700 md:text-xl">AgroGina Admin</span>
          )}
          {collapsed && (
            <span className="hidden truncate text-lg font-bold text-emerald-700 md:inline">AG</span>
          )}
          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
            aria-label="Close navigation menu"
            onClick={closeMobileNav}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={clsx(
              'hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:inline-flex',
              collapsed && 'md:hidden',
            )}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain py-4" aria-label="Main">
          <ul className={clsx('space-y-1', collapsed ? 'md:px-2 px-3' : 'px-3')}>
            {navItems.map((item) => {
              const active = item.match ? item.match(pathname) : isActive(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={closeMobileNav}
                    title={collapsed ? item.label : undefined}
                    className={clsx(
                      'flex items-center rounded-lg text-sm font-medium transition-colors',
                      collapsed ? 'md:justify-center md:px-2 md:py-2.5 gap-3 px-3 py-2.5' : 'gap-3 px-3 py-2.5',
                      active
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className={clsx(collapsed && 'md:hidden')}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className={clsx(
            'border-t border-gray-200 pb-[max(1rem,env(safe-area-inset-bottom))]',
            collapsed ? 'md:p-2 p-4' : 'p-4',
          )}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="hidden w-full items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:flex mb-2"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          ) : null}

          <div className={clsx('mb-3 flex items-center gap-3', collapsed && 'md:hidden')}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Users className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500">Internal Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            title={collapsed ? 'Sign Out' : undefined}
            className={clsx(
              'flex w-full items-center rounded-lg text-sm text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200',
              collapsed ? 'md:justify-center md:px-2 md:py-2 gap-2 px-3 py-2' : 'gap-2 px-3 py-2',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={clsx(collapsed && 'md:hidden')}>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
