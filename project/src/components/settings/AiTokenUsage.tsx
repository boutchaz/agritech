import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Download, ChevronDown, ChevronUp } from 'lucide-react';
import type { UsageLogResponse } from '@/hooks/useAiQuota';

interface AiTokenUsageProps {
  usageLog: UsageLogResponse;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Stable color palette for models
const MODEL_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
];

export function AiTokenUsage({ usageLog }: AiTokenUsageProps) {
  const { t } = useTranslation();
  const [showAllEntries, setShowAllEntries] = useState(false);

  // Extract all unique models from daily aggregates
  const allModels = useMemo(() => {
    const models = new Set<string>();
    for (const day of usageLog.daily_aggregates) {
      for (const model of Object.keys(day.by_model)) {
        models.add(model);
      }
    }
    return Array.from(models);
  }, [usageLog.daily_aggregates]);

  // Chart data: flatten by_model into top-level keys
  const chartData = useMemo(() => {
    return usageLog.daily_aggregates.map((day) => ({
      date: formatDate(day.date),
      ...day.by_model,
    }));
  }, [usageLog.daily_aggregates]);

  const modelColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    allModels.forEach((model, i) => {
      map[model] = MODEL_COLORS[i % MODEL_COLORS.length];
    });
    return map;
  }, [allModels]);

  const visibleEntries = showAllEntries
    ? usageLog.recent_entries
    : usageLog.recent_entries.slice(0, 10);

  const periodLabel = `${formatDate(usageLog.period_start)} – ${formatDate(usageLog.period_end)}`;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatTokens(usageLog.total_tokens)}</div>
            <p className="text-xs text-muted-foreground">
              {t('ai.usage.totalTokens', 'Total Tokens')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{usageLog.total_requests}</div>
            <p className="text-xs text-muted-foreground">
              {t('ai.usage.totalRequests', 'Total Requests')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t('ai.usage.tokenChart', 'Token Usage')}
            </CardTitle>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis tickFormatter={formatTokens} className="text-xs" />
                <Tooltip
                  formatter={(value, name) => [
                    formatTokens(Number(value)),
                    String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                {allModels.map((model, i) => (
                  <Area
                    key={model}
                    type="monotone"
                    dataKey={model}
                    stackId="1"
                    stroke={modelColorMap[model]}
                    fill={modelColorMap[model]}
                    fillOpacity={0.6 - i * 0.1}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              {t('ai.usage.noData', 'No usage data for this period')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('ai.usage.recentActivity', 'Recent Activity')}</CardTitle>
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="w-4 h-4" />
              {t('ai.usage.export', 'Export CSV')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">
                    {t('ai.usage.date', 'Date')}
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    {t('ai.usage.feature', 'Type')}
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground">
                    {t('ai.usage.model', 'Model')}
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    {t('ai.usage.tokens', 'Tokens')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </td>
                    <td className="py-2">
                      <Badge variant="secondary" className="capitalize">
                        {entry.feature}
                      </Badge>
                    </td>
                    <td className="py-2 font-mono text-xs">
                      {entry.model || '—'}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {entry.tokens_used != null
                        ? formatTokens(entry.tokens_used)
                        : '—'}
                    </td>
                  </tr>
                ))}
                {visibleEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      {t('ai.usage.noEntries', 'No AI usage recorded yet')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {usageLog.recent_entries.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setShowAllEntries(!showAllEntries)}
            >
              {showAllEntries ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  {t('ai.usage.showLess', 'Show Less')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  {t('ai.usage.showAll', 'Show All ({{count}})', {
                    count: usageLog.recent_entries.length,
                  })}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
