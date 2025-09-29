import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import type { SensorData } from '../types';

const SOCKET_URL = 'wss://your-sensor-websocket-url';
const DISABLE_SENSORS = true;

export function useSensorData() {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [latestReadings, setLatestReadings] = useState<Record<string, SensorData>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (DISABLE_SENSORS) {
      // Sensors temporarily disabled
      setIsConnected(false);
      return () => {};
    }

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to sensor WebSocket');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from sensor WebSocket');
    });

    socket.on('sensorData', (data: SensorData) => {
      setSensorData(prev => [...prev, data].slice(-50)); // Keep last 50 readings
      setLatestReadings(prev => ({
        ...prev,
        [data.type]: data
      }));
    });

    // Simulate sensor data for development
    if (!DISABLE_SENSORS && process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const mockData: SensorData = {
          id: Date.now().toString(),
          type: ['moisture', 'temperature', 'wind', 'ph'][Math.floor(Math.random() * 4)],
          value: Math.random() * 100,
          unit: '%',
          timestamp: new Date(),
          location: 'Parcelle A'
        };
        socket.emit('sensorData', mockData);
      }, 2000);

      return () => clearInterval(interval);
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    sensorData,
    latestReadings,
    isConnected
  };
}