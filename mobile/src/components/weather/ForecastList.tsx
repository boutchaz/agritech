// ForecastList - Display 7-day weather forecast
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Card } from '@/components/ui';
import type { WeatherForecast } from '@/types/weather';

interface ForecastListProps {
  forecast: WeatherForecast[];
}

const weatherIcons: Record<string, string> = {
  '01d': 'sunny',
  '01n': 'moon',
  '02d': 'partly-sunny',
  '02n': 'cloudy-night',
  '03d': 'cloud',
  '03n': 'cloud',
  '04d': 'cloud',
  '04n': 'cloud',
  '09d': 'rainy',
  '09n': 'rainy',
  '10d': 'rainy',
  '10n': 'rainy',
  '11d': 'thunderstorm',
  '11n': 'thunderstorm',
  '13d': 'snow',
  '13n': 'snow',
  '50d': 'fog',
  '50n': 'fog',
};

function ForecastItem({ item, isToday }: { item: WeatherForecast; isToday: boolean }) {
  const date = new Date(item.date);
  const dayName = isToday ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' });
  const iconName = weatherIcons[item.icon] || 'partly-sunny';

  return (
    <View style={styles.forecastItem}>
      <Text style={[styles.dayName, isToday && styles.todayText]}>{dayName}</Text>
      <Ionicons name={iconName as any} size={24} color={colors.primary[600]} />
      <View style={styles.tempRange}>
        <Text style={styles.tempMax}>{Math.round(item.temp.max)}°</Text>
        <Text style={styles.tempMin}>{Math.round(item.temp.min)}°</Text>
      </View>
      {item.precipitation > 0 && (
        <View style={styles.precipContainer}>
          <Ionicons name="water" size={12} color={colors.blue[500]} />
          <Text style={styles.precipText}>{Math.round(item.precipitation)}mm</Text>
        </View>
      )}
    </View>
  );
}

export function ForecastList({ forecast }: ForecastListProps) {
  if (!forecast || forecast.length === 0) {
    return null;
  }

  const today = new Date().toDateString();

  return (
    <Card variant="elevated">
      <Text style={styles.title}>7-Day Forecast</Text>
      <View style={styles.container}>
        {forecast.slice(0, 7).map((item, index) => (
          <ForecastItem
            key={item.date}
            item={item}
            isToday={new Date(item.date).toDateString() === today}
          />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  container: {
    gap: spacing.sm,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  dayName: {
    width: 60,
    fontSize: fontSize.base,
    color: colors.gray[700],
  },
  todayText: {
    fontWeight: fontWeight.semibold,
    color: colors.primary[600],
  },
  tempRange: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  tempMax: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  tempMin: {
    fontSize: fontSize.base,
    color: colors.gray[500],
  },
  precipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  precipText: {
    fontSize: fontSize.xs,
    color: colors.blue[500],
    marginLeft: 2,
  },
});
