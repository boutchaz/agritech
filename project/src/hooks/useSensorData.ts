import { useState, useEffect } from 'react';
import type { SensorData } from '../types';

const SENSOR_WS_URL = import.meta.env.VITE_SENSOR_WS_URL || '';
const SENSORS_ENABLED = !!SENSOR_WS_URL;

export function useSensorData() {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [latestReadings, setLatestReadings] = useState<Record<string, SensorData>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!SENSORS_ENABLED) {
      return;
    }

    let socket: ReturnType<typeof import('socket.io-client').default> | null = null;

    import('socket.io-client').then(({ default: io }) => {
      socket = io(SENSOR_WS_URL);

      socket.on('connect', () => {
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('sensorData', (data: SensorData) => {
        setSensorData(prev => [...prev, data].slice(-50));
        setLatestReadings(prev => ({
          ...prev,
          [data.type]: data
        }));
      });
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  return {
    sensorData,
    latestReadings,
    isConnected
  };
}