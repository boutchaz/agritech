import { Cloud, CloudRain, Wind } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ParcelForecastDay } from '@/services/weatherClimateService';
import { SectionLoader } from '@/components/ui/loader';

interface WeatherForecastProps {
  forecast?: ParcelForecastDay[];
  loading?: boolean;
  error?: string | null;
}

/**
 * Daily outlook from Nest GET /weather/parcel/:id or Open-Meteo (browser fallback).
 * Does not call OpenWeatherMap or use any client-side weather API key.
 */
const WeatherForecast = ({ forecast = [], loading, error }: WeatherForecastProps) => {
  const { t, i18n } = useTranslation();

  if (loading) {
    return <SectionLoader />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!forecast.length) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">{t('weather.forecast.empty')}</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {forecast.map((day) => {
          const dateObj = new Date(day.date.includes('T') ? day.date : `${day.date}T12:00:00`);
          return (
            <div
              key={day.date}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
            >
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {dateObj.toLocaleDateString(i18n.language, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </div>

              <div className="flex items-center justify-between mb-2">
                <div>
                  <img
                    src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                    alt={day.description}
                    className="w-12 h-12"
                  />
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{Math.round(day.temp.day)}°C</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(day.temp.min)}° / {Math.round(day.temp.max)}°
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CloudRain className="h-4 w-4 mr-1 text-blue-500" />
                    {t('weather.forecast.precip')}
                  </div>
                  <span>{day.precipitation}mm</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Wind className="h-4 w-4 mr-1 text-gray-500" />
                    {t('weather.forecast.wind')}
                  </div>
                  <span>{day.windSpeed}km/h</span>
                </div>

                {day.humidity > 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Cloud className="h-4 w-4 mr-1 text-gray-500" />
                      {t('weather.forecast.humidity')}
                    </div>
                    <span>{day.humidity}%</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default WeatherForecast;
