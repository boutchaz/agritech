import React from 'react';
import { Cloud, CloudRain, Sun, Wind } from 'lucide-react';
import { useWeatherForecast } from '../hooks/useWeatherForecast';

interface WeatherForecastProps {
  latitude: number;
  longitude: number;
}

const WeatherForecast: React.FC<WeatherForecastProps> = ({ latitude, longitude }) => {
  const { forecast, loading, error } = useWeatherForecast(latitude, longitude);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Prévisions météo sur 15 jours</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {forecast.map((day, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
          >
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {day.date.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
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
                <div className="text-lg font-semibold">
                  {day.temp.day}°C
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {day.temp.min}° / {day.temp.max}°
                </div>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CloudRain className="h-4 w-4 mr-1 text-blue-500" />
                  Précip.
                </div>
                <span>{day.precipitation}mm</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wind className="h-4 w-4 mr-1 text-gray-500" />
                  Vent
                </div>
                <span>{day.windSpeed}km/h</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cloud className="h-4 w-4 mr-1 text-gray-500" />
                  Humidité
                </div>
                <span>{day.humidity}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherForecast;