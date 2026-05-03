import { Injectable } from '@nestjs/common';
import { BaseShareableResolver } from './base';
import type {
  ShareablePdf,
  ShareableResource,
  ShareableResourceType,
} from '../types';

@Injectable()
export class InvoiceShareableResolver extends BaseShareableResolver {
  readonly type: ShareableResourceType = 'invoice';

  async resolve(id: string, organizationId: string) {
    const supabase = this.databaseService.getAdminClient();
    const { data } = await supabase
      .from('invoices')
      .select(
        'id, organization_id, invoice_number, party_id, party_type, party_name, invoice_date, grand_total, currency_code',
      )
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!data) return null;

    const party = await this.loadParty(data.party_type, data.party_id);

    return {
      id: data.id,
      organizationId: data.organization_id,
      documentNumber: data.invoice_number,
      partyName: data.party_name ?? party.name,
      partyEmail: party.email,
      partyPhone: party.phone,
      amount: Number(data.grand_total),
      currency: data.currency_code ?? 'MAD',
      documentDate: data.invoice_date,
    } satisfies ShareableResource;
  }

  buildSubject(r: ShareableResource): string {
    return `Invoice ${r.documentNumber}`;
  }

  buildBody(r: ShareableResource): string {
    return [
      `Hello ${r.partyName ?? ''},`.trim(),
      ``,
      `Please find invoice ${r.documentNumber} for ${this.formatAmount(r)} dated ${r.documentDate ?? ''}.`,
      ``,
      `Thank you.`,
    ].join('\n');
  }

  async getPdf(r: ShareableResource): Promise<ShareablePdf | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data: items } = await supabase
      .from('invoice_items')
      .select(
        'line_number, item_name, description, quantity, unit_of_measure, unit_price, line_total',
      )
      .eq('invoice_id', r.id)
      .order('line_number', { ascending: true });

    const { data: invoice } = await supabase
      .from('invoices')
      .select('subtotal, tax_total, discount_amount, grand_total, due_date, notes')
      .eq('id', r.id)
      .maybeSingle();

    const orgName = await this.pdfService.resolveOrgName(r.organizationId);

    const buffer = this.pdfService.build({
      title: 'Invoice',
      documentNumber: r.documentNumber,
      documentDate: r.documentDate,
      organizationName: orgName,
      partyName: r.partyName,
      partyEmail: r.partyEmail,
      partyPhone: r.partyPhone,
      currency: r.currency,
      meta: invoice?.due_date
        ? [{ label: 'Due', value: invoice.due_date }]
        : [],
      items: (items ?? []).map((it: any) => ({
        description: it.item_name + (it.description ? ` — ${it.description}` : ''),
        quantity: Number(it.quantity),
        unit: it.unit_of_measure ?? undefined,
        unitPrice: Number(it.unit_price),
        amount: Number(it.line_total),
      })),
      totals: [
        { label: 'Subtotal', value: Number(invoice?.subtotal ?? 0) },
        ...(Number(invoice?.discount_amount ?? 0) > 0
          ? [{ label: 'Discount', value: -Number(invoice?.discount_amount) }]
          : []),
        { label: 'Tax', value: Number(invoice?.tax_total ?? 0) },
        {
          label: 'Total',
          value: Number(invoice?.grand_total ?? r.amount ?? 0),
          bold: true,
        },
      ],
      notes: invoice?.notes ?? undefined,
    });

    return { buffer, filename: `invoice-${r.documentNumber}.pdf` };
  }
}
