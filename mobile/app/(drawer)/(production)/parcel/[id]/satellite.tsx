import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Polyline, Text as SvgText } from 'react-native-svg';
import MapView, { Polygon, UrlTile, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { format, subDays } from 'date-fns';
import { useTheme } from '@/providers/ThemeProvider';
import { useParcel } from '@/hooks/useFarms';
import { useSatelliteData, useLatestSatelliteData, useSyncStatus, useHeatmap, groupByDate } from '@/hooks/useSatellite';
import {
  INDEX_COLORS,
  DEFAULT_INDICES,
  type VegetationIndex,
} from '@/lib/api/satellite';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CHART_HEIGHT = 220;
const MAP_HEIGHT = 360;
const CHART_PADDING = { top: 20, right: 16, bottom: 30, left: 44 };
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Index Chip ──────────────────────────────────────────────

function IndexChip({
  name,
  active,
  color,
  onToggle,
  themeColors,
}: {
  name: string;
  active: boolean;
  color: string;
  onToggle: () => void;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[
        styles.chip,
        {
          backgroundColor: active ? color + '20' : themeColors.surfaceContainer,
          borderColor: active ? color : 'transparent',
        },
      ]}
    >
      {active && <View style={[styles.chipDot, { backgroundColor: color }]} />}
      <Text style={[styles.chipLabel, { color: active ? color : themeColors.textSecondary }]}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

// ─── SVG Line Chart ─────────────────────────────────────────

function TimeSeriesLineChart({
  data,
  indices,
  themeColors,
}: {
  data: Array<Record<string, any>>;
  indices: VegetationIndex[];
  themeColors: ReturnType<typeof useTheme>['colors'];
}) {
  const width = SCREEN_WIDTH - 32;
  const chartW = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  if (data.length === 0) return null;

  let yMin = Infinity;
  let yMax = -Infinity;
  for (const row of data) {
    for (const idx of indices) {
      const v = row[idx];
      if (typeof v === 'number' && !isNaN(v)) {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
    }
  }
  if (yMin === Infinity) { yMin = 0; yMax = 1; }
  const yPad = (yMax - yMin) * 0.1 || 0.05;
  yMin -= yPad;
  yMax += yPad;

  const xScale = (i: number) => CHART_PADDING.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => CHART_PADDING.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => yMin + (i / (yTicks - 1)) * (yMax - yMin));
  const xLabelStep = Math.max(1, Math.floor(data.length / 5));

  return (
    <Svg width={width} height={CHART_HEIGHT}>
      {yTickValues.map((v, i) => (
        <Line key={`grid-${i}`} x1={CHART_PADDING.left} y1={yScale(v)} x2={width - CHART_PADDING.right} y2={yScale(v)} stroke={themeColors.outlineVariant} strokeWidth={0.5} />
      ))}
      {yTickValues.map((v, i) => (
        <SvgText key={`y-${i}`} x={CHART_PADDING.left - 6} y={yScale(v) + 4} fontSize={10} fill={themeColors.textTertiary} textAnchor="end">{v.toFixed(2)}</SvgText>
      ))}
      {data.map((row, i) =>
        i % xLabelStep === 0 || i === data.length - 1 ? (
          <SvgText key={`x-${i}`} x={xScale(i)} y={CHART_HEIGHT - 4} fontSize={9} fill={themeColors.textTertiary} textAnchor="middle">{format(new Date(row.date), 'MM/yy')}</SvgText>
        ) : null,
      )}
      {indices.map((idx) => {
        const points = data
          .map((row, i) => {
            const v = row[idx];
            return typeof v === 'number' && !isNaN(v) ? `${xScale(i)},${yScale(v)}` : null;
          })
          .filter(Boolean)
          .join(' ');
        if (!points) return null;
        return <Polyline key={idx} points={points} fill="none" stroke={INDEX_COLORS[idx] || '#999'} strokeWidth={2} strokeLinejoin="round" />;
      })}
    </Svg>
  );
}

// ─── Color helpers ───────────────────────────────────────────

function getHeatColor(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  // Red -> Yellow -> Green
  const r = Math.round(t < 0.5 ? 220 : 220 - (t - 0.5) * 2 * 180);
  const g = Math.round(t < 0.5 ? t * 2 * 180 : 180);
  return `rgba(${r},${g},30,0.55)`;
}

function getHeatColorOpaque(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const r = Math.round(t < 0.5 ? 220 : 220 - (t - 0.5) * 2 * 180);
  const g = Math.round(t < 0.5 ? t * 2 * 180 : 180);
  return `rgb(${r},${g},30)`;
}

// ─── Coordinate conversion ───────────────────────────────────

/** Convert a coordinate from Web Mercator (EPSG:3857) to WGS84 if needed */
function toWGS84(coord: number[]): [number, number] {
  const [x, y] = coord;
  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    // Web Mercator -> WGS84
    const lon = (x / 20037508.34) * 180;
    const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
    return [lon, lat];
  }
  return [x, y]; // Already WGS84
}

/** Normalize boundary: convert coords, ensure closed polygon */
function normalizeBoundary(raw: number[][] | null): number[][] | null {
  if (!raw || raw.length < 3) return null;
  const converted = raw.map(toWGS84);
  // Ensure closed
  const first = converted[0];
  const last = converted[converted.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    converted.push([first[0], first[1]]);
  }
  return converted;
}

// ─── Interactive Map Heatmap ─────────────────────────────────

function SatelliteHeatmapMap({
  parcelId,
  boundary: rawBoundary,
  index,
  themeColors,
  selectedDate,
}: {
  parcelId: string;
  boundary: number[][] | null;
  index: VegetationIndex;
  themeColors: ReturnType<typeof useTheme>['colors'];
  selectedDate: string | null;
}) {
  const [tappedValue, setTappedValue] = useState<{ value: number } | null>(null);
  const [mapType, setMapType] = useState<'none' | 'satellite'>('none');

  const boundary = useMemo(() => normalizeBoundary(rawBoundary), [rawBoundary]);

  // Fetch real heatmap pixel data from the API
  const { data: heatmapData, isLoading: heatmapLoading } = useHeatmap(
    parcelId,
    rawBoundary, // pass raw — the API client handles conversion
    index,
    selectedDate || '',
  );

  const region = useMemo<Region | null>(() => {
    // If we have pixel data, fit to that
    if (heatmapData?.pixel_data?.length) {
      const lats = heatmapData.pixel_data.map((p) => p.lat);
      const lons = heatmapData.pixel_data.map((p) => p.lon);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lons);
      const maxLng = Math.max(...lons);
      const latPad = (maxLat - minLat) * 0.15 || 0.002;
      const lngPad = (maxLng - minLng) * 0.15 || 0.002;
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) + latPad,
        longitudeDelta: (maxLng - minLng) + lngPad,
      };
    }
    // Fallback to boundary
    if (!boundary || boundary.length < 3) return null;
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (const coord of boundary) {
      if (coord[1] < minLat) minLat = coord[1];
      if (coord[1] > maxLat) maxLat = coord[1];
      if (coord[0] < minLng) minLng = coord[0];
      if (coord[0] > maxLng) maxLng = coord[0];
    }
    const latPad = (maxLat - minLat) * 0.3 || 0.002;
    const lngPad = (maxLng - minLng) * 0.3 || 0.002;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) + latPad,
      longitudeDelta: (maxLng - minLng) + lngPad,
    };
  }, [boundary, heatmapData]);

  const boundaryCoords = useMemo(() => {
    if (!boundary) return [];
    return boundary.map((c) => ({ latitude: c[1], longitude: c[0] }));
  }, [boundary]);

  // Build pixel rectangles from real satellite data
  const pixelCells = useMemo(() => {
    if (!heatmapData?.pixel_data?.length || !heatmapData.statistics) return [];

    const { min, max } = heatmapData.statistics;
    const pixelScale = heatmapData.metadata?.sample_scale || 10;
    const halfDeg = (pixelScale / 111320) / 2; // meters -> degrees

    return heatmapData.pixel_data.map((px) => ({
      coords: [
        { latitude: px.lat - halfDeg, longitude: px.lon - halfDeg },
        { latitude: px.lat + halfDeg, longitude: px.lon - halfDeg },
        { latitude: px.lat + halfDeg, longitude: px.lon + halfDeg },
        { latitude: px.lat - halfDeg, longitude: px.lon + halfDeg },
      ],
      value: px.value,
      color: getHeatColor(px.value, min, max),
    }));
  }, [heatmapData]);

  const stats = heatmapData?.statistics;

  if (!boundary || boundary.length < 3) {
    return (
      <View style={[styles.emptySmall, { backgroundColor: themeColors.surfaceContainer, borderRadius: 12 }]}>
        <Ionicons name="map-outline" size={36} color={themeColors.iconSubtle} />
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No parcel boundary defined</Text>
      </View>
    );
  }

  if (!selectedDate) {
    return (
      <View style={[styles.emptySmall, { backgroundColor: themeColors.surfaceContainer, borderRadius: 12 }]}>
        <Ionicons name="calendar-outline" size={36} color={themeColors.iconSubtle} />
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Select a date to view heatmap</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Stats bar */}
      {stats && (
        <View style={styles.statsBar}>
          {[
            { label: 'Mean', value: stats.mean.toFixed(3) },
            { label: 'Min', value: stats.min.toFixed(3) },
            { label: 'Max', value: stats.max.toFixed(3) },
            { label: 'Std', value: stats.std.toFixed(3) },
            { label: 'Pixels', value: String(stats.count) },
          ].map((s) => (
            <View key={s.label} style={styles.statsBarItem}>
              <Text style={[styles.statsBarLabel, { color: themeColors.textTertiary }]}>{s.label}</Text>
              <Text style={[styles.statsBarValue, { color: themeColors.textPrimary }]}>{s.value}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.mapContainer}>
        {heatmapLoading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={themeColors.brandPrimary} />
            <Text style={[styles.mapLoadingText, { color: themeColors.textSecondary }]}>Loading satellite data...</Text>
          </View>
        )}

        {region && (
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={region}
            mapType={mapType === 'satellite' ? 'satellite' : 'none'}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {/* OSM tiles when not satellite */}
            {mapType === 'none' && (
              <UrlTile
                urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
                tileSize={256}
              />
            )}

            {/* Real satellite pixel data cells */}
            {pixelCells.map((cell, i) => (
              <Polygon
                key={`px-${i}`}
                coordinates={cell.coords}
                fillColor={cell.color}
                strokeColor={cell.color.replace('0.55)', '0.15)')}
                strokeWidth={0.3}
                tappable
                onPress={() => setTappedValue({ value: cell.value })}
              />
            ))}

            {/* Parcel boundary outline */}
            {boundaryCoords.length > 0 && (
              <Polygon
                coordinates={boundaryCoords}
                fillColor="transparent"
                strokeColor="#1b5e20"
                strokeWidth={2}
              />
            )}
          </MapView>
        )}

        {/* Overlay: index badge + tapped value */}
        <View style={[styles.mapOverlay, { backgroundColor: themeColors.background + 'DD' }]}>
          <View style={[styles.indexBadge, { backgroundColor: INDEX_COLORS[index] + '20' }]}>
            <View style={[styles.chipDot, { backgroundColor: INDEX_COLORS[index] }]} />
            <Text style={[styles.indexBadgeText, { color: INDEX_COLORS[index] }]}>{index}</Text>
          </View>
          {heatmapData?.date && (
            <Text style={[styles.mapDateText, { color: themeColors.textSecondary }]}>
              {heatmapData.date}
            </Text>
          )}
          {tappedValue && (
            <Text style={[styles.tappedValueText, { color: themeColors.textPrimary }]}>
              {tappedValue.value.toFixed(4)}
            </Text>
          )}
        </View>

        {/* Map type toggle */}
        <TouchableOpacity
          style={[styles.mapTypeBtn, { backgroundColor: themeColors.background + 'EE' }]}
          onPress={() => setMapType((t) => (t === 'none' ? 'satellite' : 'none'))}
        >
          <Ionicons name={mapType === 'satellite' ? 'map-outline' : 'earth-outline'} size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Color legend */}
      {stats && (
        <View style={styles.legendRow}>
          <Text style={[styles.legendLabel, { color: themeColors.textTertiary }]}>{stats.min.toFixed(2)}</Text>
          <View style={styles.legendGradient}>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <View key={t} style={[styles.legendCell, { backgroundColor: getHeatColorOpaque(stats.min + t * (stats.max - stats.min), stats.min, stats.max) }]} />
            ))}
          </View>
          <Text style={[styles.legendLabel, { color: themeColors.textTertiary }]}>{stats.max.toFixed(2)}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────

export default function SatelliteTab() {
  const { id: parcelId } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<VegetationIndex[]>(['NIRv', 'EVI', 'NDRE']);
  const [heatmapIndex, setHeatmapIndex] = useState<VegetationIndex>('NIRv');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const startDate = useMemo(() => format(subDays(new Date(), 730), 'yyyy-MM-dd'), []);

  const { data: parcel } = useParcel(parcelId);
  const { data: rawData = [], isLoading, refetch: refetchData } = useSatelliteData(parcelId, { start_date: startDate });
  const { data: latestData = [], refetch: refetchLatest } = useLatestSatelliteData(parcelId);
  const { data: syncStatus } = useSyncStatus(parcelId);

  const chartData = useMemo(() => groupByDate(rawData), [rawData]);

  // Available dates for date picker
  const availableDates = useMemo(() => {
    const dates = [...new Set(rawData.filter((p) => p.index_name === heatmapIndex).map((p) => p.date))].sort();
    return dates;
  }, [rawData, heatmapIndex]);

  const latestByIndex = useMemo(() => {
    const map = new Map<string, { value: number; date: string; trend: string | null }>();
    for (const p of latestData) {
      if (!map.has(p.index_name)) {
        map.set(p.index_name, { value: p.mean_value, date: p.date, trend: p.trend_direction });
      }
    }
    return map;
  }, [latestData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchData(), refetchLatest()]);
    setRefreshing(false);
  }, [refetchData, refetchLatest]);

  const toggleIndex = (idx: VegetationIndex) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? (prev.length > 1 ? prev.filter((i) => i !== idx) : prev) : [...prev, idx],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {/* Sync status */}
      {syncStatus?.status === 'no_data' && (
        <View style={[styles.banner, { backgroundColor: themeColors.warningContainer }]}>
          <Ionicons name="cloud-download-outline" size={18} color={themeColors.warning} />
          <Text style={[styles.bannerText, { color: themeColors.warning }]}>
            No cached data. Sync from the web dashboard.
          </Text>
        </View>
      )}

      {syncStatus && syncStatus.status !== 'no_data' && syncStatus.total_records > 0 && (
        <View style={[styles.banner, { backgroundColor: themeColors.successContainer }]}>
          <Ionicons name="checkmark-circle" size={18} color={themeColors.success} />
          <Text style={[styles.bannerText, { color: themeColors.success }]}>
            {syncStatus.total_records} points · {syncStatus.indices.length} indices
          </Text>
        </View>
      )}

      {/* Latest values */}
      {latestByIndex.size > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.latestRow}>
          {DEFAULT_INDICES.map((idx) => {
            const d = latestByIndex.get(idx);
            if (!d) return null;
            const trendIcon: IconName =
              d.trend === 'up' ? 'trending-up' : d.trend === 'down' ? 'trending-down' : 'remove-outline';
            const trendColor =
              d.trend === 'up' ? themeColors.success : d.trend === 'down' ? themeColors.error : themeColors.textTertiary;
            return (
              <View key={idx} style={[styles.latestCard, { backgroundColor: themeColors.surfaceLowest }]}>
                <View style={[styles.latestDot, { backgroundColor: INDEX_COLORS[idx] }]} />
                <Text style={[styles.latestIndex, { color: themeColors.textSecondary }]}>{idx}</Text>
                <Text style={[styles.latestValue, { color: themeColors.textPrimary }]}>{d.value.toFixed(3)}</Text>
                <View style={styles.latestTrendRow}>
                  <Ionicons name={trendIcon} size={12} color={trendColor} />
                  <Text style={[styles.latestDate, { color: themeColors.textTertiary }]}>
                    {format(new Date(d.date), 'MMM d')}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ─── Time Series ─────────────────────── */}
      <View style={[styles.section, { backgroundColor: themeColors.surfaceLowest }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="analytics" size={20} color={themeColors.brandPrimary} />
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Time Series</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {DEFAULT_INDICES.map((idx) => (
            <IndexChip key={idx} name={idx} active={selectedIndices.includes(idx)} color={INDEX_COLORS[idx]} onToggle={() => toggleIndex(idx)} themeColors={themeColors} />
          ))}
        </ScrollView>

        {isLoading && chartData.length === 0 ? (
          <View style={styles.loadingBox}><ActivityIndicator size="large" color={themeColors.brandPrimary} /></View>
        ) : chartData.length === 0 ? (
          <View style={styles.emptySmall}>
            <Ionicons name="globe-outline" size={36} color={themeColors.iconSubtle} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No satellite data</Text>
          </View>
        ) : (
          <TimeSeriesLineChart data={chartData} indices={selectedIndices} themeColors={themeColors} />
        )}

        {chartData.length > 0 && (
          <View style={styles.chartLegend}>
            {selectedIndices.map((idx) => (
              <View key={idx} style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: INDEX_COLORS[idx] }]} />
                <Text style={[styles.legendItemText, { color: themeColors.textSecondary }]}>{idx}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ─── Interactive Heatmap Map ──────────── */}
      <View style={[styles.section, { backgroundColor: themeColors.surfaceLowest }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="map" size={20} color={themeColors.brandPrimary} />
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Heatmap</Text>
        </View>

        {/* Index selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {DEFAULT_INDICES.map((idx) => (
            <IndexChip key={idx} name={idx} active={heatmapIndex === idx} color={INDEX_COLORS[idx]} onToggle={() => { setHeatmapIndex(idx); setSelectedDate(null); }} themeColors={themeColors} />
          ))}
        </ScrollView>

        {/* Date picker */}
        {availableDates.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            <TouchableOpacity
              style={[styles.dateChip, { backgroundColor: !selectedDate ? themeColors.brandPrimary : themeColors.surfaceContainer }]}
              onPress={() => setSelectedDate(null)}
            >
              <Text style={[styles.dateChipText, { color: !selectedDate ? '#fff' : themeColors.textSecondary }]}>Latest</Text>
            </TouchableOpacity>
            {availableDates.slice(-10).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.dateChip, { backgroundColor: selectedDate === d ? themeColors.brandPrimary : themeColors.surfaceContainer }]}
                onPress={() => setSelectedDate(d)}
              >
                <Text style={[styles.dateChipText, { color: selectedDate === d ? '#fff' : themeColors.textSecondary }]}>
                  {format(new Date(d), 'MMM d')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <SatelliteHeatmapMap
          parcelId={parcelId}
          boundary={parcel?.boundary ?? null}
          index={heatmapIndex}
          themeColors={themeColors}
          selectedDate={selectedDate}
        />
      </View>

      {/* ─── Stats ───────────────────────────── */}
      {chartData.length > 0 && (
        <View style={[styles.section, { backgroundColor: themeColors.surfaceLowest }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={20} color={themeColors.brandPrimary} />
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Statistics</Text>
          </View>
          {selectedIndices.map((idx) => {
            const values = rawData.filter((p) => p.index_name === idx && p.mean_value != null).map((p) => p.mean_value);
            if (values.length === 0) return null;
            const mean = values.reduce((s, v) => s + v, 0) / values.length;
            return (
              <View key={idx} style={[styles.statsRow, { borderBottomColor: themeColors.outlineVariant }]}>
                <View style={styles.statsLabel}>
                  <View style={[styles.statsDot, { backgroundColor: INDEX_COLORS[idx] }]} />
                  <Text style={[styles.statsIndex, { color: themeColors.textPrimary }]}>{idx}</Text>
                </View>
                <View style={styles.statsValues}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statCaption, { color: themeColors.textTertiary }]}>Min</Text>
                    <Text style={[styles.statNum, { color: themeColors.textPrimary }]}>{Math.min(...values).toFixed(3)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statCaption, { color: themeColors.textTertiary }]}>Mean</Text>
                    <Text style={[styles.statNum, { color: themeColors.textPrimary }]}>{mean.toFixed(3)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statCaption, { color: themeColors.textTertiary }]}>Max</Text>
                    <Text style={[styles.statNum, { color: themeColors.textPrimary }]}>{Math.max(...values).toFixed(3)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statCaption, { color: themeColors.textTertiary }]}>Pts</Text>
                    <Text style={[styles.statNum, { color: themeColors.textPrimary }]}>{values.length}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  bannerText: { fontSize: 13, fontWeight: '500', flex: 1 },

  latestRow: { gap: 10, paddingVertical: 4 },
  latestCard: { borderRadius: 12, padding: 12, minWidth: 90, alignItems: 'center' },
  latestDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  latestIndex: { fontSize: 11, fontWeight: '600' },
  latestValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  latestTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  latestDate: { fontSize: 10 },

  section: { borderRadius: 16, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '600' },

  chipRow: { gap: 6, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipLabel: { fontSize: 12, fontWeight: '600' },

  dateRow: { gap: 6, marginBottom: 12 },
  dateChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  dateChipText: { fontSize: 12, fontWeight: '600' },

  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptySmall: { paddingVertical: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14 },

  chartLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendItemText: { fontSize: 12 },

  // Heatmap stats bar
  statsBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, marginBottom: 8 },
  statsBarItem: { alignItems: 'center' },
  statsBarLabel: { fontSize: 10, fontWeight: '500' },
  statsBarValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  // Map
  mapContainer: { borderRadius: 14, overflow: 'hidden', height: MAP_HEIGHT, position: 'relative' },
  map: { flex: 1 },
  mapLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 14 },
  mapLoadingText: { fontSize: 13, marginTop: 8 },
  mapDateText: { fontSize: 11 },
  mapOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  indexBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  indexBadgeText: { fontSize: 12, fontWeight: '700' },
  tappedValueText: { fontSize: 14, fontWeight: '700' },
  mapTypeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Legend
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'center' },
  legendLabel: { fontSize: 11, fontWeight: '600' },
  legendGradient: { flexDirection: 'row', gap: 2 },
  legendCell: { width: 24, height: 14, borderRadius: 3 },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  statsLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 60 },
  statsDot: { width: 10, height: 10, borderRadius: 5 },
  statsIndex: { fontSize: 14, fontWeight: '600' },
  statsValues: { flexDirection: 'row', gap: 16 },
  statItem: { alignItems: 'center' },
  statCaption: { fontSize: 10, fontWeight: '500' },
  statNum: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
