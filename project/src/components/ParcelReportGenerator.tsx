import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Loader,
  Calendar,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ReportTemplate, GeneratedReport } from '../types/reports';

interface ParcelReportGeneratorProps {
  parcelId: string;
  parcelName: string;
  parcelData: any;
}

const ParcelReportGenerator: React.FC<ParcelReportGeneratorProps> = ({
  parcelId,
  parcelName,
  parcelData
}) => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default templates
  const defaultTemplates: ReportTemplate[] = [
    {
      id: 'parcel-analysis',
      name: 'Analyse Complète de Parcelle',
      description: 'Rapport complet incluant analyse du sol, données satellites, et recommandations',
      type: 'parcel_analysis',
      sections: [
        { id: 'overview', title: 'Vue d\'ensemble', type: 'metrics', required: true },
        { id: 'soil', title: 'Analyse du sol', type: 'table', required: true },
        { id: 'satellite', title: 'Données satellites', type: 'image', required: false },
        { id: 'recommendations', title: 'Recommandations', type: 'text', required: true }
      ]
    },
    {
      id: 'soil-report',
      name: 'Rapport d\'Analyse du Sol',
      description: 'Analyse détaillée des propriétés physiques et chimiques du sol',
      type: 'soil_report',
      sections: [
        { id: 'physical', title: 'Analyse physique', type: 'table', required: true },
        { id: 'chemical', title: 'Analyse chimique', type: 'table', required: true },
        { id: 'recommendations', title: 'Recommandations', type: 'text', required: true }
      ]
    },
    {
      id: 'satellite-report',
      name: 'Rapport d\'Imagerie Satellite',
      description: 'Indices de végétation et analyse temporelle par satellite',
      type: 'satellite_report',
      sections: [
        { id: 'indices', title: 'Indices de végétation', type: 'chart', required: true },
        { id: 'timeseries', title: 'Évolution temporelle', type: 'chart', required: true },
        { id: 'analysis', title: 'Analyse', type: 'text', required: true }
      ]
    }
  ];

  useEffect(() => {
    setTemplates(defaultTemplates);
    fetchReports();
  }, [parcelId]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('parcel_reports')
        .select('*')
        .eq('parcel_id', parcelId)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const generateReport = async (templateId: string) => {
    setGenerating(templateId);
    setError(null);

    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // Call backend to generate report
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-parcel-report', {
        body: {
          parcel_id: parcelId,
          template_id: templateId,
          parcel_data: parcelData
        }
      });

      if (error) throw error;

      // If edge function doesn't exist, create a placeholder record
      if (!data) {
        const { error: insertError } = await supabase
          .from('parcel_reports')
          .insert({
            parcel_id: parcelId,
            template_id: templateId,
            title: `${template.name} - ${parcelName}`,
            generated_by: user.id,
            status: 'completed',
            metadata: { template, parcel: parcelData }
          });

        if (insertError) throw insertError;
      }

      await fetchReports();
      setShowTemplateSelector(false);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report?.file_url) {
        // Generate PDF client-side if no file exists
        alert('Le téléchargement PDF sera disponible prochainement');
        return;
      }

      // Download from storage
      const { data, error } = await supabase.storage
        .from('reports')
        .download(report.file_url);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading report:', err);
      alert('Erreur lors du téléchargement du rapport');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Complété';
      case 'pending':
        return 'En cours';
      case 'failed':
        return 'Échec';
      default:
        return 'Inconnu';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Rapports de Parcelle
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Générez et téléchargez des rapports personnalisés
          </p>
        </div>
        <button
          onClick={() => setShowTemplateSelector(!showTemplateSelector)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Rapport</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Template Selector */}
      {showTemplateSelector && (
        <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
          <h5 className="font-medium text-gray-900 dark:text-white mb-3">
            Sélectionnez un modèle de rapport
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => generateReport(template.id)}
                disabled={generating === template.id}
                className="text-left p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start justify-between mb-2">
                  <h6 className="font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </h6>
                  {generating === template.id && (
                    <Loader className="w-4 h-4 animate-spin text-green-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {template.description}
                </p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  {template.sections.length} sections
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-3">
        <h5 className="font-medium text-gray-900 dark:text-white">
          Rapports générés ({reports.length})
        </h5>

        {reports.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Aucun rapport généré pour cette parcelle
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Cliquez sur "Nouveau Rapport" pour commencer
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-500 transition-colors"
              >
                <div className="flex items-start space-x-3 flex-1">
                  {getStatusIcon(report.status)}
                  <div className="flex-1 min-w-0">
                    <h6 className="font-medium text-gray-900 dark:text-white truncate">
                      {report.title}
                    </h6>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(report.generated_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>{getStatusText(report.status)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {report.status === 'completed' && (
                  <button
                    onClick={() => downloadReport(report.id)}
                    className="ml-4 p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="Télécharger le rapport"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParcelReportGenerator;