import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Home, Map, Users, CheckSquare } from 'lucide-react';

interface FarmSummaryData {
  farms_count: number;
  parcels_count: number;
  workers_count: number;
  pending_tasks: number;
  recent_harvests?: number;
  inventory_items?: number;
}

export function FarmSummaryCard({ data }: { data: FarmSummaryData }) {
  const stats = [
    { label: 'Farms', value: data.farms_count, icon: Home, color: 'text-green-500' },
    { label: 'Parcels', value: data.parcels_count, icon: Map, color: 'text-blue-500' },
    { label: 'Workers', value: data.workers_count, icon: Users, color: 'text-purple-500' },
    { label: 'Tasks', value: data.pending_tasks, icon: CheckSquare, color: 'text-amber-500' },
  ];

  return (
    <Card className="my-2">
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <div>
                <p className="text-lg font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
