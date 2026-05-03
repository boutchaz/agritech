import { Injectable } from '@nestjs/common';
import { BaseShareableResolver } from './base';
import type {
  ShareablePdf,
  ShareableResource,
  ShareableResourceType,
} from '../types';

@Injectable()
export class PurchaseOrderShareableResolver extends BaseShareableResolver {
  readonly type: ShareableResourceType = 'purchase_order';

  async resolve(id: string, organizationId: string) {
    const supabase = this.databaseService.getAdminClient();
    const { data } = await supabase
      .from('purchase_orders')
      .select(
        'id, organization_id, order_number, supplier_id, supplier_name, supplier_contact, order_date, total_amount',
      )
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!data) return null;

    const party = data.supplier_id
      ? await this.loadParty('supplier', data.supplier_id)
      : {};

    return {
      id: data.id,
      organizationId: data.organization_id,
      documentNumber: data.order_number,
      partyName: data.supplier_name ?? party.name,
      partyEmail: party.email,
      partyPhone: party.phone,
      amount: data.total_amount != null ? Number(data.total_amount) : undefined,
      currency: 'MAD',
      documentDate: data.order_date,
    } satisfies ShareableResource;
  }

  buildSubject(r: ShareableResource): string {
    return `Purchase Order ${r.documentNumber}`;
  }

  buildBody(r: ShareableResource): string {
    return [
      `Hello ${r.partyName ?? ''},`.trim(),
      ``,
      `Please find our purchase order ${r.documentNumber}${r.amount != null ? ` for ${this.formatAmount(r)}` : ''} dated ${r.documentDate ?? ''}.`,
    ].join('\n');
  }

  async getPdf(r: ShareableResource): Promise<ShareablePdf | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data: items } = await supabase
      .from('purchase_order_items')
      .select(
        'line_number, item_name, description, quantity, unit_of_measure, unit_price, line_total',
      )
      .eq('purchase_order_id', r.id)
      .order('line_number', { ascending: true });

    const { data: po } = await supabase
      .from('purchase_orders')
      .select(
        'subtotal, tax_amount, total_amount, expected_delivery_date, terms_and_conditions, notes',
      )
      .eq('id', r.id)
      .maybeSingle();

    const orgName = await this.pdfService.resolveOrgName(r.organizationId);

    const buffer = this.pdfService.build({
      title: 'Purchase Order',
      documentNumber: r.documentNumber,
      documentDate: r.documentDate,
      organizationName: orgName,
      partyName: r.partyName,
      partyEmail: r.partyEmail,
      partyPhone: r.partyPhone,
      currency: r.currency,
      meta: po?.expected_delivery_date
        ? [{ label: 'Delivery', value: po.expected_delivery_date }]
        : [],
      items: (items ?? []).map((it: any) => ({
        description: it.item_name + (it.description ? ` — ${it.description}` : ''),
        quantity: Number(it.quantity),
        unit: it.unit_of_measure ?? undefined,
        unitPrice: Number(it.unit_price),
        amount: Number(it.line_total),
      })),
      totals: [
        { label: 'Subtotal', value: Number(po?.subtotal ?? 0) },
        { label: 'Tax', value: Number(po?.tax_amount ?? 0) },
        {
          label: 'Total',
          value: Number(po?.total_amount ?? r.amount ?? 0),
          bold: true,
        },
      ],
      notes:
        [po?.notes, po?.terms_and_conditions].filter(Boolean).join('\n\n') ||
        undefined,
    });

    return { buffer, filename: `purchase-order-${r.documentNumber}.pdf` };
  }
}
