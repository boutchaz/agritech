import { Injectable } from '@nestjs/common';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DatabaseService } from '../../database/database.service';

export interface PdfLineItem {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  amount: number;
}

export interface PdfTotal {
  label: string;
  value: number;
  bold?: boolean;
}

export interface DocumentPdfInput {
  title: string;
  documentNumber: string;
  documentDate?: string;
  organizationName?: string;
  partyName?: string;
  partyEmail?: string;
  partyPhone?: string;
  meta?: Array<{ label: string; value: string }>;
  items: PdfLineItem[];
  totals: PdfTotal[];
  currency?: string;
  notes?: string;
}

@Injectable()
export class DocumentPdfService {
  constructor(private readonly databaseService: DatabaseService) {}

  async resolveOrgName(organizationId: string): Promise<string | undefined> {
    const supabase = this.databaseService.getAdminClient();
    const { data } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .maybeSingle();
    return data?.name;
  }

  build(input: DocumentPdfInput): Buffer {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const cur = input.currency ?? 'MAD';
    const fmt = (n: number) => `${n.toFixed(2)} ${cur}`;

    // Header — org left, doc right
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(input.organizationName ?? 'AgroGina', 14, 18);

    pdf.setFontSize(18);
    pdf.text(input.title.toUpperCase(), pageWidth - 14, 18, { align: 'right' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`# ${input.documentNumber}`, pageWidth - 14, 25, {
      align: 'right',
    });
    if (input.documentDate) {
      pdf.text(input.documentDate, pageWidth - 14, 30, { align: 'right' });
    }

    // Party block
    let y = 42;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bill To', 14, y);
    pdf.setFont('helvetica', 'normal');
    y += 5;
    if (input.partyName) {
      pdf.text(input.partyName, 14, y);
      y += 5;
    }
    if (input.partyEmail) {
      pdf.text(input.partyEmail, 14, y);
      y += 5;
    }
    if (input.partyPhone) {
      pdf.text(input.partyPhone, 14, y);
      y += 5;
    }

    // Meta (right column)
    if (input.meta?.length) {
      let metaY = 42;
      input.meta.forEach((m) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${m.label}:`, pageWidth - 60, metaY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(m.value, pageWidth - 14, metaY, { align: 'right' });
        metaY += 5;
      });
      y = Math.max(y, metaY);
    }

    y += 4;

    // Items table
    autoTable(pdf, {
      startY: y,
      head: [['#', 'Description', 'Qty', 'Unit Price', 'Amount']],
      body: input.items.map((it, i) => [
        String(i + 1),
        [it.description, it.unit ? `(${it.unit})` : ''].filter(Boolean).join(' '),
        it.quantity.toString(),
        it.unitPrice != null ? fmt(it.unitPrice) : '',
        fmt(it.amount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 122, 87], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 32, halign: 'right' },
      },
    });

    y = (pdf as any).lastAutoTable.finalY + 6;

    // Totals — right-aligned
    pdf.setFontSize(10);
    input.totals.forEach((t) => {
      pdf.setFont('helvetica', t.bold ? 'bold' : 'normal');
      pdf.text(`${t.label}:`, pageWidth - 60, y);
      pdf.text(fmt(t.value), pageWidth - 14, y, { align: 'right' });
      y += 6;
    });

    if (input.notes) {
      y += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Notes', 14, y);
      pdf.setFont('helvetica', 'normal');
      y += 5;
      const lines = pdf.splitTextToSize(input.notes, pageWidth - 28);
      pdf.text(lines, 14, y);
    }

    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(
        `${input.organizationName ?? 'AgroGina'} — generated ${new Date().toLocaleString()}`,
        14,
        pdf.internal.pageSize.getHeight() - 8,
      );
      pdf.text(
        `Page ${i} / ${pageCount}`,
        pageWidth - 14,
        pdf.internal.pageSize.getHeight() - 8,
        { align: 'right' },
      );
    }

    return Buffer.from(pdf.output('arraybuffer'));
  }
}
