import Constants from 'expo-constants';

const ENV = {
  development: {
    API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
  },
  staging: {
    API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://agritech-api.thebzlab.online',
  },
  production: {
    API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://agritech-api.thebzlab.online',
  },
};

type Environment = keyof typeof ENV;

function getEnvironment(): Environment {
  const releaseChannel = Constants.expoConfig?.extra?.releaseChannel;
  if (releaseChannel === 'production') return 'production';
  if (releaseChannel === 'staging') return 'staging';
  return 'development';
}

const environment = getEnvironment();

export const Config = {
  ...ENV[environment],
  environment,
  isDevelopment: environment === 'development',
  isProduction: environment === 'production',
};

export const APP_CONFIG = {
  APP_NAME: Constants.expoConfig?.name || 'AgroGina',
  VERSION: Constants.expoConfig?.version ?? '1.0.0',
  OFFLINE_SYNC_INTERVAL: 30000,
  MAX_OFFLINE_QUEUE_SIZE: 1000,
  LOCATION_UPDATE_INTERVAL: 10000,
  GEOFENCE_RADIUS_METERS: 100,
};
