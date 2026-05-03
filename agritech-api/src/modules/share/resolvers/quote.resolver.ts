import { Injectable } from '@nestjs/common';
import { BaseShareableResolver } from './base';
import type {
  ShareablePdf,
  ShareableResource,
  ShareableResourceType,
} from '../types';

@Injectable()
export class QuoteShareableResolver extends BaseShareableResolver {
  readonly type: ShareableResourceType = 'quote';

  async resolve(id: string, organizationId: string) {
    const supabase = this.databaseService.getAdminClient();
    const { data } = await supabase
      .from('quotes')
      .select(
        'id, organization_id, quote_number, customer_id, customer_name, contact_email, contact_phone, quote_date, valid_until, grand_total, currency_code',
      )
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!data) return null;

    let email = data.contact_email ?? undefined;
    let phone = data.contact_phone ?? undefined;
    if ((!email || !phone) && data.customer_id) {
      const party = await this.loadParty('customer', data.customer_id);
      email = email ?? party.email;
      phone = phone ?? party.phone;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      documentNumber: data.quote_number,
      partyName: data.customer_name,
      partyEmail: email,
      partyPhone: phone,
      amount: Number(data.grand_total),
      currency: data.currency_code ?? 'MAD',
      documentDate: data.quote_date,
      extra: { valid_until: data.valid_until },
    } satisfies ShareableResource;
  }

  buildSubject(r: ShareableResource): string {
    return `Quote ${r.documentNumber}`;
  }

  buildBody(r: ShareableResource): string {
    const validUntil = (r.extra?.valid_until as string | undefined) ?? '';
    return [
      `Hello ${r.partyName ?? ''},`.trim(),
      ``,
      `Please find quote ${r.documentNumber} for ${this.formatAmount(r)}${validUntil ? `, valid until ${validUntil}` : ''}.`,
      ``,
      `We remain at your disposal for any questions.`,
    ].join('\n');
  }

  async getPdf(r: ShareableResource): Promise<ShareablePdf | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data: items } = await supabase
      .from('quote_items')
      .select(
        'line_number, item_name, description, quantity, unit_of_measure, unit_price, line_total',
      )
      .eq('quote_id', r.id)
      .order('line_number', { ascending: true });

    const { data: quote } = await supabase
      .from('quotes')
      .select(
        'subtotal, tax_total, discount_amount, grand_total, valid_until, terms_and_conditions, notes',
      )
      .eq('id', r.id)
      .maybeSingle();

    const orgName = await this.pdfService.resolveOrgName(r.organizationId);

    const buffer = this.pdfService.build({
      title: 'Quote',
      documentNumber: r.documentNumber,
      documentDate: r.documentDate,
      organizationName: orgName,
      partyName: r.partyName,
      partyEmail: r.partyEmail,
      partyPhone: r.partyPhone,
      currency: r.currency,
      meta: quote?.valid_until
        ? [{ label: 'Valid until', value: quote.valid_until }]
        : [],
      items: (items ?? []).map((it: any) => ({
        description: it.item_name + (it.description ? ` — ${it.description}` : ''),
        quantity: Number(it.quantity),
        unit: it.unit_of_measure ?? undefined,
        unitPrice: Number(it.unit_price),
        amount: Number(it.line_total),
      })),
      totals: [
        { label: 'Subtotal', value: Number(quote?.subtotal ?? 0) },
        ...(Number(quote?.discount_amount ?? 0) > 0
          ? [{ label: 'Discount', value: -Number(quote?.discount_amount) }]
          : []),
        { label: 'Tax', value: Number(quote?.tax_total ?? 0) },
        {
          label: 'Total',
          value: Number(quote?.grand_total ?? r.amount ?? 0),
          bold: true,
        },
      ],
      notes:
        [quote?.notes, quote?.terms_and_conditions].filter(Boolean).join('\n\n') ||
        undefined,
    });

    return { buffer, filename: `quote-${r.documentNumber}.pdf` };
  }
}
