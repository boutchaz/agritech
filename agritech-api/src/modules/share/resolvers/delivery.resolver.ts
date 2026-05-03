import { Injectable } from '@nestjs/common';
import { BaseShareableResolver } from './base';
import type {
  ShareablePdf,
  ShareableResource,
  ShareableResourceType,
} from '../types';

@Injectable()
export class DeliveryShareableResolver extends BaseShareableResolver {
  readonly type: ShareableResourceType = 'delivery';

  async resolve(id: string, organizationId: string) {
    const supabase = this.databaseService.getAdminClient();
    const { data } = await supabase
      .from('deliveries')
      .select(
        'id, organization_id, delivery_note_number, customer_name, customer_contact, customer_email, delivery_date, total_amount, currency',
      )
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!data) return null;

    return {
      id: data.id,
      organizationId: data.organization_id,
      documentNumber: data.delivery_note_number ?? data.id,
      partyName: data.customer_name,
      partyEmail: data.customer_email ?? undefined,
      partyPhone: data.customer_contact ?? undefined,
      amount: data.total_amount != null ? Number(data.total_amount) : undefined,
      currency: data.currency ?? 'MAD',
      documentDate: data.delivery_date,
    } satisfies ShareableResource;
  }

  buildSubject(r: ShareableResource): string {
    return `Delivery Note ${r.documentNumber}`;
  }

  buildBody(r: ShareableResource): string {
    return [
      `Hello ${r.partyName ?? ''},`.trim(),
      ``,
      `Please find delivery note ${r.documentNumber} dated ${r.documentDate ?? ''}${r.amount != null ? ` (${this.formatAmount(r)})` : ''}.`,
    ].join('\n');
  }

  async getPdf(r: ShareableResource): Promise<ShareablePdf | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data: items } = await supabase
      .from('delivery_items')
      .select('quantity, unit, price_per_unit, total_amount, quality_grade, notes')
      .eq('delivery_id', r.id);

    const { data: delivery } = await supabase
      .from('deliveries')
      .select(
        'delivery_address, payment_status, payment_method, vehicle_info, total_amount, notes',
      )
      .eq('id', r.id)
      .maybeSingle();

    const orgName = await this.pdfService.resolveOrgName(r.organizationId);

    const meta: Array<{ label: string; value: string }> = [];
    if (delivery?.payment_status)
      meta.push({ label: 'Payment', value: delivery.payment_status });
    if (delivery?.vehicle_info)
      meta.push({ label: 'Vehicle', value: delivery.vehicle_info });

    const buffer = this.pdfService.build({
      title: 'Delivery Note',
      documentNumber: r.documentNumber,
      documentDate: r.documentDate,
      organizationName: orgName,
      partyName: r.partyName,
      partyEmail: r.partyEmail,
      partyPhone: r.partyPhone,
      currency: r.currency,
      meta,
      items: (items ?? []).map((it: any) => ({
        description: [it.quality_grade ? `Grade ${it.quality_grade}` : '', it.notes ?? '']
          .filter(Boolean)
          .join(' — ') || 'Item',
        quantity: Number(it.quantity),
        unit: it.unit ?? undefined,
        unitPrice: Number(it.price_per_unit ?? 0),
        amount: Number(it.total_amount ?? Number(it.quantity) * Number(it.price_per_unit ?? 0)),
      })),
      totals: [
        {
          label: 'Total',
          value: Number(delivery?.total_amount ?? r.amount ?? 0),
          bold: true,
        },
      ],
      notes: [delivery?.delivery_address, delivery?.notes]
        .filter(Boolean)
        .join('\n\n') || undefined,
    });

    return { buffer, filename: `delivery-${r.documentNumber}.pdf` };
  }
}
