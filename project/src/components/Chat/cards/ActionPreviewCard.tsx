import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  Wheat,
  Droplets,
  Package,
  AlertTriangle,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';

interface ActionPreviewData {
  action_type: string;
  [key: string]: unknown;
}

const ACTION_CONFIG: Record<
  string,
  {
    icon: typeof Wheat;
    label: string;
    fields: Array<{ key: string; label: string }>;
  }
> = {
  record_harvest: {
    icon: Wheat,
    label: 'Record Harvest',
    fields: [
      { key: 'parcel_name', label: 'Parcel' },
      { key: 'crop_type', label: 'Crop' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'unit', label: 'Unit' },
      { key: 'harvest_date', label: 'Date' },
      { key: 'quality_grade', label: 'Quality' },
    ],
  },
  create_task: {
    icon: ClipboardCheck,
    label: 'Create Task',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'parcel_name', label: 'Parcel' },
      { key: 'farm_name', label: 'Farm' },
      { key: 'priority', label: 'Priority' },
      { key: 'task_type', label: 'Type' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'worker_name', label: 'Assigned To' },
    ],
  },
  record_product_application: {
    icon: Droplets,
    label: 'Record Application',
    fields: [
      { key: 'product_name', label: 'Product' },
      { key: 'parcel_name', label: 'Parcel' },
      { key: 'quantity_used', label: 'Quantity' },
      { key: 'area_treated', label: 'Area (ha)' },
      { key: 'application_date', label: 'Date' },
    ],
  },
  log_parcel_event: {
    icon: AlertTriangle,
    label: 'Log Parcel Event',
    fields: [
      { key: 'parcel_name', label: 'Parcel' },
      { key: 'event_type', label: 'Event Type' },
      { key: 'description', label: 'Description' },
      { key: 'date_evenement', label: 'Date' },
    ],
  },
  record_stock_entry: {
    icon: Package,
    label: 'Stock Entry',
    fields: [
      { key: 'entry_type', label: 'Type' },
      { key: 'to_warehouse_name', label: 'To Warehouse' },
      { key: 'from_warehouse_name', label: 'From Warehouse' },
      { key: 'entry_date', label: 'Date' },
    ],
  },
  assign_task_worker: {
    icon: UserPlus,
    label: 'Assign Worker',
    fields: [
      { key: 'task_title', label: 'Task' },
      { key: 'worker_name', label: 'Worker' },
      { key: 'role', label: 'Role' },
    ],
  },
  complete_task: {
    icon: CheckCircle2,
    label: 'Complete Task',
    fields: [
      { key: 'task_title', label: 'Task' },
      { key: 'current_status', label: 'Current Status' },
      { key: 'new_status', label: 'New Status' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  mark_intervention_done: {
    icon: CheckCircle2,
    label: 'Mark Intervention Done',
    fields: [
      { key: 'intervention_title', label: 'Intervention' },
      { key: 'plan_name', label: 'Plan' },
    ],
  },
};

function StockItemsList({ items }: { items: Array<{ item_name: string; quantity: number; unit: string }> }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground font-medium">Items:</span>
      {items.map((item, idx) => (
        <div key={idx} className="text-sm pl-2">
          • {item.item_name}: {item.quantity} {item.unit}
        </div>
      ))}
    </div>
  );
}

export function ActionPreviewCard({ data }: { data: ActionPreviewData }) {
  const { t } = useTranslation();
  const actionType = data.action_type as string;
  const config = ACTION_CONFIG[actionType];

  if (!config) {
    return null;
  }

  const Icon = config.icon;
  const recalibrageWarning = actionType === 'log_parcel_event' && data.recalibrage_warning === true;

  return (
    <Card className="my-2 border-l-4 border-l-amber-500">
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Icon className="w-4 h-4 text-amber-600" />
            {config.label}
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700">
            PREVIEW
          </Badge>
        </div>

        {/* Fields */}
        <div className="grid gap-1">
          {config.fields.map(({ key, label }) => {
            const value = data[key];
            if (value === undefined || value === null) return null;
            return (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            );
          })}
        </div>

        {/* Stock items list (special rendering for record_stock_entry) */}
        {actionType === 'record_stock_entry' && data.items && (
          <StockItemsList items={data.items as Array<{ item_name: string; quantity: number; unit: string }>} />
        )}

        {/* Recalibration warning */}
        {recalibrageWarning && (
          <Badge variant="destructive" className="mt-1">
            ⚠️ {t('chat.actions.triggersRecalibration', 'Triggers recalibration')}
          </Badge>
        )}

        {/* Footer instruction */}
        <div className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
          {t('chat.actions.confirmInstruction', "Say 'confirme' to save or correct any detail")}
        </div>
      </CardContent>
    </Card>
  );
}
