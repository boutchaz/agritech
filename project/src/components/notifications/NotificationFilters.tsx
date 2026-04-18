
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

export type NotificationTypeFilter = 'all' | 'task_assigned' | 'task_status_changed' | 'order_status_changed' | 'quote_received' | 'quote_responded' | 'harvest_completed' | 'low_inventory' | 'payment_processed' | 'sales_order_created' | 'sales_order_status_changed' | 'purchase_order_created' | 'purchase_order_status_changed' | 'stock_entry_created' | 'reception_batch_decision' | 'quality_inspection_completed' | 'delivery_status_changed' | 'delivery_completed' | 'member_added' | 'member_removed' | 'role_changed' | 'worker_added' | 'ai_recommendation_created' | 'ai_alert_triggered' | 'crop_cycle_status_changed' | 'campaign_status_changed' | 'task_reassigned' | 'piece_work_created' | 'invoice_created' | 'journal_entry_posted' | 'payment_status_changed' | 'lab_results_available' | 'product_application_completed' | 'soil_analysis_completed' | 'harvest_event_recorded' | 'work_unit_completed' | 'general';
export type NotificationStatusFilter = 'all' | 'unread' | 'important';
export type NotificationTimeFilter = 'all' | 'today' | 'week' | 'month' | 'older';

interface NotificationFiltersProps {
  typeFilter: NotificationTypeFilter;
  statusFilter: NotificationStatusFilter;
  timeFilter: NotificationTimeFilter;
  onTypeChange: (filter: NotificationTypeFilter) => void;
  onStatusChange: (filter: NotificationStatusFilter) => void;
  onTimeChange: (filter: NotificationTimeFilter) => void;
  unreadCount?: number;
  importantCount?: number;
  compact?: boolean;
  counts?: Partial<Record<NotificationTypeFilter, number>>;
}

const typeFilters: { value: NotificationTypeFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '🔔' },
  { value: 'task_assigned', label: 'Tasks', icon: '📋' },
  { value: 'task_status_changed', label: 'Task Updates', icon: '✅' },
  { value: 'order_status_changed', label: 'Orders', icon: '📦' },
  { value: 'quote_received', label: 'Quotes', icon: '💰' },
  { value: 'quote_responded', label: 'Quote Responses', icon: '✉️' },
  { value: 'harvest_completed', label: 'Harvests', icon: '🌾' },
  { value: 'low_inventory', label: 'Inventory', icon: '⚠️' },
  { value: 'payment_processed', label: 'Payments', icon: '💳' },
  { value: 'sales_order_created', label: 'Sales Orders', icon: '🛒' },
  { value: 'purchase_order_created', label: 'Purchase Orders', icon: '📝' },
  { value: 'stock_entry_created', label: 'Stock', icon: '📦' },
  { value: 'delivery_status_changed', label: 'Deliveries', icon: '🚚' },
  { value: 'quality_inspection_completed', label: 'Quality', icon: '🔍' },
  { value: 'member_added', label: 'Members', icon: '👤' },
  { value: 'worker_added', label: 'Workers', icon: '👷' },
  { value: 'ai_recommendation_created', label: 'AI Recommendations', icon: '🤖' },
  { value: 'ai_alert_triggered', label: 'AI Alerts', icon: '🚨' },
  { value: 'crop_cycle_status_changed', label: 'Crop Cycles', icon: '🌱' },
  { value: 'campaign_status_changed', label: 'Campaigns', icon: '📅' },
  { value: 'task_reassigned', label: 'Reassignments', icon: '🔄' },
  { value: 'piece_work_created', label: 'Piece Work', icon: '💼' },
  { value: 'invoice_created', label: 'Invoices', icon: '🧾' },
  { value: 'journal_entry_posted', label: 'Journal Entries', icon: '📒' },
  { value: 'payment_status_changed', label: 'Payment Updates', icon: '💳' },
  { value: 'lab_results_available', label: 'Lab Results', icon: '🔬' },
  { value: 'product_application_completed', label: 'Applications', icon: '🧪' },
  { value: 'soil_analysis_completed', label: 'Soil Analyses', icon: '🌍' },
  { value: 'harvest_event_recorded', label: 'Harvest Events', icon: '🌾' },
  { value: 'work_unit_completed', label: 'Work Units', icon: '📊' },
  { value: 'general', label: 'General', icon: 'ℹ️' },
];

