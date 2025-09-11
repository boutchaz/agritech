import { useState, useEffect } from 'react';

const OPENWEATHER_API_KEY = '9de243494c0b295cca9337e1e96b00e2'; // Free API key

interface WeatherForecast {
  date: Date;
  temp: {
    day: number;
    min: number;
    max: number;
  };
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  precipitation: number;
}

export function useWeatherForecast(lat: number, lon: number) {
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast/daily?lat=${lat}&lon=${lon}&cnt=15&units=metric&appid=${OPENWEATHER_API_KEY}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();
        
        const formattedForecast: WeatherForecast[] = data.list.map((day: any) => ({
          date: new Date(day.dt * 1000),
          temp: {
            day: Math.round(day.temp.day),
            min: Math.round(day.temp.min),
            max: Math.round(day.temp.max),
          },
          humidity: day.humidity,
          windSpeed: Math.round(day.speed * 3.6), // Convert m/s to km/h
          description: day.weather[0].description,
          icon: day.weather[0].icon,
          precipitation: day.rain ? day.rain : 0,
        }));

        setForecast(formattedForecast);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [lat, lon]);

  return { forecast, loading, error };
}