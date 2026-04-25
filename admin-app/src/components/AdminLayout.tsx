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
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const COLLAPSED_KEY = 'admin-sidebar-collapsed';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Référentiels', icon: Database, match: (p) => p === '/' || p.startsWith('/referentiels') },
  { to: '/clients', label: 'Clients', icon: Building2, match: (p) => p === '/clients' || p.startsWith('/clients/') },
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
        /* ignore */
      }
      return next;
    });
  };

  const isActive = (item: NavItem) =>
    item.match ? item.match(pathname) : pathname === item.to || pathname.startsWith(item.to + '/');

  useEffect(() => {
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
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 pt-[env(safe-area-inset-top)] md:hidden">
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

      {/* Mobile overlay */}
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        id="admin-nav"
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,100vw)] max-w-full flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-out',
          'md:static md:z-0 md:max-w-none md:translate-x-0 md:shadow-none md:transition-[width] md:duration-300 md:ease-in-out',
          collapsed ? 'md:w-20' : 'md:w-64',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div
          className={clsx(
            'shrink-0 border-b border-slate-200 bg-white',
            collapsed ? 'md:p-2 p-4' : 'p-4',
          )}
        >
          <div className={clsx('flex items-center gap-2', collapsed && 'md:justify-center')}>
            <Link
              to="/"
              onClick={closeMobileNav}
              className={clsx(
                'flex min-w-0 flex-1 items-center gap-3',
                collapsed && 'md:w-full md:flex-none md:justify-center',
              )}
            >
              <span
                className={clsx(
                  'flex shrink-0 items-center justify-center',
                  collapsed && 'md:mx-auto md:flex md:h-11 md:w-11 md:shrink-0 md:rounded-2xl md:bg-slate-50',
                )}
              >
                <img
                  src="/assets/logo.png"
                  alt="AgroGina"
                  className={clsx(
                    'block shrink-0 object-contain object-center',
                    collapsed ? 'h-8 w-8 md:h-7 md:w-7' : 'h-10 w-10 rounded-lg',
                  )}
                />
              </span>
              <div className={clsx('min-w-0 flex-1', collapsed && 'md:hidden')}>
                <h2 className="truncate text-sm font-bold text-slate-900">AgroGina Admin</h2>
                <p className="text-xs text-slate-500">Internal Console</p>
              </div>
            </Link>
            <button
              type="button"
              className={clsx(
                'rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden',
                collapsed && 'md:hidden',
              )}
              aria-label="Close navigation menu"
              onClick={closeMobileNav}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main"
          className={clsx(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4',
            collapsed && 'md:flex md:flex-col md:items-center md:px-2',
          )}
        >
          <ul
            className={clsx(
              'space-y-1',
              collapsed && 'md:flex md:flex-col md:items-center md:space-y-2',
            )}
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <li key={item.to} className={clsx(collapsed && 'md:w-auto', !collapsed && 'w-full')}>
                  <Link
                    to={item.to}
                    onClick={closeMobileNav}
                    title={collapsed ? item.label : undefined}
                    className={clsx(
                      'flex items-center text-sm font-medium transition-colors',
                      collapsed
                        ? 'md:h-10 md:w-10 md:shrink-0 md:justify-center md:rounded-xl md:px-0 gap-3 rounded-lg px-3 py-2.5 w-full'
                        : 'h-11 w-full justify-start gap-3 rounded-lg px-3',
                      active
                        ? collapsed
                          ? 'bg-emerald-50 text-emerald-700 md:bg-emerald-600 md:text-white md:shadow-lg md:shadow-emerald-200/80 md:hover:bg-emerald-600'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'text-slate-900 hover:bg-slate-100 active:bg-slate-200 md:hover:bg-slate-50',
                    )}
                  >
                    <item.icon
                      className={clsx(
                        'shrink-0',
                        collapsed ? 'h-4 w-4 md:h-5 md:w-5' : 'h-4 w-4',
                      )}
                      aria-hidden
                    />
                    <span className={clsx('flex-1 truncate text-left', collapsed && 'md:hidden')}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div
          className={clsx(
            'shrink-0 space-y-1 border-t border-slate-200 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]',
            collapsed ? 'md:p-2 p-3' : 'p-3',
            collapsed && 'md:flex md:flex-col md:items-center md:space-y-2',
          )}
        >
          <div className={clsx('flex items-center gap-3 rounded-lg px-2 py-2', collapsed && 'md:hidden')}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Users className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user?.email}</p>
              <p className="text-xs text-slate-500">Internal Admin</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            title={collapsed ? 'Sign Out' : undefined}
            className={clsx(
              'flex items-center text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 active:bg-slate-200',
              collapsed
                ? 'md:h-10 md:w-10 md:shrink-0 md:justify-center md:rounded-xl md:px-0 gap-2 rounded-lg px-3 py-2 w-full'
                : 'h-9 w-full justify-start gap-2 rounded-lg px-3',
            )}
          >
            <LogOut className={clsx('shrink-0', collapsed ? 'h-4 w-4 md:h-5 md:w-5' : 'h-4 w-4')} />
            <span className={clsx(collapsed && 'md:hidden')}>Sign Out</span>
          </button>

          {/* Collapse Toggle - desktop only */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={clsx(
              'hidden text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 md:flex',
              collapsed
                ? 'md:h-10 md:w-10 md:shrink-0 md:items-center md:justify-center md:rounded-xl md:mx-auto'
                : 'h-9 w-full items-center justify-start gap-3 rounded-lg px-3',
            )}
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
