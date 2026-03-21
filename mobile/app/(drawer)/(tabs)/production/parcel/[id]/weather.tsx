import { useState, useCallback, useMemo } from 'react';
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
import { format } from 'date-fns';
import { useTheme } from '@/providers/ThemeProvider';
import { useWeatherData, useMonthlyMetrics, useClimateNormals, useWeatherAlerts } from '@/hooks/useWeather';
import type { WeatherForecast, DailyWeather, MonthlyAggregate, ClimateNormals, WeatherAlert, TimeRange, CurrentWeather } from '@/types/weather';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const SCREEN_WIDTH = Dimensions.get('window').width;

const WEATHER_ICONS: Record<string, IconName> = {
  '01d': 'sunny', '01n': 'moon', '02d': 'partly-sunny', '02n': 'cloudy-night',
  '03d': 'cloud', '03n': 'cloud', '04d': 'cloud', '04n': 'cloud',
  '09d': 'rainy', '09n': 'rainy', '10d': 'rainy', '10n': 'rainy',
  '11d': 'thunderstorm', '11n': 'thunderstorm', '13d': 'snow', '13n': 'snow',
  '50d': 'flag-outline', '50n': 'flag-outline',
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; icon: IconName }> = {
  low: { bg: '#e8f5e9', text: '#2e7d32', icon: 'information-circle' },
  medium: { bg: '#fff3e0', text: '#e65100', icon: 'alert-circle' },
  high: { bg: '#fbe9e7', text: '#c62828', icon: 'warning' },
  extreme: { bg: '#f3e5f5', text: '#6a1b9a', icon: 'skull' },
};

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'last-3-months', label: '3M' },
  { key: 'last-6-months', label: '6M' },
  { key: 'last-12-months', label: '12M' },
  { key: 'ytd', label: 'YTD' },
];

// ─── Current Conditions Card ─────────────────────────────────

