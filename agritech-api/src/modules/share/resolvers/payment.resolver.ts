import { Injectable } from '@nestjs/common';
import { BaseShareableResolver } from './base';
import type {
  ShareablePdf,
  ShareableResource,
  ShareableResourceType,
} from '../types';

@Injectable()
export class PaymentShareableResolver extends BaseShareableResolver {
  readonly type: ShareableResourceType = 'payment';

  async resolve(id: string, organizationId: string) {
    const supabase = this.databaseService.getAdminClient();
    const { data } = await supabase
      .from('accounting_payments')
      .select(
        'id, organization_id, payment_number, party_id, party_type, party_name, payment_date, amount, currency_code',
      )
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!data) return null;

    const partyType =
      data.party_type === 'customer' || data.party_type === 'supplier'
        ? (data.party_type as 'customer' | 'supplier')
        : null;
    const party = await this.loadParty(partyType, data.party_id);

    return {
      id: data.id,
      organizationId: data.organization_id,
      documentNumber: data.payment_number,
      partyName: data.party_name ?? party.name,
      partyEmail: party.email,
      partyPhone: party.phone,
      amount: Number(data.amount),
      currency: data.currency_code ?? 'MAD',
      documentDate: data.payment_date,
    } satisfies ShareableResource;
  }

  buildSubject(r: ShareableResource): string {
    return `Payment Receipt ${r.documentNumber}`;
  }

  buildBody(r: ShareableResource): string {
    return [
      `Hello ${r.partyName ?? ''},`.trim(),
      ``,
      `Please find payment receipt ${r.documentNumber} for ${this.formatAmount(r)} dated ${r.documentDate ?? ''}.`,
    ].join('\n');
  }

  async getPdf(r: ShareableResource): Promise<ShareablePdf | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data: payment } = await supabase
      .from('accounting_payments')
      .select('payment_type, payment_method, reference_number, remarks')
      .eq('id', r.id)
      .maybeSingle();

    const orgName = await this.pdfService.resolveOrgName(r.organizationId);

    const meta: Array<{ label: string; value: string }> = [];
    if (payment?.payment_method)
      meta.push({ label: 'Method', value: payment.payment_method });
    if (payment?.payment_type)
      meta.push({ label: 'Type', value: payment.payment_type });
    if (payment?.reference_number)
      meta.push({ label: 'Reference', value: payment.reference_number });

    const buffer = this.pdfService.build({
      title: 'Payment Receipt',
      documentNumber: r.documentNumber,
      documentDate: r.documentDate,
      organizationName: orgName,
      partyName: r.partyName,
      partyEmail: r.partyEmail,
      partyPhone: r.partyPhone,
      currency: r.currency,
      meta,
      items: [
        {
          description: `Payment from ${r.partyName ?? 'party'}`,
          quantity: 1,
          amount: Number(r.amount ?? 0),
        },
      ],
      totals: [
        { label: 'Total Paid', value: Number(r.amount ?? 0), bold: true },
      ],
      notes: payment?.remarks ?? undefined,
    });

    return { buffer, filename: `payment-${r.documentNumber}.pdf` };
  }
}
