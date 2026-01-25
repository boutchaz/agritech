import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ComplianceService } from './compliance.service';

interface ComplianceRequirement {
  id: string;
  certification_type: string;
  requirement_code: string;
  requirement_description: string;
  category: string;
  is_critical: boolean;
}

interface ComplianceCheck {
  id: string;
  check_type: string;
  check_date: string;
  status: string;
  score: number | null;
  auditor_name: string | null;
  findings: Array<{ description: string; severity: string }>;
  corrective_actions: Array<{ action: string; status: string }>;
}

interface Certification {
  id: string;
  certification_type: string;
  certification_number: string;
  issued_date: string;
  expiry_date: string;
  status: string;
  issuing_body: string;
  scope: string;
  organization_id: string;
}

@Injectable()
export class ComplianceReportsService {
  private readonly logger = new Logger(ComplianceReportsService.name);

  constructor(private complianceService: ComplianceService) {}

  /**
   * Generate GlobalGAP compliance PDF report
   */
  async generateGlobalGAPReport(
    certificationId: string,
    organizationId: string,
  ): Promise<Buffer> {
    try {
      // Fetch certification details
      const certification = (await this.complianceService.findOneCertification(
        organizationId,
        certificationId,
      )) as Certification;

      if (!certification) {
        throw new NotFoundException('Certification not found');
      }

      // Verify it's a GlobalGAP certification
      if (certification.certification_type !== 'GlobalGAP') {
        throw new NotFoundException(
          'Certification is not a GlobalGAP certification',
        );
      }

      // Fetch requirements for GlobalGAP
      const requirements = (await this.complianceService.findRequirements(
        'GlobalGAP',
      )) as ComplianceRequirement[];

      // Fetch compliance checks for this certification
      const allChecks = (await this.complianceService.findAllChecks(
        organizationId,
      )) as ComplianceCheck[];

      const checks = allChecks.filter(
        (check) => (check as any).certification_id === certificationId,
      );

      // Generate PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GLOBALGAP COMPLIANCE REPORT', pageWidth / 2, 20, {
        align: 'center',
      });

      // Organization and Certification Details
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      let yPos = 35;

      pdf.text(`Certification: GlobalGAP #${certification.certification_number}`, 14, yPos);
      yPos += 7;
      pdf.text(`Issuing Body: ${certification.issuing_body}`, 14, yPos);
      yPos += 7;
      pdf.text(
        `Valid: ${new Date(certification.issued_date).toLocaleDateString()} - ${new Date(certification.expiry_date).toLocaleDateString()}`,
        14,
        yPos,
      );
      yPos += 7;
      pdf.text(`Status: ${certification.status.toUpperCase()}`, 14, yPos);
      yPos += 7;
      pdf.text(`Scope: ${certification.scope}`, 14, yPos);
      yPos += 12;

      // Requirements Checklist Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REQUIREMENTS CHECKLIST', 14, yPos);
      yPos += 7;

      // Requirements Table
      const requirementsData = requirements.map((req) => [
        req.requirement_code,
        req.requirement_description,
        req.category,
        req.is_critical ? 'Yes' : 'No',
      ]);

      autoTable(pdf, {
        startY: yPos,
        head: [['Code', 'Description', 'Category', 'Critical']],
        body: requirementsData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 80 },
          2: { cellWidth: 35 },
          3: { cellWidth: 20 },
        },
      });

      yPos = (pdf as any).lastAutoTable.finalY + 12;

      // Compliance Checks Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('COMPLIANCE CHECKS', 14, yPos);
      yPos += 7;

      if (checks.length > 0) {
        const checksData = checks.map((check) => [
          new Date(check.check_date).toLocaleDateString(),
          check.check_type,
          check.auditor_name || 'N/A',
          check.score !== null ? `${check.score}%` : 'N/A',
          check.status,
        ]);

        autoTable(pdf, {
          startY: yPos,
          head: [['Date', 'Type', 'Auditor', 'Score', 'Status']],
          body: checksData,
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 40 },
            2: { cellWidth: 40 },
            3: { cellWidth: 25 },
            4: { cellWidth: 35 },
          },
        });

        yPos = (pdf as any).lastAutoTable.finalY + 12;
      } else {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No compliance checks recorded yet.', 14, yPos);
        yPos += 12;
      }

      // Non-conformities and Corrective Actions
      const nonCompliantChecks = checks.filter(
        (check) => check.status === 'non_compliant',
      );

      if (nonCompliantChecks.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('NON-CONFORMITIES & CORRECTIVE ACTIONS', 14, yPos);
        yPos += 7;

        nonCompliantChecks.forEach((check, index) => {
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(
            `Check #${index + 1} - ${new Date(check.check_date).toLocaleDateString()}`,
            14,
            yPos,
          );
          yPos += 6;

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');

          // Findings
          if (check.findings && check.findings.length > 0) {
            pdf.text('Findings:', 14, yPos);
            yPos += 5;
            check.findings.forEach((finding) => {
              const text = `• ${finding.description} (${finding.severity})`;
              const lines = pdf.splitTextToSize(text, pageWidth - 28);
              pdf.text(lines, 18, yPos);
              yPos += lines.length * 5;
            });
          }

          // Corrective Actions
          if (check.corrective_actions && check.corrective_actions.length > 0) {
            pdf.text('Corrective Actions:', 14, yPos);
            yPos += 5;
            check.corrective_actions.forEach((action) => {
              const text = `• ${action.action} (${action.status})`;
              const lines = pdf.splitTextToSize(text, pageWidth - 28);
              pdf.text(lines, 18, yPos);
              yPos += lines.length * 5;
            });
          }

          yPos += 5;

          // Add new page if needed
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
        });
      }

      // Summary Section
      if (yPos > 240) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SUMMARY', 14, yPos);
      yPos += 7;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');

      // Calculate statistics
      const totalChecks = checks.length;
      const compliantChecks = checks.filter(
        (check) => check.status === 'compliant',
      ).length;
      const nonCompliantCount = checks.filter(
        (check) => check.status === 'non_compliant',
      ).length;

      const checksWithScore = checks.filter((check) => check.score !== null);
      const averageScore =
        checksWithScore.length > 0
          ? checksWithScore.reduce((sum, check) => sum + (check.score || 0), 0) /
            checksWithScore.length
          : 0;

      pdf.text(`Overall Score: ${Math.round(averageScore)}%`, 14, yPos);
      yPos += 6;
      pdf.text(`Total Checks: ${totalChecks}`, 14, yPos);
      yPos += 6;
      pdf.text(`Compliant: ${compliantChecks}`, 14, yPos);
      yPos += 6;
      pdf.text(`Non-compliant: ${nonCompliantCount}`, 14, yPos);
      yPos += 6;
      pdf.text(`Total Requirements: ${requirements.length}`, 14, yPos);
      yPos += 6;
      const criticalRequirements = requirements.filter(
        (req) => req.is_critical,
      ).length;
      pdf.text(`Critical Requirements: ${criticalRequirements}`, 14, yPos);

      // Footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          14,
          pdf.internal.pageSize.getHeight() - 10,
        );
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 30,
          pdf.internal.pageSize.getHeight() - 10,
        );
      }

      // Convert to Buffer
      const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

      this.logger.log(
        `GlobalGAP report generated for certification ${certificationId}`,
      );

      return pdfBuffer;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(`Failed to generate report: ${error.message}`);
      throw new InternalServerErrorException('Failed to generate report');
    }
  }
}