function CurrentCard({ weather, themeColors }: { weather: CurrentWeather; themeColors: ReturnType<typeof useTheme>['colors'] }) {
  const icon = WEATHER_ICONS[weather.icon] || 'partly-sunny';

  return (
    <View style={[s.card, { backgroundColor: themeColors.surfaceLowest }]}>
      <View style={s.currentMain}>
        <View style={[s.currentIconWrap, { backgroundColor: themeColors.brandContainer + '30' }]}>
          <Ionicons name={icon} size={40} color={themeColors.brandPrimary} />
        </View>
        <View style={s.currentInfo}>
          <Text style={[s.currentTemp, { color: themeColors.textPrimary }]}>{Math.round(weather.temp)}°C</Text>
          <Text style={[s.currentFeels, { color: themeColors.textSecondary }]}>Feels {Math.round(weather.feels_like)}°C</Text>
          <Text style={[s.currentDesc, { color: themeColors.textPrimary }]}>{weather.description}</Text>
        </View>
      </View>

      <View style={[s.metricsGrid, { borderTopColor: themeColors.outlineVariant }]}>
        {([
          { icon: 'water-outline' as IconName, value: `${weather.humidity}%`, label: 'Humidity', color: themeColors.info },
          { icon: 'speedometer-outline' as IconName, value: `${weather.pressure}`, label: 'hPa', color: themeColors.textSecondary },
          { icon: 'flag-outline' as IconName, value: `${weather.wind_speed} km/h`, label: 'Wind', color: themeColors.brandPrimary },
          { icon: 'sunny-outline' as IconName, value: `${weather.uvi}`, label: 'UV', color: themeColors.warning },
          { icon: 'eye-outline' as IconName, value: `${(weather.visibility / 1000).toFixed(0)} km`, label: 'Visibility', color: themeColors.textSecondary },
          { icon: 'cloudy-outline' as IconName, value: `${weather.clouds}%`, label: 'Clouds', color: themeColors.textTertiary },
        ]).map((m) => (
          <View key={m.label} style={s.metricItem}>
            <Ionicons name={m.icon} size={16} color={m.color} />
            <Text style={[s.metricValue, { color: themeColors.textPrimary }]}>{m.value}</Text>
            <Text style={[s.metricLabel, { color: themeColors.textTertiary }]}>{m.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── 7-Day Forecast ──────────────────────────────────────────

function ForecastSection({ forecast, themeColors }: { forecast: WeatherForecast[]; themeColors: ReturnType<typeof useTheme>['colors'] }) {
  const today = new Date().toDateString();

  return (
    <View style={[s.card, { backgroundColor: themeColors.surfaceLowest }]}>
      <View style={s.sectionHeader}>
        <Ionicons name="calendar-outline" size={18} color={themeColors.brandPrimary} />
        <Text style={[s.sectionTitle, { color: themeColors.textPrimary }]}>7-Day Forecast</Text>
      </View>

      {forecast.slice(0, 7).map((day) => {
        const isToday = new Date(day.date).toDateString() === today;
        const icon = WEATHER_ICONS[day.icon] || 'partly-sunny';
        const dayLabel = isToday ? 'Today' : format(new Date(day.date), 'EEE');

        return (
          <View key={day.date} style={[s.forecastRow, { borderBottomColor: themeColors.outlineVariant }]}>
            <Text style={[s.forecastDay, { color: isToday ? themeColors.brandPrimary : themeColors.textPrimary, fontWeight: isToday ? '700' : '400' }]}>{dayLabel}</Text>
            <Ionicons name={icon} size={20} color={themeColors.brandPrimary} />
            <View style={s.tempBar}>
              <Text style={[s.tempMax, { color: themeColors.textPrimary }]}>{Math.round(day.temp.max)}°</Text>
              <View style={[s.tempBarFill, { backgroundColor: themeColors.outlineVariant }]}>
                <View style={[s.tempBarInner, { backgroundColor: themeColors.warning, width: `${Math.min(100, ((day.temp.max - day.temp.min) / 30) * 100)}%` }]} />
              </View>
              <Text style={[s.tempMin, { color: themeColors.textTertiary }]}>{Math.round(day.temp.min)}°</Text>
            </View>
            {day.precipitation > 0 && (
              <View style={s.precipBadge}>
                <Ionicons name="water" size={10} color={themeColors.info} />
                <Text style={[s.precipText, { color: themeColors.info }]}>{Math.round(day.precipitation)}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Weather Alerts ──────────────────────────────────────────

function AlertsSection({ alerts, themeColors }: { alerts: WeatherAlert[]; themeColors: ReturnType<typeof useTheme>['colors'] }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <View style={[s.card, { backgroundColor: themeColors.surfaceLowest }]}>
      <View style={s.sectionHeader}>
        <Ionicons name="warning-outline" size={18} color={themeColors.error} />
        <Text style={[s.sectionTitle, { color: themeColors.textPrimary }]}>Alerts</Text>
        <View style={[s.countBadge, { backgroundColor: themeColors.errorContainer }]}>
          <Text style={[s.countBadgeText, { color: themeColors.error }]}>{alerts.length}</Text>
        </View>
      </View>

      {alerts.map((alert) => {
        const sev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low;
        return (
          <View key={alert.id} style={[s.alertCard, { backgroundColor: sev.bg }]}>
            <Ionicons name={sev.icon} size={18} color={sev.text} />
            <View style={s.alertContent}>
              <Text style={[s.alertTitle, { color: sev.text }]}>{alert.title}</Text>
              <Text style={[s.alertDesc, { color: sev.text + 'CC' }]} numberOfLines={2}>{alert.description}</Text>
              <Text style={[s.alertDate, { color: sev.text + '99' }]}>
                {format(new Date(alert.start_date), 'MMM d')} — {format(new Date(alert.end_date), 'MMM d')}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Monthly Trends (bar chart) ──────────────────────────────

function MonthlyTrends({
  monthly,
  normals,
  themeColors,
}: {
  monthly: MonthlyAggregate[];
  normals: ClimateNormals[];
  themeColors: ReturnType<typeof useTheme>['colors'];
}) {
  if (!monthly || monthly.length === 0) return null;

  const maxPrecip = Math.max(...monthly.map((m) => m.precipitation_total), 1);
  const maxTemp = Math.max(...monthly.map((m) => m.avg_temp), 1);
  const barW = Math.max(16, (SCREEN_WIDTH - 80) / monthly.length - 4);

  // Build normals lookup
  const normalsMap = useMemo(() => {
    const map = new Map<string, ClimateNormals>();
    for (const n of normals) map.set(n.month, n);
    return map;
  }, [normals]);

  return (
    <View>
      {/* Precipitation bars */}
      <Text style={[s.chartLabel, { color: themeColors.textSecondary }]}>Precipitation (mm)</Text>
      <View style={s.barChartRow}>
        {monthly.map((m) => {
          const h = Math.max(4, (m.precipitation_total / maxPrecip) * 80);
          const monthLabel = format(new Date(m.month + '-01'), 'MMM');
          const normal = normalsMap.get(m.month);
          const normalH = normal ? Math.max(2, (normal.avg_precipitation / maxPrecip) * 80) : 0;

          return (
            <View key={m.month} style={s.barCol}>
              <View style={s.barContainer}>
                {normalH > 0 && (
                  <View style={[s.bar, { height: normalH, backgroundColor: themeColors.outlineVariant, position: 'absolute', bottom: 0, width: barW }]} />
                )}
                <View style={[s.bar, { height: h, backgroundColor: themeColors.info + '90', width: barW }]} />
              </View>
              <Text style={[s.barValue, { color: themeColors.textTertiary }]}>{Math.round(m.precipitation_total)}</Text>
              <Text style={[s.barLabel, { color: themeColors.textTertiary }]}>{monthLabel}</Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: themeColors.info + '90' }]} />
          <Text style={[s.legendText, { color: themeColors.textTertiary }]}>Actual</Text>
        </View>
        {normals.length > 0 && (
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: themeColors.outlineVariant }]} />
            <Text style={[s.legendText, { color: themeColors.textTertiary }]}>Normal (30yr)</Text>
          </View>
        )}
      </View>

      {/* Temperature bars */}
      <Text style={[s.chartLabel, { color: themeColors.textSecondary, marginTop: 20 }]}>Avg Temperature (°C)</Text>
      <View style={s.barChartRow}>
        {monthly.map((m) => {
          const h = Math.max(4, (m.avg_temp / maxTemp) * 60);
          const monthLabel = format(new Date(m.month + '-01'), 'MMM');
          return (
            <View key={m.month} style={s.barCol}>
              <View style={s.barContainer}>
                <View style={[s.bar, { height: h, backgroundColor: themeColors.warning + '80', width: barW }]} />
              </View>
              <Text style={[s.barValue, { color: themeColors.textTertiary }]}>{m.avg_temp.toFixed(1)}</Text>
              <Text style={[s.barLabel, { color: themeColors.textTertiary }]}>{monthLabel}</Text>
            </View>
          );
        })}
      </View>

      {/* GDD */}
      {monthly.some((m) => m.gdd_total > 0) && (
        <>
          <Text style={[s.chartLabel, { color: themeColors.textSecondary, marginTop: 20 }]}>GDD (Growing Degree Days)</Text>
          <View style={s.barChartRow}>
            {monthly.map((m) => {
              const maxGDD = Math.max(...monthly.map((x) => x.gdd_total), 1);
              const h = Math.max(4, (m.gdd_total / maxGDD) * 60);
              const monthLabel = format(new Date(m.month + '-01'), 'MMM');
              return (
                <View key={m.month} style={s.barCol}>
                  <View style={s.barContainer}>
                    <View style={[s.bar, { height: h, backgroundColor: themeColors.success + '80', width: barW }]} />
                  </View>
                  <Text style={[s.barValue, { color: themeColors.textTertiary }]}>{Math.round(m.gdd_total)}</Text>
                  <Text style={[s.barLabel, { color: themeColors.textTertiary }]}>{monthLabel}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Daily ET0 Section ───────────────────────────────────────

function ET0Section({ daily, themeColors }: { daily: DailyWeather[]; themeColors: ReturnType<typeof useTheme>['colors'] }) {
  const recent = daily.slice(-14); // Last 14 days
  if (recent.length === 0) return null;

  const maxET0 = Math.max(...recent.map((d) => d.et0), 1);
  const totalET0 = recent.reduce((sum, d) => sum + d.et0, 0);
  const barW = Math.max(8, (SCREEN_WIDTH - 80) / recent.length - 2);

  return (
    <View style={[s.card, { backgroundColor: themeColors.surfaceLowest }]}>
      <View style={s.sectionHeader}>
        <Ionicons name="water-outline" size={18} color={themeColors.info} />
        <Text style={[s.sectionTitle, { color: themeColors.textPrimary }]}>Evapotranspiration (ET₀)</Text>
      </View>
      <Text style={[s.et0Summary, { color: themeColors.textSecondary }]}>
        Last 14 days total: {totalET0.toFixed(1)} mm
      </Text>

      <View style={s.barChartRow}>
        {recent.map((d) => {
          const h = Math.max(4, (d.et0 / maxET0) * 50);
          return (
            <View key={d.date} style={s.barCol}>
              <View style={s.barContainer}>
                <View style={[s.bar, { height: h, backgroundColor: themeColors.info + '70', width: barW }]} />
              </View>
              <Text style={[s.barLabel, { color: themeColors.textTertiary, fontSize: 8 }]}>
                {format(new Date(d.date), 'd')}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────

export default function WeatherTab() {
  const { id: parcelId } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('last-6-months');

  const { data: weatherData, isLoading, refetch: refetchWeather } = useWeatherData(parcelId);
  const { data: monthlyData, refetch: refetchMonthly } = useMonthlyMetrics(parcelId, timeRange);
  const { data: normalsData } = useClimateNormals(parcelId);
  const { data: alertsData, refetch: refetchAlerts } = useWeatherAlerts(parcelId);

  const monthly = (Array.isArray(monthlyData) ? monthlyData : (monthlyData as any)?.data ?? []) as MonthlyAggregate[];
  const normals = (Array.isArray(normalsData) ? normalsData : (normalsData as any)?.data ?? []) as ClimateNormals[];
  const alerts = (Array.isArray(alertsData) ? alertsData : (alertsData as any)?.data ?? []) as WeatherAlert[];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchWeather(), refetchMonthly(), refetchAlerts()]);
    setRefreshing(false);
  }, [refetchWeather, refetchMonthly, refetchAlerts]);

  // Summary stats from daily data
  const summary = useMemo(() => {
    const daily = weatherData?.daily ?? [];
    if (daily.length === 0) return null;
    const avgTemp = daily.reduce((s, d) => s + (d.temp_max + d.temp_min) / 2, 0) / daily.length;
    const totalPrecip = daily.reduce((s, d) => s + d.precipitation, 0);
    const rainyDays = daily.filter((d) => d.precipitation > 1).length;
    const maxTemp = Math.max(...daily.map((d) => d.temp_max));
    const minTemp = Math.min(...daily.map((d) => d.temp_min));
    return { avgTemp, totalPrecip, rainyDays, maxTemp, minTemp, days: daily.length };
  }, [weatherData]);

  if (isLoading && !weatherData) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.brandPrimary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Current Conditions */}
      {weatherData?.current && <CurrentCard weather={weatherData.current} themeColors={themeColors} />}

      {/* Alerts */}
      <AlertsSection alerts={alerts} themeColors={themeColors} />

      {/* Summary Stats */}
      {summary && (
        <View style={s.summaryRow}>
          {([
            { icon: 'thermometer-outline' as IconName, value: `${summary.avgTemp.toFixed(1)}°`, label: 'Avg Temp', color: themeColors.warning },
            { icon: 'rainy-outline' as IconName, value: `${summary.totalPrecip.toFixed(0)}mm`, label: 'Precip', color: themeColors.info },
            { icon: 'water-outline' as IconName, value: `${summary.rainyDays}d`, label: 'Rainy', color: themeColors.info },
            { icon: 'arrow-up-outline' as IconName, value: `${summary.maxTemp.toFixed(0)}°`, label: 'Max', color: themeColors.error },
            { icon: 'arrow-down-outline' as IconName, value: `${summary.minTemp.toFixed(0)}°`, label: 'Min', color: themeColors.brandPrimary },
          ]).map((item) => (
            <View key={item.label} style={[s.summaryCard, { backgroundColor: themeColors.surfaceLowest }]}>
              <Ionicons name={item.icon} size={16} color={item.color} />
              <Text style={[s.summaryValue, { color: themeColors.textPrimary }]}>{item.value}</Text>
              <Text style={[s.summaryLabel, { color: themeColors.textTertiary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 7-Day Forecast */}
      {weatherData?.forecast && weatherData.forecast.length > 0 && (
        <ForecastSection forecast={weatherData.forecast} themeColors={themeColors} />
      )}

      {/* ET0 */}
      {weatherData?.daily && weatherData.daily.length > 0 && (
        <ET0Section daily={weatherData.daily} themeColors={themeColors} />
      )}

      {/* Monthly Trends */}
      {monthly.length > 0 && (
        <View style={[s.card, { backgroundColor: themeColors.surfaceLowest }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="bar-chart-outline" size={18} color={themeColors.brandPrimary} />
            <Text style={[s.sectionTitle, { color: themeColors.textPrimary, flex: 1 }]}>Monthly Trends</Text>
          </View>

          {/* Time range selector */}
          <View style={s.rangeRow}>
            {TIME_RANGES.map((r) => (
              <TouchableOpacity
                key={r.key}
                onPress={() => setTimeRange(r.key)}
                style={[s.rangeChip, { backgroundColor: timeRange === r.key ? themeColors.brandPrimary : themeColors.surfaceContainer }]}
              >
                <Text style={[s.rangeChipText, { color: timeRange === r.key ? '#fff' : themeColors.textSecondary }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <MonthlyTrends monthly={monthly} normals={normals} themeColors={themeColors} />
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: { borderRadius: 16, padding: 16 },

  // Current
  currentMain: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  currentIconWrap: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  currentInfo: { flex: 1 },
  currentTemp: { fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  currentFeels: { fontSize: 13 },
  currentDesc: { fontSize: 15, fontWeight: '500', textTransform: 'capitalize', marginTop: 2 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  metricItem: { width: '33.33%', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  metricValue: { fontSize: 13, fontWeight: '600' },
  metricLabel: { fontSize: 10 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },

  // Forecast
  forecastRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  forecastDay: { width: 48, fontSize: 14 },
  tempBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tempMax: { fontSize: 14, fontWeight: '600', width: 30, textAlign: 'right' },
  tempMin: { fontSize: 14, width: 30 },
  tempBarFill: { flex: 1, height: 4, borderRadius: 2 },
  tempBarInner: { height: 4, borderRadius: 2 },
  precipBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 30 },
  precipText: { fontSize: 11, fontWeight: '600' },

  // Alerts
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countBadgeText: { fontSize: 12, fontWeight: '700' },
  alertCard: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, marginBottom: 8 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600' },
  alertDesc: { fontSize: 12, marginTop: 2 },
  alertDate: { fontSize: 11, marginTop: 4 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  summaryLabel: { fontSize: 9, fontWeight: '500' },

  // ET0
  et0Summary: { fontSize: 13, marginBottom: 10 },

  // Bar charts
  chartLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  barChartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  barCol: { alignItems: 'center' },
  barContainer: { height: 80, justifyContent: 'flex-end' },
  bar: { borderRadius: 3 },
  barValue: { fontSize: 8, marginTop: 2 },
  barLabel: { fontSize: 9 },

  legendRow: { flexDirection: 'row', gap: 16, marginTop: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11 },

  // Time range
  rangeRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  rangeChipText: { fontSize: 12, fontWeight: '600' },
});
