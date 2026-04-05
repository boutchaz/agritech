import {  useState  } from "react";
import { Loader, FileText, FileIcon, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { AIReportSections } from '../../lib/api/ai-reports';
import { Button } from '@/components/ui/button';

interface AIReportExportProps {
  sections: AIReportSections | null | undefined;
  parcelName: string;
  generatedAt: string;
  provider: string;
  onPreview?: () => void;
}

export const AIReportExport = ({
  sections,
  parcelName,
  generatedAt,
  provider,
  onPreview,
}: AIReportExportProps) => {
  const { t } = useTranslation();
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingDOCX, setIsExportingDOCX] = useState(false);

  const validateSections = (): boolean => {
    if (!sections || !sections.executiveSummary || !sections.healthAssessment) {
      toast.error(t('aiReports.export.noContent', 'Aucun contenu de rapport disponible'));
      return false;
    }
    return true;
  };

  const formattedDate = new Date(generatedAt || new Date()).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const exportToPDF = async () => {
    if (!validateSections()) return;
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let y = margin;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(t('aiReports.export.title', 'Rapport IA - Analyse Agricole'), margin, y);
      y += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${t('aiReports.export.parcel', 'Parcelle')}: ${parcelName}`, margin, y);
      y += 6;
      doc.text(`${t('aiReports.export.generatedAt', 'Généré le')}: ${formattedDate}`, margin, y);
      y += 6;
      doc.text(`${t('aiReports.export.provider', 'Fournisseur')}: ${provider.toUpperCase()}`, margin, y);
      y += 15;

      const addSection = (title: string, content: string) => {
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

      addSection(t('aiReports.sections.executiveSummary', 'Résumé Exécutif'), sections.executiveSummary);

      const healthContent = `${t('aiReports.sections.overallScore', 'Score Global')}: ${sections.healthAssessment.overallScore}/100
${t('aiReports.sections.soil', 'Sol')}: ${sections.healthAssessment.soilHealth}
${t('aiReports.sections.vegetation', 'Végétation')}: ${sections.healthAssessment.vegetationHealth}
${t('aiReports.sections.water', 'Eau')}: ${sections.healthAssessment.waterStatus}`;
      addSection(t('aiReports.sections.healthAssessment', 'Évaluation de Santé'), healthContent);

      if (sections.riskAlerts && sections.riskAlerts.length > 0) {
        const alertsContent = sections.riskAlerts
          .map((alert, i) => `${i + 1}. [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.description}`)
          .join('\n\n');
        addSection(t('aiReports.sections.alerts', 'Alertes'), alertsContent);
      }

      if (sections.recommendations && sections.recommendations.length > 0) {
        const recsContent = sections.recommendations
          .map((rec, i) => `${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}\n${rec.description}${rec.timing ? `\n${t('aiReports.sections.timing', 'Délai')}: ${rec.timing}` : ''}`)
          .join('\n\n');
        addSection(t('aiReports.sections.recommendations', 'Recommandations'), recsContent);
      }

      if (sections.actionItems && sections.actionItems.length > 0) {
        const actionsContent = sections.actionItems
          .sort((a, b) => a.priority - b.priority)
          .map((item) => `${item.priority}. ${item.action}${item.deadline ? ` (${t('aiReports.sections.deadline', 'Échéance')}: ${item.deadline})` : ''} - ${t('aiReports.sections.impact', 'Impact')}: ${item.estimatedImpact}`)
          .join('\n\n');
        addSection(t('aiReports.sections.actionItems', 'Actions à Entreprendre'), actionsContent);
      }

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`Page ${i} sur ${totalPages} - ${t('aiReports.export.footer', 'Rapport généré par AgriTech IA')}`, margin, 290);
      }

      const fileName = `rapport-ia-${parcelName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success(t('aiReports.export.successPDF', 'Rapport PDF téléchargé avec succès'));
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(t('aiReports.export.errorPDF', 'Erreur lors de l\'export du rapport PDF'));
    } finally {
      setIsExportingPDF(false);
    }
  };

  const exportToDOCX = async () => {
    if (!validateSections()) return;
    setIsExportingDOCX(true);
    try {
      const docChildren: Paragraph[] = [];

      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: t('aiReports.export.title', 'Rapport IA - Analyse Agricole'), bold: true, size: 48 })],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );

      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `${t('aiReports.export.parcel', 'Parcelle')}: ${parcelName}`, size: 24 })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `${t('aiReports.export.generatedAt', 'Généré le')}: ${formattedDate}`, size: 24 })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `${t('aiReports.export.provider', 'Fournisseur')}: ${provider.toUpperCase()}`, size: 24 })],
          spacing: { after: 400 },
        })
      );

      const addDocxSection = (title: string, content: string) => {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { color: '22c55e', size: 6, style: BorderStyle.SINGLE } },
          })
        );

        content.split('\n').forEach((line) => {
          if (line.trim()) {
            docChildren.push(
              new Paragraph({
                children: [new TextRun({ text: line, size: 22 })],
                spacing: { after: 100 },
              })
            );
          }
        });
      };

      addDocxSection(t('aiReports.sections.executiveSummary', 'Résumé Exécutif'), sections.executiveSummary);

      const healthContent = `${t('aiReports.sections.overallScore', 'Score Global')}: ${sections.healthAssessment.overallScore}/100
${t('aiReports.sections.soil', 'Sol')}: ${sections.healthAssessment.soilHealth}
${t('aiReports.sections.vegetation', 'Végétation')}: ${sections.healthAssessment.vegetationHealth}
${t('aiReports.sections.water', 'Eau')}: ${sections.healthAssessment.waterStatus}`;
      addDocxSection(t('aiReports.sections.healthAssessment', 'Évaluation de Santé'), healthContent);

      if (sections.riskAlerts && sections.riskAlerts.length > 0) {
        const alertsContent = sections.riskAlerts
          .map((alert, i) => `${i + 1}. [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.description}`)
          .join('\n');
        addDocxSection(t('aiReports.sections.alerts', 'Alertes'), alertsContent);
      }

      if (sections.recommendations && sections.recommendations.length > 0) {
        const recsContent = sections.recommendations
          .map((rec, i) => `${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}\n${rec.description}${rec.timing ? `\n${t('aiReports.sections.timing', 'Délai')}: ${rec.timing}` : ''}`)
          .join('\n\n');
        addDocxSection(t('aiReports.sections.recommendations', 'Recommandations'), recsContent);
      }

      if (sections.actionItems && sections.actionItems.length > 0) {
        const actionsContent = sections.actionItems
          .sort((a, b) => a.priority - b.priority)
          .map((item) => `${item.priority}. ${item.action}${item.deadline ? ` (${t('aiReports.sections.deadline', 'Échéance')}: ${item.deadline})` : ''} - ${t('aiReports.sections.impact', 'Impact')}: ${item.estimatedImpact}`)
          .join('\n');
        addDocxSection(t('aiReports.sections.actionItems', 'Actions à Entreprendre'), actionsContent);
      }

      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: t('aiReports.export.footer', 'Rapport généré par AgriTech IA'), italics: true, size: 18 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
        })
      );

      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `rapport-ia-${parcelName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, fileName);
      toast.success(t('aiReports.export.successDOCX', 'Rapport Word téléchargé avec succès'));
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      toast.error(t('aiReports.export.errorDOCX', 'Erreur lors de l\'export du rapport DOCX'));
    } finally {
      setIsExportingDOCX(false);
    }
  };

  const isExporting = isExportingPDF || isExportingDOCX;
  const hasContent = sections && sections.executiveSummary && sections.healthAssessment;

  return (
    <div className="flex items-center gap-2">
      {onPreview && (
        <Button variant="green" onClick={onPreview} disabled={!hasContent} className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed" title={t('aiReports.export.preview', 'Aperçu complet')} >
          <Eye className="w-4 h-4" />
          <span>{t('aiReports.export.previewButton', 'Aperçu')}</span>
        </Button>
      )}

      <Button variant="red" onClick={exportToPDF} disabled={isExporting || !hasContent} className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed" title={t('aiReports.export.exportPDF', 'Exporter en PDF')} >
        {isExportingPDF ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>{t('aiReports.export.exporting', 'Export...')}</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </>
        )}
      </Button>

      <Button variant="blue" onClick={exportToDOCX} disabled={isExporting || !hasContent} className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed" title={t('aiReports.export.exportDOCX', 'Exporter en Word')} >
        {isExportingDOCX ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>{t('aiReports.export.exporting', 'Export...')}</span>
          </>
        ) : (
          <>
            <FileIcon className="w-4 h-4" />
            <span>DOCX</span>
          </>
        )}
      </Button>
    </div>
  );
};

export default AIReportExport;