const statusFilters: { value: NotificationStatusFilter; label: string; countKey?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'important', label: 'Important' },
];

const timeFilters: { value: NotificationTimeFilter; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'older', label: 'Older' },
];

export function NotificationFilters({
  typeFilter,
  statusFilter,
  timeFilter,
  onTypeChange,
  onStatusChange,
  onTimeChange,
  unreadCount = 0,
  importantCount = 0,
  compact = false,
  counts = {},
}: NotificationFiltersProps) {
  return (
    <div className={cn('flex flex-col gap-4', compact ? 'p-2' : 'p-4')}>
      {/* Type Filters */}
      {!compact ? (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Filter by Type
          </h3>
          <ScrollArea className={compact ? '' : 'h-48'}>
            <div className="flex flex-wrap gap-1.5 pb-2">
              {typeFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={typeFilter === filter.value ? 'default' : 'outline'}
                  size={compact ? 'sm' : 'default'}
                  className={cn(
                    'relative',
                    typeFilter === filter.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => onTypeChange(filter.value)}
                >
                  <span className="mr-1">{filter.icon}</span>
                  {filter.label}
                  {counts[filter.value] !== undefined && counts[filter.value] > 0 && (
                    <span
                      className={cn(
                        'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full',
                        typeFilter === filter.value
                          ? 'bg-primary-foreground/20'
                          : 'bg-muted-foreground/20'
                      )}
                    >
                      {counts[filter.value] > 99 ? '99+' : counts[filter.value]}
                    </span>
                  )}
                  {filter.value === 'all' && unreadCount > 0 && (
                    <span
                      className={cn(
                        'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white',
                        typeFilter === 'all' && 'bg-red-400'
                      )}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : (
        // Compact horizontal scroll for type filters (native overflow: Radix ScrollArea + flex
        // without w-max/shrink-0 can clip nowrap chips in narrow popovers)
        <div className="border-b pb-2">
          <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain">
            <div className="flex w-max gap-1.5 pb-1">
              {typeFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={typeFilter === filter.value ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'shrink-0 whitespace-nowrap relative',
                    typeFilter === filter.value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => onTypeChange(filter.value)}
                >
                  <span className="mr-1">{filter.icon}</span>
                  {filter.label}
                  {filter.value === 'all' && unreadCount > 0 && (
                    <span
                      className={cn(
                        'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white',
                        typeFilter === 'all' && 'bg-red-400'
                      )}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status Filters */}
      {!compact && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Filter by Status
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'relative',
                  statusFilter === filter.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-muted'
                )}
                onClick={() => onStatusChange(filter.value)}
              >
                {filter.label}
                {filter.value === 'unread' && unreadCount > 0 && (
                  <span
                    className={cn(
                      'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white',
                      statusFilter === 'unread' && 'bg-red-400'
                    )}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {filter.value === 'important' && importantCount > 0 && (
                  <span
                    className={cn(
                      'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-white',
                      statusFilter === 'important' && 'bg-amber-400'
                    )}
                  >
                    {importantCount > 99 ? '99+' : importantCount}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Time Filters */}
      {!compact && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Filter by Time
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {timeFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={timeFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  timeFilter === filter.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-muted'
                )}
                onClick={() => onTimeChange(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Combined filters for compact view */}
      {compact && (
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as NotificationStatusFilter)}
            className="flex-1 px-3 py-1.5 text-sm rounded-md border border-input bg-background"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread ({unreadCount})</option>
            <option value="important">Important ({importantCount})</option>
          </select>
          <select
            value={timeFilter}
            onChange={(e) => onTimeChange(e.target.value as NotificationTimeFilter)}
            className="flex-1 px-3 py-1.5 text-sm rounded-md border border-input bg-background"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="older">Older</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default NotificationFilters;
