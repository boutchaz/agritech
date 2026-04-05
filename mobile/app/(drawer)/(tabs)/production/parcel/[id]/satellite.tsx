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
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polygon, UrlTile, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { format, subDays } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useParcel } from '@/hooks/useFarms';
import { useSatelliteData, useLatestSatelliteData, useSyncStatus, useHeatmap, groupByDate } from '@/hooks/useSatellite';
import {
  INDEX_COLORS,
  DEFAULT_INDICES,
  type VegetationIndex,
} from '@/lib/api/satellite';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const MAP_HEIGHT = 360;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Fullscreen Modal Wrapper ────────────────────────────────

function FullscreenModal({
  visible,
  onClose,
  title,
  themeColors,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  themeColors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={[fsStyles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={[fsStyles.header, { backgroundColor: themeColors.surfaceLowest }]}>
          <Text style={[fsStyles.headerTitle, { color: themeColors.textPrimary }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={fsStyles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={fsStyles.body}>{children}</View>
      </View>
    </Modal>
  );
}

const fsStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  body: { flex: 1 },
});

// ─── Index Chip ──────────────────────────────────────────────

function IndexChip({ name, active, color, onToggle, themeColors }: {
  name: string; active: boolean; color: string; onToggle: () => void; themeColors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity onPress={onToggle} style={[styles.chip, { backgroundColor: active ? color + '20' : themeColors.surfaceContainer, borderColor: active ? color : 'transparent' }]}>
      {active && <View style={[styles.chipDot, { backgroundColor: color }]} />}
      <Text style={[styles.chipLabel, { color: active ? color : themeColors.textSecondary }]}>{name}</Text>
    </TouchableOpacity>
  );
}

// ─── Interactive Bar Chart ───────────────────────────────────

function TimeSeriesChart({
  data,
  indices,
  themeColors,
  fullscreen = false,
}: {
  data: Array<Record<string, any>>;
  indices: VegetationIndex[];
  themeColors: ReturnType<typeof useTheme>['colors'];
  fullscreen?: boolean;
}) {
  const [tappedBar, setTappedBar] = useState<{ idx: string; date: string; value: number } | null>(null);
  const chartW = fullscreen ? SCREEN_WIDTH - 32 : SCREEN_WIDTH - 64;
  const barHeight = fullscreen ? 100 : 60;

  if (data.length === 0) return null;

  return (
    <View>
      {/* Tapped value tooltip */}
      {tappedBar && (
        <View style={[styles.tooltip, { backgroundColor: themeColors.surfaceHighest }]}>
          <View style={[styles.chipDot, { backgroundColor: INDEX_COLORS[tappedBar.idx] }]} />
          <Text style={[styles.tooltipText, { color: themeColors.textPrimary }]}>
            {tappedBar.idx}: {tappedBar.value.toFixed(4)}
          </Text>
          <Text style={[styles.tooltipDate, { color: themeColors.textTertiary }]}>
            {format(new Date(tappedBar.date), 'MMM d, yyyy')}
          </Text>
          <TouchableOpacity onPress={() => setTappedBar(null)}>
            <Ionicons name="close-circle" size={16} color={themeColors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {indices.map((vegIdx) => {
        const values = data
          .map((row) => ({ date: row.date as string, value: row[vegIdx] as number | undefined }))
          .filter((d): d is { date: string; value: number } => typeof d.value === 'number' && !isNaN(d.value));

        if (values.length === 0) return null;

        const vMin = Math.min(...values.map((v) => v.value));
        const vMax = Math.max(...values.map((v) => v.value));
        const range = vMax - vMin || 0.01;
        const barW = Math.max(2, chartW / values.length - 1);

        return (
          <View key={String(vegIdx)} style={{ marginBottom: fullscreen ? 24 : 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: INDEX_COLORS[vegIdx] }}>{vegIdx}</Text>
              <Text style={{ fontSize: 11, color: themeColors.textTertiary }}>{values[values.length - 1].value.toFixed(3)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 9, color: themeColors.textTertiary }}>{vMax.toFixed(2)}</Text>
              <Text style={{ fontSize: 9, color: themeColors.textTertiary }}>{vMin.toFixed(2)}</Text>
            </View>
            {/* Interactive bar chart */}
            <View style={{ height: barHeight, flexDirection: 'row', alignItems: 'flex-end', gap: 1, backgroundColor: themeColors.surfaceContainer, borderRadius: 8, padding: 4 }}>
              {values.map((v, barIdx) => {
                const h = Math.max(2, ((v.value - vMin) / range) * (barHeight - 12));
                const isSelected = tappedBar?.idx === vegIdx && tappedBar?.date === v.date;
                return (
                  <TouchableOpacity
                    key={"bar-" + barIdx}
                    activeOpacity={0.7}
                    onPress={() => setTappedBar({ idx, date: v.date, value: v.value })}
                    style={{
                      width: barW,
                      height: h,
                      backgroundColor: isSelected ? INDEX_COLORS[vegIdx] : INDEX_COLORS[vegIdx] + '80',
                      borderRadius: 1,
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: '#fff',
                    }}
                  />
                );
              })}
            </View>
            {/* Date labels */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
              <Text style={{ fontSize: 9, color: themeColors.textTertiary }}>{format(new Date(values[0].date), 'MM/yy')}</Text>
              {values.length > 2 && (
                <Text style={{ fontSize: 9, color: themeColors.textTertiary }}>
                  {format(new Date(values[Math.floor(values.length / 2)].date), 'MM/yy')}
                </Text>
              )}
              <Text style={{ fontSize: 9, color: themeColors.textTertiary }}>{format(new Date(values[values.length - 1].date), 'MM/yy')}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Color helpers ───────────────────────────────────────────

function getHeatColor(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
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

function toWGS84(coord: number[]): [number, number] {
  const [x, y] = coord;
  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    const lon = (x / 20037508.34) * 180;
    const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
    return [lon, lat];
  }
  return [x, y];
}

function normalizeBoundary(raw: number[][] | null): number[][] | null {
  if (!raw || raw.length < 3) return null;
  const converted = raw.map(toWGS84);
  const first = converted[0];
  const last = converted[converted.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    converted.push([first[0], first[1]]);
  }
  return converted;
}

// ─── Map Content (shared between inline and fullscreen) ──────

function MapContent({
  parcelId,
  rawBoundary,
  index,
  selectedDate,
  themeColors,
  mapHeight,
}: {
  parcelId: string;
  rawBoundary: number[][] | null;
  index: VegetationIndex;
  selectedDate: string | null;
  themeColors: ReturnType<typeof useTheme>['colors'];
  mapHeight: number;
}) {
  const [tappedValue, setTappedValue] = useState<{ value: number } | null>(null);
  const [mapType, setMapType] = useState<'none' | 'standard' | 'satellite'>(Platform.OS === 'android' ? 'standard' : 'none');

  const boundary = useMemo(() => normalizeBoundary(rawBoundary), [rawBoundary]);

  const { data: heatmapData, isLoading: heatmapLoading } = useHeatmap(
    parcelId, rawBoundary, index, selectedDate || '',
  );

  const region = useMemo<Region | null>(() => {
    if (heatmapData?.pixel_data?.length) {
      const lats = heatmapData.pixel_data.map((p) => p.lat);
      const lons = heatmapData.pixel_data.map((p) => p.lon);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lons), maxLng = Math.max(...lons);
      return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2, latitudeDelta: (maxLat - minLat) * 1.15 || 0.004, longitudeDelta: (maxLng - minLng) * 1.15 || 0.004 };
    }
    if (!boundary || boundary.length < 3) return null;
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (const c of boundary) { if (c[1] < minLat) minLat = c[1]; if (c[1] > maxLat) maxLat = c[1]; if (c[0] < minLng) minLng = c[0]; if (c[0] > maxLng) maxLng = c[0]; }
    return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2, latitudeDelta: (maxLat - minLat) * 1.3 || 0.004, longitudeDelta: (maxLng - minLng) * 1.3 || 0.004 };
  }, [boundary, heatmapData]);

  const boundaryCoords = useMemo(() => boundary?.map((c) => ({ latitude: c[1], longitude: c[0] })) ?? [], [boundary]);

  const pixelCells = useMemo(() => {
    if (!heatmapData?.pixel_data?.length || !heatmapData.statistics) return [];
    const { min, max } = heatmapData.statistics;
    const halfDeg = ((heatmapData.metadata?.sample_scale || 10) / 111320) / 2;
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

      <View style={[styles.mapContainer, { height: mapHeight }]}>
        {heatmapLoading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={themeColors.brandPrimary} />
            <Text style={[styles.mapLoadingText, { color: '#fff' }]}>Loading satellite data...</Text>
          </View>
        )}

        {region && (
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={region}
            mapType={mapType === 'satellite' ? 'satellite' : mapType === 'none' ? 'none' : 'standard'}
            rotateEnabled={false}
            pitchEnabled={false}
            zoomEnabled
            scrollEnabled
          >
            {mapType === 'none' && (
              <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} tileSize={256} />
            )}
            {pixelCells.map((cell, pxIdx) => (
              <Polygon
                key={`px-${pxIdx}`}
                coordinates={cell.coords}
                fillColor={cell.color}
                strokeColor={cell.color.replace('0.55)', '0.15)')}
                strokeWidth={0.3}
                tappable
                onPress={() => setTappedValue({ value: cell.value })}
              />
            ))}
            {boundaryCoords.length > 0 && (
              <Polygon coordinates={boundaryCoords} fillColor="transparent" strokeColor="#1b5e20" strokeWidth={2} />
            )}
          </MapView>
        )}

        {/* Info overlay */}
        <View style={[styles.mapOverlay, { backgroundColor: themeColors.background + 'DD' }]}>
          <View style={[styles.indexBadge, { backgroundColor: INDEX_COLORS[index] + '20' }]}>
            <View style={[styles.chipDot, { backgroundColor: INDEX_COLORS[index] }]} />
            <Text style={[styles.indexBadgeText, { color: INDEX_COLORS[index] }]}>{index}</Text>
          </View>
          {heatmapData?.date && <Text style={[styles.mapDateText, { color: themeColors.textSecondary }]}>{heatmapData.date}</Text>}
          {tappedValue && <Text style={[styles.tappedValueText, { color: themeColors.textPrimary }]}>{tappedValue.value.toFixed(4)}</Text>}
        </View>

        {/* Map type toggle */}
        <TouchableOpacity style={[styles.mapTypeBtn, { backgroundColor: themeColors.background + 'EE' }]} onPress={() => setMapType((t) => t === 'satellite' ? (Platform.OS === 'android' ? 'standard' : 'none') : 'satellite')}>
          <Ionicons name={mapType === 'satellite' ? 'map-outline' : 'earth-outline'} size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
      </View>

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

// ─── Month Calendar Date Picker ──────────────────────────────

function MonthDatePicker({
  availableDates,
  selectedDate,
  onSelectDate,
  themeColors,
}: {
  availableDates: string[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) {
  const dateSet = useMemo(() => new Set(availableDates), [availableDates]);

  // Determine initial month from available dates or current
  const initialMonth = useMemo(() => {
    if (selectedDate) return new Date(selectedDate);
    if (availableDates.length > 0) return new Date(availableDates[availableDates.length - 1]);
    return new Date();
  }, []);

  const [navYear, setNavYear] = useState(initialMonth.getFullYear());
  const [navMonth, setNavMonth] = useState(initialMonth.getMonth());

  const monthLabel = useMemo(() => {
    const d = new Date(navYear, navMonth, 1);
    return format(d, 'MMMM yyyy');
  }, [navYear, navMonth]);

  // Count available dates in current month
  const monthDatesCount = useMemo(() => {
    return availableDates.filter((d) => {
      const dt = new Date(d);
      return dt.getFullYear() === navYear && dt.getMonth() === navMonth;
    }).length;
  }, [availableDates, navYear, navMonth]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(navYear, navMonth, 1);
    const lastDay = new Date(navYear, navMonth + 1, 0);
    const startOffset = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const days: Array<{ day: number; dateStr: string; available: boolean } | null> = [];
    // Empty cells for offset
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${navYear}-${String(navMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, available: dateSet.has(dateStr) });
    }
    return days;
  }, [navYear, navMonth, dateSet]);

  const navigate = (dir: -1 | 1) => {
    setNavMonth((m) => {
      const next = m + dir;
      if (next < 0) { setNavYear((y) => y - 1); return 11; }
      if (next > 11) { setNavYear((y) => y + 1); return 0; }
      return next;
    });
  };

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const cellSize = (SCREEN_WIDTH - 80) / 7;

  return (
    <View style={dpStyles.container}>
      {/* Month nav header */}
      <View style={dpStyles.header}>
        <TouchableOpacity onPress={() => navigate(-1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={dpStyles.headerCenter}>
          <Ionicons name="calendar-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[dpStyles.monthLabel, { color: themeColors.textPrimary }]}>{monthLabel}</Text>
          <Text style={[dpStyles.countBadge, { color: themeColors.brandPrimary }]}>
            {monthDatesCount} available
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigate(1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={dpStyles.weekRow}>
        {weekDays.map((d, dayIdx) => (
          <Text key={"day-" + dayIdx} style={[dpStyles.weekDay, { width: cellSize, color: themeColors.textTertiary }]}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={dpStyles.grid}>
        {calendarDays.map((cell, emptyIdx) => {
          if (!cell) {
            return <View key={`empty-${emptyIdx}`} style={{ width: cellSize, height: cellSize }} />;
          }
          const isSelected = selectedDate === cell.dateStr;
          const isAvailable = cell.available;
          return (
            <TouchableOpacity
              key={cell.dateStr}
              disabled={!isAvailable}
              onPress={() => onSelectDate(isSelected ? null : cell.dateStr)}
              style={[
                dpStyles.dayCell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: isSelected
                    ? themeColors.brandPrimary
                    : isAvailable
                      ? themeColors.successContainer
                      : 'transparent',
                  borderRadius: cellSize / 2,
                },
              ]}
            >
              <Text
                style={[
                  dpStyles.dayText,
                  {
                    color: isSelected
                      ? '#fff'
                      : isAvailable
                        ? themeColors.success
                        : themeColors.textTertiary + '60',
                    fontWeight: isAvailable ? '700' : '400',
                  },
                ]}
              >
                {cell.day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected date display */}
      {selectedDate && (
        <View style={[dpStyles.selectedRow, { backgroundColor: themeColors.brandContainer + '20' }]}>
          <Ionicons name="checkmark-circle" size={16} color={themeColors.brandPrimary} />
          <Text style={[dpStyles.selectedText, { color: themeColors.brandPrimary }]}>
            {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
          </Text>
          <TouchableOpacity onPress={() => onSelectDate(null)}>
            <Ionicons name="close-circle" size={16} color={themeColors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const dpStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthLabel: { fontSize: 15, fontWeight: '600' },
  countBadge: { fontSize: 11, fontWeight: '600' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, marginTop: 8 },
  selectedText: { fontSize: 13, fontWeight: '600', flex: 1 },
});

// ─── Section Header with expand button ───────────────────────

function SectionHeader({ icon, title, themeColors, onExpand }: {
  icon: IconName; title: string; themeColors: ReturnType<typeof useTheme>['colors']; onExpand: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={themeColors.brandPrimary} />
      <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, flex: 1 }]}>{title}</Text>
      <TouchableOpacity onPress={onExpand} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="expand-outline" size={20} color={themeColors.iconSubtle} />
      </TouchableOpacity>
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
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  const startDate = useMemo(() => format(subDays(new Date(), 730), 'yyyy-MM-dd'), []);

  const { data: parcel } = useParcel(parcelId);
  const { data: rawData = [], isLoading, refetch: refetchData } = useSatelliteData(parcelId, { start_date: startDate });
  const { data: latestData = [], refetch: refetchLatest } = useLatestSatelliteData(parcelId);
  const { data: syncStatus } = useSyncStatus(parcelId);

  const chartData = useMemo(() => groupByDate(rawData), [rawData]);

  const availableDates = useMemo(() => {
    return [...new Set(rawData.filter((p) => p.index_name === heatmapIndex).map((p) => p.date))].sort();
  }, [rawData, heatmapIndex]);

  const latestByIndex = useMemo(() => {
    const map = new Map<string, { value: number; date: string; trend: string | null }>();
    for (const p of latestData) {
      if (!map.has(p.index_name)) map.set(p.index_name, { value: p.mean_value, date: p.date, trend: p.trend_direction });
    }
    return map;
  }, [latestData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchData(), refetchLatest()]);
    setRefreshing(false);
  }, [refetchData, refetchLatest]);

  const toggleIndex = (vegIdx: VegetationIndex) => {
    setSelectedIndices((prev) => prev.includes(vegIdx) ? (prev.length > 1 ? prev.filter((i) => i !== vegIdx) : prev) : [...prev, vegIdx]);
  };

  return (
    <>
      {/* ─── Fullscreen Chart Modal ──────────── */}
      <FullscreenModal visible={chartFullscreen} onClose={() => setChartFullscreen(false)} title="Time Series" themeColors={themeColors}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DEFAULT_INDICES.map((vegIdx) => (
              <IndexChip key={String(vegIdx)} name={vegIdx} active={selectedIndices.includes(vegIdx)} color={INDEX_COLORS[vegIdx]} onToggle={() => toggleIndex(vegIdx)} themeColors={themeColors} />
            ))}
          </ScrollView>
          <TimeSeriesChart data={chartData} indices={selectedIndices} themeColors={themeColors} fullscreen />
        </ScrollView>
      </FullscreenModal>

      {/* ─── Fullscreen Map Modal ────────────── */}
      <FullscreenModal visible={mapFullscreen} onClose={() => setMapFullscreen(false)} title="Heatmap" themeColors={themeColors}>
        <View style={{ flex: 1, padding: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DEFAULT_INDICES.map((vegIdx) => (
              <IndexChip key={String(vegIdx)} name={vegIdx} active={heatmapIndex === vegIdx} color={INDEX_COLORS[vegIdx]} onToggle={() => { setHeatmapIndex(vegIdx); setSelectedDate(null); }} themeColors={themeColors} />
            ))}
          </ScrollView>
          <MonthDatePicker
            availableDates={availableDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            themeColors={themeColors}
          />
          <MapContent
            parcelId={parcelId}
            rawBoundary={parcel?.boundary ?? null}
            index={heatmapIndex}
            selectedDate={selectedDate}
            themeColors={themeColors}
            mapHeight={SCREEN_HEIGHT - 250}
          />
        </View>
      </FullscreenModal>

      {/* ─── Main Scroll Content ─────────────── */}
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
            <Text style={[styles.bannerText, { color: themeColors.warning }]}>No cached data. Sync from the web dashboard.</Text>
          </View>
        )}
        {syncStatus && syncStatus.status !== 'no_data' && syncStatus.total_records > 0 && (
          <View style={[styles.banner, { backgroundColor: themeColors.successContainer }]}>
            <Ionicons name="checkmark-circle" size={18} color={themeColors.success} />
            <Text style={[styles.bannerText, { color: themeColors.success }]}>{syncStatus.total_records} points · {syncStatus.indices.length} indices</Text>
          </View>
        )}

        {/* Latest values */}
        {latestByIndex.size > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.latestRow}>
            {DEFAULT_INDICES.map((vegIdx) => {
              const d = latestByIndex.get(vegIdx);
              if (!d) return null;
              const trendIcon: IconName = d.trend === 'up' ? 'trending-up' : d.trend === 'down' ? 'trending-down' : 'remove-outline';
              const trendColor = d.trend === 'up' ? themeColors.success : d.trend === 'down' ? themeColors.error : themeColors.textTertiary;
              return (
                <View key={String(vegIdx)} style={[styles.latestCard, { backgroundColor: themeColors.surfaceLowest }]}>
                  <View style={[styles.latestDot, { backgroundColor: INDEX_COLORS[vegIdx] }]} />
                  <Text style={[styles.latestIndex, { color: themeColors.textSecondary }]}>{vegIdx}</Text>
                  <Text style={[styles.latestValue, { color: themeColors.textPrimary }]}>{d.value.toFixed(3)}</Text>
                  <View style={styles.latestTrendRow}>
                    <Ionicons name={trendIcon} size={12} color={trendColor} />
                    <Text style={[styles.latestDate, { color: themeColors.textTertiary }]}>{format(new Date(d.date), 'MMM d')}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* ─── Time Series ─────────────────────── */}
        <View style={[styles.section, { backgroundColor: themeColors.surfaceLowest }]}>
          <SectionHeader icon="analytics" title="Time Series" themeColors={themeColors} onExpand={() => setChartFullscreen(true)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DEFAULT_INDICES.map((vegIdx) => (
              <IndexChip key={String(vegIdx)} name={vegIdx} active={selectedIndices.includes(vegIdx)} color={INDEX_COLORS[vegIdx]} onToggle={() => toggleIndex(vegIdx)} themeColors={themeColors} />
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
            <TimeSeriesChart data={chartData} indices={selectedIndices} themeColors={themeColors} />
          )}
          {chartData.length > 0 && (
            <View style={styles.chartLegend}>
              {selectedIndices.map((vegIdx) => (
                <View key={String(vegIdx)} style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: INDEX_COLORS[vegIdx] }]} />
                  <Text style={[styles.legendItemText, { color: themeColors.textSecondary }]}>{vegIdx}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── Heatmap Map ─────────────────────── */}
        <View style={[styles.section, { backgroundColor: themeColors.surfaceLowest }]}>
          <SectionHeader icon="map" title="Heatmap" themeColors={themeColors} onExpand={() => setMapFullscreen(true)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DEFAULT_INDICES.map((vegIdx) => (
              <IndexChip key={String(vegIdx)} name={vegIdx} active={heatmapIndex === vegIdx} color={INDEX_COLORS[vegIdx]} onToggle={() => { setHeatmapIndex(vegIdx); setSelectedDate(null); }} themeColors={themeColors} />
            ))}
          </ScrollView>
          <MonthDatePicker
            availableDates={availableDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            themeColors={themeColors}
          />
          <MapContent parcelId={parcelId} rawBoundary={parcel?.boundary ?? null} index={heatmapIndex} selectedDate={selectedDate} themeColors={themeColors} mapHeight={MAP_HEIGHT} />
        </View>

        {/* ─── Stats ──────────────────────────── */}
        {chartData.length > 0 && (
          <View style={[styles.section, { backgroundColor: themeColors.surfaceLowest }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart" size={20} color={themeColors.brandPrimary} />
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Statistics</Text>
            </View>
            {selectedIndices.map((vegIdx) => {
              const values = rawData.filter((p) => p.index_name === vegIdx && p.mean_value != null).map((p) => p.mean_value);
              if (values.length === 0) return null;
              const mean = values.reduce((s, v) => s + v, 0) / values.length;
              return (
                <View key={String(vegIdx)} style={[styles.statsRow, { borderBottomColor: themeColors.outlineVariant }]}>
                  <View style={styles.statsLabel}>
                    <View style={[styles.statsDot, { backgroundColor: INDEX_COLORS[vegIdx] }]} />
                    <Text style={[styles.statsIndex, { color: themeColors.textPrimary }]}>{vegIdx}</Text>
                  </View>
                  <View style={styles.statsValues}>
                    {[{ l: 'Min', v: Math.min(...values) }, { l: 'Mean', v: mean }, { l: 'Max', v: Math.max(...values) }, { l: 'Pts', v: values.length }].map((s) => (
                      <View key={s.l} style={styles.statItem}>
                        <Text style={[styles.statCaption, { color: themeColors.textTertiary }]}>{s.l}</Text>
                        <Text style={[styles.statNum, { color: themeColors.textPrimary }]}>{typeof s.v === 'number' && s.l !== 'Pts' ? s.v.toFixed(3) : s.v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  bannerText: { fontSize: 13, fontWeight: '500', flex: 1 },

  tooltip: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginBottom: 8 },
  tooltipText: { fontSize: 13, fontWeight: '700' },
  tooltipDate: { fontSize: 11, flex: 1 },

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

  statsBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, marginBottom: 8 },
  statsBarItem: { alignItems: 'center' },
  statsBarLabel: { fontSize: 10, fontWeight: '500' },
  statsBarValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  mapContainer: { borderRadius: 14, overflow: 'hidden', position: 'relative' },
  map: { flex: 1 },
  mapLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 14 },
  mapLoadingText: { fontSize: 13, marginTop: 8 },
  mapDateText: { fontSize: 11 },
  mapOverlay: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  indexBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  indexBadgeText: { fontSize: 12, fontWeight: '700' },
  tappedValueText: { fontSize: 14, fontWeight: '700' },
  mapTypeBtn: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'center' },
  legendLabel: { fontSize: 11, fontWeight: '600' },
  legendGradient: { flexDirection: 'row', gap: 2 },
  legendCell: { width: 24, height: 14, borderRadius: 3 },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  statsLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 60 },
  statsDot: { width: 10, height: 10, borderRadius: 5 },
  statsIndex: { fontSize: 14, fontWeight: '600' },
  statsValues: { flexDirection: 'row', gap: 16 },
  statItem: { alignItems: 'center' },
  statCaption: { fontSize: 10, fontWeight: '500' },
  statNum: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
