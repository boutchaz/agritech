import * as React from 'react';
import type { TFunction } from 'i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProtectedNavItem } from '@/components/authorization/ProtectedNavItem';
import type { NavItem, NavSection } from '@/config/sidebar-nav';

interface PopoverNavItemProps {
  path: string;
  label: string;
  isActive: boolean;
  onNavigate: (path: string, e?: React.MouseEvent) => void;
}

function PopoverNavItem({ path, label, isActive, onNavigate }: PopoverNavItemProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full h-8 justify-start text-sm text-slate-900 dark:text-slate-100',
        isActive &&
          'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
      )}
      onClick={(e) => onNavigate(path, e)}
    >
      {label}
    </Button>
  );
}

export interface SidebarSectionProps {
  section: NavSection;
  isCollapsed: boolean;
  isRTL: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  currentPath: string;
  onNavigate: (path: string, e?: React.MouseEvent) => void;
  isRouteEnabled: (path: string) => boolean;
  t: TFunction;
  /** Section header click target — same as expand toggle in expanded mode. */
  headerClassName: string;
  /** Class for individual sub-item buttons. */
  getSubItemClassName: (active: boolean) => string;
  /** Renderer for the section icon (handles RTL margins, sizing). */
  renderIcon: (Icon: React.ComponentType<{ className?: string }>) => React.ReactNode;
  /** Renderer for the section title text (handles RTL alignment, truncation). */
  renderSectionTitle: (text: string) => React.ReactNode;
  /** Renderer for sub-item text. */
  renderText: (text: string) => React.ReactNode;
  /** Renderer for the chevron at the end of the section header. */
  renderChevron: (isOpen: boolean) => React.ReactNode;
}

function isItemActive(item: NavItem, currentPath: string): boolean {
  return currentPath === item.path || currentPath.startsWith(item.path + '/');
}

function wrapWithPermission(
  permission: NavItem['permission'] | undefined,
  child: React.ReactNode,
): React.ReactNode {
  if (!permission) return child;
  return (
    <ProtectedNavItem action={permission.action as any} subject={permission.subject as any}>
      {child as React.ReactElement}
    </ProtectedNavItem>
  );
}

/**
 * Renders one collapsible navigation section. Uses the same `NavSection` config
 * for both the collapsed-rail popover and the expanded button list, so the two
 * views can never drift out of sync.
 */
export function SidebarSection({
  section,
  isCollapsed,
  isRTL,
  expanded,
  onToggleExpand,
  currentPath,
  onNavigate,
  isRouteEnabled,
  t,
  headerClassName,
  getSubItemClassName,
  renderIcon,
  renderSectionTitle,
  renderText,
  renderChevron,
}: SidebarSectionProps) {
  // Hide whole section when its module gate is disabled.
  if (section.moduleGate && !isRouteEnabled(section.moduleGate)) {
    return null;
  }

  const visibleItems = section.items.filter(
    (item) => !item.moduleGate || isRouteEnabled(item.moduleGate),
  );
  if (visibleItems.length === 0) return null;

  const sectionLabel = t(section.label, section.label);

  const sectionContent = isCollapsed ? (
    <div className="hidden md:flex md:justify-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            data-tour={section.dataTour}
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-0 text-slate-900 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-100',
            )}
            aria-label={sectionLabel}
          >
            <section.icon className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side={isRTL ? 'left' : 'right'}
          align="start"
          sideOffset={8}
          className="w-56 p-1 bg-white dark:bg-slate-900"
        >
          <div className="px-2 py-1.5 text-sm font-medium text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 mb-1">
            {sectionLabel}
          </div>
          <div className="space-y-0.5">
            {visibleItems.map((item) =>
              wrapWithPermission(
                item.permission,
                <PopoverNavItem
                  key={item.id}
                  path={item.path}
                  label={t(item.label, item.label)}
                  isActive={isItemActive(item, currentPath)}
                  onNavigate={onNavigate}
                />,
              ),
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  ) : (
    <>
      <Button
        variant="ghost"
        className={headerClassName}
        onClick={onToggleExpand}
        data-tour={section.dataTour}
      >
        <div
          className={cn(
            'flex items-center',
            isRTL && 'flex-row-reverse',
          )}
        >
          {renderIcon(section.icon)}
          {renderSectionTitle(sectionLabel)}
        </div>
        {renderChevron(expanded)}
      </Button>
      {expanded && (
        <>
          {visibleItems.map((item) =>
            wrapWithPermission(
              item.permission,
              <Button
                key={item.id}
                variant="ghost"
                data-tour={item.dataTour}
                className={getSubItemClassName(isItemActive(item, currentPath))}
                onClick={(e) => onNavigate(item.path, e)}
              >
                {renderText(t(item.label, item.label))}
              </Button>,
            ),
          )}
        </>
      )}
    </>
  );

  // Wrap the entire section in a permission gate when the section requires one.
  return wrapWithPermission(
    section.permission,
    <div
      className={cn(
        'space-y-1',
        isCollapsed && 'md:flex md:flex-col md:items-center md:space-y-2',
      )}
    >
      {sectionContent}
    </div>,
  );
}

// Re-export icons for caller convenience
export { ChevronDown, ChevronRight };
