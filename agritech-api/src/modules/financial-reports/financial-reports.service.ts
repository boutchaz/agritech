import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface AgedInvoice {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  party_id: string;
  party_name: string;
  grand_total: number;
  outstanding_amount: number;
  days_overdue: number;
  age_bucket: 'current' | '1-30' | '31-60' | '61-90' | 'over-90';
}

export interface AgedReport {
  as_of_date: string;
  invoices: AgedInvoice[];
  summary: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
    total: number;
  };
  by_party: Array<{
    party_id: string;
    party_name: string;
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
    total: number;
  }>;
}

@Injectable()
export class AgedReportsService {
  private readonly logger = new Logger(AgedReportsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async getAgedReceivables(organizationId: string, asOfDate?: string): Promise<AgedReport> {
    const supabase = this.databaseService.getAdminClient();
    const reportDate = asOfDate || new Date().toISOString().split('T')[0];

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('invoice_type', 'sales')
      .in('status', ['submitted', 'partially_paid', 'overdue'])
      .gt('outstanding_amount', 0)
      .lte('invoice_date', reportDate)
      .order('due_date', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch aged receivables: ${error.message}`);
      throw error;
    }

    return this.processAgedReport(invoices || [], reportDate);
  }

  async getAgedPayables(organizationId: string, asOfDate?: string): Promise<AgedReport> {
    const supabase = this.databaseService.getAdminClient();
    const reportDate = asOfDate || new Date().toISOString().split('T')[0];

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('invoice_type', 'purchase')
      .in('status', ['submitted', 'partially_paid', 'overdue'])
      .gt('outstanding_amount', 0)
      .lte('invoice_date', reportDate)
      .order('due_date', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch aged payables: ${error.message}`);
      throw error;
    }

    return this.processAgedReport(invoices || [], reportDate);
  }

  private processAgedReport(invoices: any[], asOfDate: string): AgedReport {
    const reportDate = new Date(asOfDate);
    
    const agedInvoices: AgedInvoice[] = invoices.map((inv) => {
      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.max(0, Math.floor((reportDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      let ageBucket: AgedInvoice['age_bucket'] = 'current';
      if (daysOverdue > 90) ageBucket = 'over-90';
      else if (daysOverdue > 60) ageBucket = '61-90';
      else if (daysOverdue > 30) ageBucket = '31-60';
      else if (daysOverdue > 0) ageBucket = '1-30';

      return {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        party_id: inv.party_id,
        party_name: inv.party_name,
        grand_total: Number(inv.grand_total) || 0,
        outstanding_amount: Number(inv.outstanding_amount) || 0,
        days_overdue: daysOverdue,
        age_bucket: ageBucket,
      };
    });

    const summary = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      over_90: 0,
      total: 0,
    };

    const partyMap = new Map<string, typeof summary & { party_id: string; party_name: string }>();

    agedInvoices.forEach((inv) => {
      const amount = inv.outstanding_amount;
      summary.total += amount;

      switch (inv.age_bucket) {
        case 'current':
          summary.current += amount;
          break;
        case '1-30':
          summary.days_1_30 += amount;
          break;
        case '31-60':
          summary.days_31_60 += amount;
          break;
        case '61-90':
          summary.days_61_90 += amount;
          break;
        case 'over-90':
          summary.over_90 += amount;
          break;
      }

      if (!partyMap.has(inv.party_id)) {
        partyMap.set(inv.party_id, {
          party_id: inv.party_id,
          party_name: inv.party_name,
          current: 0,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          over_90: 0,
          total: 0,
        });
      }

      const partyData = partyMap.get(inv.party_id)!;
      partyData.total += amount;

      switch (inv.age_bucket) {
        case 'current':
          partyData.current += amount;
          break;
        case '1-30':
          partyData.days_1_30 += amount;
          break;
        case '31-60':
          partyData.days_31_60 += amount;
          break;
        case '61-90':
          partyData.days_61_90 += amount;
          break;
        case 'over-90':
          partyData.over_90 += amount;
          break;
      }
    });

    return {
      as_of_date: asOfDate,
      invoices: agedInvoices,
      summary,
      by_party: Array.from(partyMap.values()).sort((a, b) => b.total - a.total),
    };
  }
}
