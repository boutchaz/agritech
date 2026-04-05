import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Leaf, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Level3Biophysical as Level3BiophysicalType } from '@/types/calibration-review';

interface Level3BiophysicalProps {
  data: Level3BiophysicalType;
}

export function Level3Biophysical({ data }: Level3BiophysicalProps) {
  const { t } = useTranslation('ai');

  const getTrendIcon = (points: { value: number }[]) => {
    if (!points || points.length < 2) return <Minus className="h-4 w-4 text-gray-400" />;
    const latest = points[points.length - 1].value;
    const previous = points[points.length - 2].value;
    const diff = latest - previous;
    
    if (diff > 0.02) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (diff < -0.02) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getLatestValue = (points: { value: number }[] | null) => {
    if (!points || points.length === 0) return t('calibrationReview.level3.na');
    return points[points.length - 1].value.toFixed(3);
  };

  const indicesList = [
    { name: 'NIRv', data: data.indices.NIRv },
    { name: 'NIRvP', data: data.indices.NIRvP },
    { name: 'NDVI', data: data.indices.NDVI },
    { name: 'NDMI', data: data.indices.NDMI },
    { name: 'NDRE', data: data.indices.NDRE },
    { name: 'EVI', data: data.indices.EVI },
    { name: 'GCI', data: data.indices.GCI },
  ];

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-500" />
          {t('calibrationReview.level3.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Indices Table */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level3.indices')}</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('calibrationReview.level3.index')}</TableHead>
                  <TableHead>{t('calibrationReview.level3.latestValue')}</TableHead>
                  <TableHead>{t('calibrationReview.level3.trend')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicesList.map((vegIdx) => {
                  return (
                    <TableRow key={vegIdx.name}>
                      <TableCell className="font-medium">{vegIdx.name}</TableCell>
                      <TableCell>
                        {vegIdx.data ? (
                          getLatestValue(vegIdx.data)
                        ) : (
                          <span className="text-muted-foreground italic text-xs">{t('calibrationReview.level3.notAvailable')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vegIdx.data ? getTrendIcon(vegIdx.data) : <Minus className="h-4 w-4 text-gray-400" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* GDD Info */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level3.gdd')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
            <div>
              <div className="text-sm text-muted-foreground mb-1">{t('calibrationReview.level3.baseTemperatureUsed')}</div>
              <div className="text-lg font-semibold">{data.gdd.base_temperature_used}°C</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">{t('calibrationReview.level3.baseTemperatureProtocol')}</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{data.gdd.base_temperature_protocol}°C</span>
                {data.gdd.base_temperature_used !== data.gdd.base_temperature_protocol && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {t('calibrationReview.level3.conflict')}
                  </Badge>
                )}
              </div>
            </div>
            <div className="sm:col-span-2 pt-2 border-t">
              <div className="text-sm text-muted-foreground mb-1">{t('calibrationReview.level3.chillHours')}</div>
              <div className="text-lg font-semibold">{data.gdd.chill_hours}h</div>
            </div>
          </div>
        </div>

        {/* Percentiles */}
        {Object.keys(data.percentiles).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('calibrationReview.level3.percentiles')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(data.percentiles).map(([vegIndex, stats]) => (
                <div key={vegIndex} className="p-3 border rounded-lg text-sm">
                  <div className="font-medium mb-2">{vegIndex}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div className="bg-muted/50 p-1 rounded">
                      <div className="text-muted-foreground">P10</div>
                      <div className="font-medium">{stats.p10.toFixed(3)}</div>
                    </div>
                    <div className="bg-muted/50 p-1 rounded">
                      <div className="text-muted-foreground">{t('calibrationReview.level3.median')}</div>
                      <div className="font-medium">{stats.p50.toFixed(3)}</div>
                    </div>
                    <div className="bg-muted/50 p-1 rounded">
                      <div className="text-muted-foreground">P90</div>
                      <div className="font-medium">{stats.p90.toFixed(3)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
