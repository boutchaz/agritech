
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface StockAlertItem {
  item_name: string;
  current_quantity: number;
  min_quantity: number;
  unit: string;
}

interface StockAlertData {
  items: StockAlertItem[];
}

export function StockAlertCard({ data }: { data: StockAlertData }) {
  return (
    <Card className="my-2 border-l-4 border-l-orange-500">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Low Stock Alerts
          <Badge variant="destructive" className="ml-auto">{data.items.length}</Badge>
        </div>
        {data.items.slice(0, 5).map((item) => (
          <div key={item.item_name} className="flex items-center justify-between text-sm">
            <span>{item.item_name}</span>
            <span className="text-xs text-destructive font-medium">
              {item.current_quantity}/{item.min_quantity} {item.unit}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
