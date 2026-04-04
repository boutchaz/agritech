import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { isRTLLocale } from '@/lib/is-rtl-locale';
import { useTranslation } from 'react-i18next';
import { useSidebarMargin } from '@/hooks/useSidebarLayout';

/**
 * Full-page skeleton that mirrors the authenticated layout:
 * Sidebar + Header + Main content area.
 *
 * Shown while subscription is loading (before the real layout mounts).
 * Uses the same sidebar margin hook as the real layout.
 */
export function AuthenticatedLayoutSkeleton() {
  const { i18n } = useTranslation();
  const isRTL = isRTLLocale(i18n.language);
  const isDark = localStorage.getItem('darkMode') === 'true';
  const {
    style: sidebarStyle,
    isSidebarCollapsed: isCollapsed,
    sidebarWidth,
  } = useSidebarMargin(isRTL);

  return (
    <div className={isDark ? 'dark' : ''} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
        {/* ===== SIDEBAR SKELETON ===== */}
        <div
          className={cn(
            'fixed inset-y-0 z-50 h-screen bg-white dark:bg-slate-900 flex-col hidden md:flex',
            'transform transition-all duration-300 ease-in-out',
            isRTL ? 'right-0 border-l' : 'left-0 border-r',
            'border-slate-200 dark:border-slate-800',
            !isCollapsed && 'w-64',
          )}
          style={
            isCollapsed && sidebarWidth > 0
              ? {
                  width: sidebarWidth,
                  minWidth: sidebarWidth,
                  maxWidth: sidebarWidth,
                }
              : undefined
          }
        >
          {/* Sidebar header / logo */}
          <div className={cn('flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4', isCollapsed && 'md:p-2')}>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
              {!isCollapsed && <Skeleton className="h-5 w-24" />}
            </div>
          </div>

          {/* Nav items */}
          <div className="flex-1 overflow-hidden px-2 py-3 space-y-1">
            {/* Main nav items */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`nav-${i}`} className={cn('flex items-center gap-3 h-11 px-2 rounded-md', isCollapsed && 'justify-center')}>
                <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
                {!isCollapsed && <Skeleton className={cn('h-4', i === 0 ? 'w-20' : i === 1 ? 'w-28' : 'w-24')} />}
              </div>
            ))}

            {/* Section separator */}
            <div className="py-2">
              <div className="h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Section header */}
            {!isCollapsed && (
              <div className="flex items-center justify-between px-3 h-11">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            )}

            {/* Sub items */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`sub-${i}`} className={cn('flex items-center gap-3 h-10 rounded-md', isCollapsed ? 'justify-center px-2' : 'pl-8 pr-2')}>
                <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
                {!isCollapsed && <Skeleton className={cn('h-3.5', i % 2 === 0 ? 'w-20' : 'w-16')} />}
              </div>
            ))}

            {/* Another section */}
            <div className="py-2">
              <div className="h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {!isCollapsed && (
              <div className="flex items-center justify-between px-3 h-11">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            )}

            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`sub2-${i}`} className={cn('flex items-center gap-3 h-10 rounded-md', isCollapsed ? 'justify-center px-2' : 'pl-8 pr-2')}>
                <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
                {!isCollapsed && <Skeleton className={cn('h-3.5', i % 2 === 0 ? 'w-16' : 'w-24')} />}
              </div>
            ))}
          </div>

          {/* Sidebar footer */}
          <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 p-3">
            <div className={cn('flex items-center gap-2', isCollapsed && 'justify-center')}>
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-3.5 w-20 mb-1" />
                  <Skeleton className="h-3 w-28" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== MAIN CONTENT AREA ===== */}
        <div
          className="flex flex-col h-screen transition-all duration-300 ease-in-out"
          style={sidebarStyle}
        >
          <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50/90 dark:bg-slate-900/80 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            {/* ===== PAGE HEADER SKELETON ===== */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 shadow-sm">
              {/* Mobile header */}
              <div className="md:hidden">
                <div className="flex gap-2 py-2 px-3 items-center">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex items-center gap-1.5 flex-1">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              </div>

              {/* Desktop header */}
              <div className="hidden md:block">
                <div className="px-4 sm:px-6 lg:px-8">
                  {/* Breadcrumbs row */}
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-3.5 w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-28 rounded-md" />
                      <Skeleton className="h-8 w-28 rounded-md" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>

                  {/* Title row */}
                  <div className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
                        <div>
                          <Skeleton className="h-7 w-48 mb-2" />
                          <Skeleton className="h-4 w-64" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-16 rounded-md" />
                        <Skeleton className="h-9 w-32 rounded-md" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== MAIN CONTENT SKELETON ===== */}
            <div className="p-3 sm:p-4 lg:p-6 space-y-6 animate-in fade-in duration-300">
              {/* Stat cards row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-7 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>

              {/* Content cards row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-7">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-12 w-full rounded-lg mb-4" />
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <Skeleton key={j} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Another row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-7">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <Skeleton className="h-5 w-28" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-3/4 mb-1" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>

        {/* ===== MOBILE BOTTOM NAV SKELETON ===== */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-around px-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 px-3 py-1">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-2.5 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
