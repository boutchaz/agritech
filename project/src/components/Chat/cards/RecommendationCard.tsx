import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

interface RecommendationData {
  constat: string;
  diagnostic?: string;
  action: string;
  priority: string;
  valid_from?: string;
  valid_until?: string;
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export function RecommendationCard({ data }: { data: RecommendationData }) {
  return (
    <Card className="my-2 border-l-4 border-l-amber-500">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Recommendation
          </div>
          <Badge className={priorityColors[data.priority] || 'bg-muted'}>
            {data.priority}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{data.constat}</p>
        {data.diagnostic && <p className="text-xs text-muted-foreground italic">{data.diagnostic}</p>}
        <p className="text-sm font-medium">{data.action}</p>
        {(data.valid_from || data.valid_until) && (
          <p className="text-xs text-muted-foreground">
            {data.valid_from && `From: ${data.valid_from}`}
            {data.valid_from && data.valid_until && ' — '}
            {data.valid_until && `Until: ${data.valid_until}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
