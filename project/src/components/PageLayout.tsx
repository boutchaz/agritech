import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  /** Reserved for sidebar / nav coherence (not rendered to DOM) */
  activeModule?: string;
}

/**
 * Standard module shell: sticky ModernPageHeader + scrollable body.
 * Matches dashboard / settings rhythm (flex column, min-h-0 for nested scroll).
 */
export function PageLayout({
  children,
  className = '',
  header,
  activeModule: _activeModule,
}: PageLayoutProps) {
  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}>
      {header}
      {children}
    </div>
  );
}

export default PageLayout;
