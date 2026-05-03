import { Injectable } from '@nestjs/common';
import { BaseShareableResolver } from './base';
import type {
  ShareablePdf,
  ShareableResource,
  ShareableResourceType,
} from '../types';

@Injectable()
export class SalesOrderShareableResolver extends BaseShareableResolver {
  readonly type: ShareableResourceType = 'sales_order';

  async resolve(id: string, organizationId: string) {
    const supabase = this.databaseService.getAdminClient();
    const { data } = await supabase
      .from('sales_orders')
      .select(
        'id, organization_id, order_number, customer_id, customer_name, customer_contact, order_date, total_amount',
      )
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!data) return null;

    const party = data.customer_id
      ? await this.loadParty('customer', data.customer_id)
      : {};

    return {
      id: data.id,
      organizationId: data.organization_id,
      documentNumber: data.order_number,
      partyName: data.customer_name,
      partyEmail: party.email,
      partyPhone: party.phone,
      amount: data.total_amount != null ? Number(data.total_amount) : undefined,
      currency: 'MAD',
      documentDate: data.order_date,
    } satisfies ShareableResource;
  }

  buildSubject(r: ShareableResource): string {
    return `Sales Order ${r.documentNumber}`;
  }

  buildBody(r: ShareableResource): string {
    return [
      `Hello ${r.partyName ?? ''},`.trim(),
      ``,
      `Please find sales order ${r.documentNumber}${r.amount != null ? ` for ${this.formatAmount(r)}` : ''} dated ${r.documentDate ?? ''}.`,
    ].join('\n');
  }

  async getPdf(r: ShareableResource): Promise<ShareablePdf | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data: items } = await supabase
      .from('sales_order_items')
      .select(
        'line_number, item_name, description, quantity, unit_of_measure, unit_price, line_total',
      )
      .eq('sales_order_id', r.id)
      .order('line_number', { ascending: true });

    const { data: order } = await supabase
      .from('sales_orders')
      .select(
        'subtotal, tax_amount, total_amount, expected_delivery_date, terms_and_conditions, notes',
      )
      .eq('id', r.id)
      .maybeSingle();

    const orgName = await this.pdfService.resolveOrgName(r.organizationId);

    const buffer = this.pdfService.build({
      title: 'Sales Order',
      documentNumber: r.documentNumber,
      documentDate: r.documentDate,
      organizationName: orgName,
      partyName: r.partyName,
      partyEmail: r.partyEmail,
      partyPhone: r.partyPhone,
      currency: r.currency,
      meta: order?.expected_delivery_date
        ? [{ label: 'Delivery', value: order.expected_delivery_date }]
        : [],
      items: (items ?? []).map((it: any) => ({
        description: it.item_name + (it.description ? ` — ${it.description}` : ''),
        quantity: Number(it.quantity),
        unit: it.unit_of_measure ?? undefined,
        unitPrice: Number(it.unit_price),
        amount: Number(it.line_total),
      })),
      totals: [
        { label: 'Subtotal', value: Number(order?.subtotal ?? 0) },
        { label: 'Tax', value: Number(order?.tax_amount ?? 0) },
        {
          label: 'Total',
          value: Number(order?.total_amount ?? r.amount ?? 0),
          bold: true,
        },
      ],
      notes:
        [order?.notes, order?.terms_and_conditions].filter(Boolean).join('\n\n') ||
        undefined,
    });

    return { buffer, filename: `sales-order-${r.documentNumber}.pdf` };
  }
}
