import React from 'react';
import { PestAlertCard } from './PestAlertCard';
import type { PestReportResponseDto } from '@/lib/api/pest-alerts';
import { Bug } from 'lucide-react';

interface PestReportsListProps {
  reports: PestReportResponseDto[];
  isLoading: boolean;
}

export const PestReportsList: React.FC<PestReportsListProps> = ({ reports, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-[125px] w-full rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-[250px] bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
              <div className="h-4 w-[200px] bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-900/50">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
          <Bug className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Aucun signalement
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-2">
          Il n'y a pas encore de signalements de ravageurs ou maladies pour cette période.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reports.map((report) => (
        <PestAlertCard key={report.id} report={report} />
      ))}
    </div>
  );
};
