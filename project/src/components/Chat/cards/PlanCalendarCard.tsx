import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface PlanIntervention {
  month: number;
  intervention_type: string;
  description: string;
  status: string;
}

interface PlanCalendarData {
  upcoming: PlanIntervention[];
  overdue: PlanIntervention[];
  summary?: { total: number; executed: number; planned: number };
}

const statusColors: Record<string, string> = {
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  executed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function PlanCalendarCard({ data }: { data: PlanCalendarData }) {
  const items = [
    ...data.overdue.map((i) => ({ ...i, status: 'overdue' })),
    ...data.upcoming.map((i) => ({ ...i, status: i.status || 'planned' })),
  ].slice(0, 5);

  return (
    <Card className="my-2 border-l-4 border-l-indigo-500">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="w-4 h-4 text-indigo-500" />
          Annual Plan
          {data.summary && (
            <span className="text-xs text-muted-foreground ml-auto">
              {data.summary.executed}/{data.summary.total} executed
            </span>
          )}
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span>{item.description}</span>
            <Badge className={statusColors[item.status] || 'bg-muted'} variant="outline">
              {item.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
