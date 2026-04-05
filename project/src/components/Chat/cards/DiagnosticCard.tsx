
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface DiagnosticData {
  scenario_code: string;
  scenario: string;
  confidence: number;
  zone_classification?: string;
  indicators?: Record<string, string | number | boolean | null>;
}

const zoneColors: Record<string, string> = {
  optimal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  stressed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function DiagnosticCard({ data }: { data: DiagnosticData }) {
  return (
    <Card className="my-2 border-l-4 border-l-blue-500">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="w-4 h-4 text-blue-500" />
            Diagnostic
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-lg px-2">
              {data.scenario_code}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {Math.round(data.confidence * 100)}%
            </span>
          </div>
        </div>
        <p className="text-sm">{data.scenario}</p>
        {data.zone_classification && (
          <Badge className={zoneColors[data.zone_classification] || 'bg-muted'}>
            {data.zone_classification}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
