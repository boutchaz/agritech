// CurrentConditions - Display current weather
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Card } from '@/components/ui';
import type { CurrentWeather } from '@/types/weather';

interface CurrentConditionsProps {
  weather: CurrentWeather | null;
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

export function CurrentConditions({ weather }: CurrentConditionsProps) {
  if (!weather) {
    return (
      <Card variant="elevated">
        <View style={styles.container}>
          <Text style={styles.noData}>Weather data unavailable</Text>
        </View>
      </Card>
    );
  }

  const iconName = weatherIcons[weather.icon] || 'partly-sunny';

  return (
    <Card variant="elevated">
      <View style={styles.container}>
        <View style={styles.mainRow}>
          <Ionicons name={iconName as any} size={64} color={colors.primary[600]} />
          <View style={styles.tempContainer}>
            <Text style={styles.temp}>{Math.round(weather.temp)}°C</Text>
            <Text style={styles.feelsLike}>
              Feels like {Math.round(weather.feels_like)}°C
            </Text>
            <Text style={styles.description}>{weather.description}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Ionicons name="water-outline" size={20} color={colors.blue[500]} />
            <Text style={styles.metricValue}>{weather.humidity}%</Text>
            <Text style={styles.metricLabel}>Humidity</Text>
          </View>

          <View style={styles.metricItem}>
            <Ionicons name="speedometer-outline" size={20} color={colors.gray[500]} />
            <Text style={styles.metricValue}>{weather.pressure}</Text>
            <Text style={styles.metricLabel}>Pressure</Text>
          </View>

          <View style={styles.metricItem}>
            <Ionicons name="arrow-forward-outline" size={20} color={colors.primary[500]} />
            <Text style={styles.metricValue}>{weather.wind_speed} km/h</Text>
            <Text style={styles.metricLabel}>Wind</Text>
          </View>

          <View style={styles.metricItem}>
            <Ionicons name="sunny-outline" size={20} color={colors.yellow[500]} />
            <Text style={styles.metricValue}>{weather.uvi}</Text>
            <Text style={styles.metricLabel}>UV Index</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tempContainer: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  temp: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  feelsLike: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  description: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    textTransform: 'capitalize',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    marginLeft: spacing.xs,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginLeft: spacing.xs,
  },
  noData: {
    textAlign: 'center',
    color: colors.gray[500],
    paddingVertical: spacing.lg,
  },
});
