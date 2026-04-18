// Weather Types for Mobile App

export interface WeatherForecast {
  date: string;
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

export interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  description: string;
  icon: string;
  uvi: number;
  clouds: number;
  visibility: number;
}

export interface DailyWeather {
  date: string;
  temp_min: number;
  temp_max: number;
  precipitation: number;
  et0: number;
  humidity: number;
  wind_speed: number;
}

export interface MonthlyAggregate {
  month: string;
  precipitation_total: number;
  gdd_total: number;
  avg_temp: number;
}

export interface ClimateNormals {
  month: string;
  avg_temp_min: number;
  avg_temp_max: number;
  avg_precipitation: number;
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  title: string;
  description: string;
  start_date: string;
  end_date: string;
}

export interface WeatherData {
  current: CurrentWeather | null;
  forecast: WeatherForecast[];
  daily: DailyWeather[];
  monthly: MonthlyAggregate[];
  alerts: WeatherAlert[];
}

export type TimeRange = 'last-3-months' | 'last-6-months' | 'last-12-months' | 'ytd';
