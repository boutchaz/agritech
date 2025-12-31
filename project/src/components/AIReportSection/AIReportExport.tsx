import React, { useState } from 'react';
import { Download, FileText, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
import type { AIReportSections } from '../../lib/api/ai-reports';

interface AIReportExportProps {
  sections: AIReportSections;
  parcelName: string;
  generatedAt: string;
  provider: string;
}

export const AIReportExport: React.FC<AIReportExportProps> = ({
  sections,
  parcelName,
  generatedAt,
  provider,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let y = margin;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Rapport IA - Analyse Agricole', margin, y);
      y += 10;

      // Subtitle
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Parcelle: ${parcelName}`, margin, y);
      y += 6;
      doc.text(
        `Généré le: ${new Date(generatedAt).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        margin,
        y
      );
      y += 6;
      doc.text(`Fournisseur: ${provider.toUpperCase()}`, margin, y);
      y += 15;

      // Helper function to add section
      const addSection = (title: string, content: string) => {
        // Check if we need a new page
        if (y > 260) {
          doc.addPage();
          y = margin;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Split content into lines that fit the page width
        const lines = doc.splitTextToSize(content, contentWidth);
        lines.forEach((line: string) => {
          if (y > 280) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 5;
        });
        y += 10;
      };

      // Executive Summary
      addSection('Résumé Exécutif', sections.executiveSummary);

      // Health Assessment
      const healthContent = `Score Global: ${sections.healthAssessment.overallScore}/100
Sol: ${sections.healthAssessment.soilHealth}
Végétation: ${sections.healthAssessment.vegetationHealth}
Eau: ${sections.healthAssessment.waterStatus}`;
      addSection('Évaluation de Santé', healthContent);

      // Risk Alerts
      if (sections.riskAlerts && sections.riskAlerts.length > 0) {
        const alertsContent = sections.riskAlerts
          .map(
            (alert, i) =>
              `${i + 1}. [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.description}`
          )
          .join('\n\n');
        addSection('Alertes', alertsContent);
      }

      // Recommendations
      if (sections.recommendations && sections.recommendations.length > 0) {
        const recsContent = sections.recommendations
          .map(
            (rec, i) =>
              `${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}\n${rec.description}${
                rec.timing ? `\nDélai: ${rec.timing}` : ''
              }`
          )
          .join('\n\n');
        addSection('Recommandations', recsContent);
      }

      // Action Items
      if (sections.actionItems && sections.actionItems.length > 0) {
        const actionsContent = sections.actionItems
          .sort((a, b) => a.priority - b.priority)
          .map(
            (item) =>
              `${item.priority}. ${item.action}${
                item.deadline ? ` (Échéance: ${item.deadline})` : ''
              } - Impact: ${item.estimatedImpact}`
          )
          .join('\n\n');
        addSection('Actions à Entreprendre', actionsContent);
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Page ${i} sur ${totalPages} - Rapport généré par AgriTech IA`,
          margin,
          290
        );
      }

      // Save
      const fileName = `rapport-ia-${parcelName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Erreur lors de l\'export du rapport');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={exportToPDF}
      disabled={isExporting}
      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          <span>Export en cours...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>Exporter PDF</span>
        </>
      )}
    </button>
  );
};

export default AIReportExport;
