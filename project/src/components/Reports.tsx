import {  useState, useEffect  } from "react";
import { FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { Module } from '../types';
import { useOrganizationStore } from '../stores/organizationStore';
import { reportsApi, ReportCategory, ReportType, ReportTypeInfo } from '../lib/api/reports';
import { Button } from '@/components/ui/button';

interface ReportsProps {
  activeModules?: Module[];
}

const Reports = ({ activeModules: _activeModules = [] }: ReportsProps) => {
  const { currentOrganization } = useOrganizationStore();
  const [baseReports, setBaseReports] = useState<ReportCategory[]>([]);
  const [moduleReports, setModuleReports] = useState<ReportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvailableReports = async () => {
      if (!currentOrganization?.id) {
        setError('No organization selected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await reportsApi.getAvailableReports(currentOrganization.id);
        setBaseReports(data.baseReports);
        setModuleReports(data.moduleReports);
      } catch (err: any) {
        console.error('Error fetching available reports:', err);
        setError(err.message || 'Failed to fetch available reports');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableReports();
  }, [currentOrganization?.id]);

  const handleDownloadReport = async (reportType: ReportType, reportName: string) => {
    if (!currentOrganization?.id) {
      toast.error('No organization selected');
      return;
    }

    try {
      // For now, just generate the report with default date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const reportData = await reportsApi.generateReport(currentOrganization.id, {
        report_type: reportType,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });

      // Convert to CSV and download
      const csv = convertToCSV(reportData.columns, reportData.data);
      downloadCSV(csv, `${reportName}-${endDate.toISOString().split('T')[0]}.csv`);
    } catch (err: any) {
      console.error('Error generating report:', err);
      toast.error(err.message || 'Failed to generate report');
    }
  };

  const convertToCSV = (columns: string[], data: Record<string, any>[]): string => {
    const header = columns.join(',');
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col];
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value ?? '');
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    );
    return [header, ...rows].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allReports = [...baseReports, ...moduleReports];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Rapports
          </h2>
        </div>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Chargement des rapports disponibles...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Rapports
          </h2>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
          <p className="text-red-800 dark:text-red-200 text-center">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between" data-tour="reports-list">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Rapports
        </h2>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg" data-tour="reports-filters">
        <p className="text-blue-800 dark:text-blue-200 text-center">
          Cliquez sur "Télécharger" pour générer un rapport au format CSV (30 derniers jours par défaut).
        </p>
      </div>

      {allReports.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Aucun rapport disponible
        </div>
      ) : (
        <div className="space-y-8">
          {allReports.map(category => (
            <div key={category.id}>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {category.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {category.description}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.types.map((reportType: ReportTypeInfo) => (
                  <div
                    key={reportType.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {reportType.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {reportType.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button variant="blue"
                      onClick={() => handleDownloadReport(reportType.id, reportType.name)}
                      className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors"
                      data-tour="reports-export"
                    >
                      <Download className="h-5 w-5" />
                      <span>Télécharger</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;
