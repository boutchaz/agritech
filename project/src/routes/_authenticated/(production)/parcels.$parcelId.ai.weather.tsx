import { createFileRoute } from '@tanstack/react-router'
import { Cloud } from 'lucide-react'

const AIWeatherPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Weather Analysis</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">AI-driven weather forecasting and impact analysis.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Cloud className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Coming Soon</h3>
        <p className="text-gray-500 dark:text-gray-400">Advanced AI weather analysis features are currently under development.</p>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/weather')({
  component: AIWeatherPage,
});
