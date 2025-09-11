import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { SensorData } from '../types';

interface SensorChartProps {
  data: SensorData[];
}

const SensorChart: React.FC<SensorChartProps> = ({ data }) => {
  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatTimestamp}
          interval="preserveStartEnd"
        />
        <YAxis />
        <Tooltip
          labelFormatter={value => formatTimestamp(value as Date)}
          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#4ade80"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SensorChart;