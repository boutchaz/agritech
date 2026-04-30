import {
  ChevronsDownUp,
  ChevronsUpDown,
  FolderTree,
  List,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';

export type HierarchicalViewMode = 'table' | 'tree';

export interface HierarchicalListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  viewMode: HierarchicalViewMode;
  onViewModeChange: (mode: HierarchicalViewMode) => void;

  /** Show the "expand all / collapse all" buttons (only meaningful in tree view). */
  showExpandControls?: boolean;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;

  /** Optional override labels — falls back to common namespace keys. */
  labels?: {
    tableView?: string;
    treeView?: string;
    expandAll?: string;
    collapseAll?: string;
  };

  className?: string;
}

/**
 * Reusable toolbar for hierarchical resources (item groups, chart of accounts,
 * etc). Renders a search bar plus a view-mode toggle and (in tree mode)
 * expand-all / collapse-all controls.
 */
export function HierarchicalListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  viewMode,
  onViewModeChange,
  showExpandControls = false,
  onExpandAll,
  onCollapseAll,
  labels,
  className,
}: HierarchicalListToolbarProps) {
  const { t } = useTranslation('common');

  const tableView = labels?.tableView ?? t('hierarchicalView.tableView', 'Table view');
  const treeView = labels?.treeView ?? t('hierarchicalView.treeView', 'Tree view');
  const expandAll = labels?.expandAll ?? t('hierarchicalView.expandAll', 'Expand all');
  const collapseAll = labels?.collapseAll ?? t('hierarchicalView.collapseAll', 'Collapse all');

  return (
    <div className={cn('space-y-3', className)}>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/50">
          <Button
            type="button"
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            className="gap-1.5"
          >
            <List className="h-4 w-4" />
            {tableView}
          </Button>
          <Button
            type="button"
            variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('tree')}
            className="gap-1.5"
          >
            <FolderTree className="h-4 w-4" />
            {treeView}
          </Button>
        </div>
        {viewMode === 'tree' && showExpandControls && (
          <div className="flex items-center gap-1">
            {onExpandAll && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onExpandAll}
                className="gap-1.5"
              >
                <ChevronsUpDown className="h-4 w-4" />
                {expandAll}
              </Button>
            )}
            {onCollapseAll && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCollapseAll}
                className="gap-1.5"
              >
                <ChevronsDownUp className="h-4 w-4" />
                {collapseAll}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HierarchicalListToolbar;
