// Weather Screen for Mobile
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { colors, spacing } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { LoadingState } from '@/components/ui';
import { CurrentConditions, ForecastList } from '@/components/weather';
import { useWeatherData } from '@/hooks/useWeather';

export default function WeatherScreen() {
  const { id: parcelId } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('common');
  const [refreshing, setRefreshing] = useState(false);

  const { data: weatherData, isLoading, refetch } = useWeatherData(parcelId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !weatherData) {
    return <LoadingState />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <PageHeader
        title={t('weather.title', 'Weather')}
        showBack={true}
      />

      {/* Current Conditions */}
      <CurrentConditions weather={weatherData?.current || null} />

      {/* 7-Day Forecast */}
      <ForecastList forecast={weatherData?.forecast || []} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
});
