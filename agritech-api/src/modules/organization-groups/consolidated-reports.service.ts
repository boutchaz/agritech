import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { OrganizationGroupsService } from './organization-groups.service';
import {
  FinancialReportsService,
  ProfitLossReport,
  ProfitLossRow,
  ProfitLossSection,
} from '../journal-entries/financial-reports.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

export interface ConsolidatedProfitLossReport extends ProfitLossReport {
  group_id: string;
  group_name: string;
  group_base_currency: string;
  member_organizations: Array<{
    id: string;
    name: string;
    currency: string;
    rate_used: number;
  }>;
  eliminations: Array<{ account_code: string; amount: number }>;
}

interface ConsolidatedRow extends ProfitLossRow {
  by_org?: Array<{
    organization_id: string;
    organization_name: string;
    amount: number;
  }>;
}

@Injectable()
export class ConsolidatedReportsService {
  private readonly logger = new Logger(ConsolidatedReportsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly groupsService: OrganizationGroupsService,
    private readonly financialReports: FinancialReportsService,
    private readonly exchangeRates: ExchangeRatesService,
  ) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  async getConsolidatedProfitLoss(params: {
    groupId: string;
    userId: string;
    startDate: string;
    endDate: string;
    filters?: {
      basis?: 'accrual' | 'cash';
      include_zero_balances?: boolean;
      include_eliminations?: boolean;
    };
  }): Promise<ConsolidatedProfitLossReport> {
    const { groupId, userId, startDate, endDate, filters } = params;
    const supabase = this.databaseService.getAdminClient();

    // 1. Load group + verify caller is a member of the parent org.
    const { data: group, error: groupErr } = await supabase
      .from('organization_groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle();
    if (groupErr) throw new BadRequestException(groupErr.message);
    if (!group) throw new BadRequestException(`Group not found: ${groupId}`);

    const { data: ou, error: ouErr } = await supabase
      .from('organization_users')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', group.parent_organization_id)
      .eq('is_active', true)
      .maybeSingle();
    if (ouErr) throw new BadRequestException(ouErr.message);
    if (!ou) {
      throw new ForbiddenException('You are not a member of this group\'s parent organization');
    }

    // 2. Load member orgs
    const memberIds = await this.groupsService.getMemberOrgIds(groupId);
    if (memberIds.length === 0) {
      // Empty group: return a zeroed consolidated report
      return this.emptyReport(group, startDate, endDate);
    }

    const { data: orgs, error: orgsErr } = await supabase
      .from('organizations')
      .select('id, name, currency_code')
      .in('id', memberIds);
    if (orgsErr) throw new BadRequestException(orgsErr.message);

    const orgMap = new Map<string, { id: string; name: string; currency: string }>();
    for (const o of orgs || []) {
      orgMap.set(o.id, {
        id: o.id,
        name: o.name,
        currency: ((o.currency_code as string | undefined) || group.base_currency).toUpperCase(),
      });
    }

    // 3. For each member: run per-org P&L + resolve translation rate.
    const groupCcy = (group.base_currency as string).toUpperCase();
    const includeZero = filters?.include_zero_balances === true;
    const basis: 'accrual' | 'cash' = filters?.basis === 'cash' ? 'cash' : 'accrual';

    const memberReports: Array<{
      orgId: string;
      orgName: string;
      currency: string;
      rateUsed: number;
      report: ProfitLossReport;
    }> = [];

    for (const orgId of memberIds) {
      const orgInfo = orgMap.get(orgId);
      if (!orgInfo) continue;

      let rateUsed = 1;
      try {
        rateUsed =
          orgInfo.currency === groupCcy
            ? 1
            : await this.exchangeRates.getRate(
                group.parent_organization_id,
                orgInfo.currency,
                groupCcy,
                endDate,
              );
      } catch (e) {
        throw new BadRequestException(
          `Missing exchange rate for ${orgInfo.currency} -> ${groupCcy} on or before ${endDate} (org: ${orgInfo.name}). ${(e as Error).message}`,
        );
      }

      const pl = await this.financialReports.getProfitLoss(orgId, startDate, endDate, {
        basis,
        include_zero_balances: true, // we filter at the consolidated level
      });

      memberReports.push({
        orgId,
        orgName: orgInfo.name,
        currency: orgInfo.currency,
        rateUsed,
        report: pl,
      });
    }

    // 4. Merge by account_code. Each section keyed by code.
    type MergedRow = ConsolidatedRow & { _key: string };
    const sectionBuckets: Record<ProfitLossSection, Map<string, MergedRow>> = {
      direct_income: new Map(),
      other_income: new Map(),
      cogs: new Map(),
      indirect_expense: new Map(),
      other_expense: new Map(),
    };

    const ensureRow = (
      section: ProfitLossSection,
      row: ProfitLossRow,
    ): MergedRow => {
      const key = row.account_code;
      const bucket = sectionBuckets[section];
      const existing = bucket.get(key);
      if (existing) return existing;
      const fresh: MergedRow = {
        _key: key,
        section,
        account_id: row.account_id,
        account_code: row.account_code,
        account_name: row.account_name,
        account_type: row.account_type,
        account_subtype: row.account_subtype,
        total_debit: 0,
        total_credit: 0,
        balance: 0,
        display_amount: 0,
        by_org: [],
      };
      bucket.set(key, fresh);
      return fresh;
    };

    const sectionFor = (rep: ProfitLossReport): Array<{ section: ProfitLossSection; rows: ProfitLossRow[] }> => [
      { section: 'direct_income', rows: rep.direct_income },
      { section: 'other_income', rows: rep.other_income },
      { section: 'cogs', rows: rep.cogs },
      { section: 'indirect_expense', rows: rep.indirect_expenses },
      { section: 'other_expense', rows: rep.other_expenses },
    ];

    for (const m of memberReports) {
      for (const { section, rows } of sectionFor(m.report)) {
        for (const row of rows) {
          const translated = this.round2(row.display_amount * m.rateUsed);
          const merged = ensureRow(section, row);
          merged.display_amount = this.round2(merged.display_amount + translated);
          merged.total_debit = this.round2(merged.total_debit + row.total_debit * m.rateUsed);
          merged.total_credit = this.round2(merged.total_credit + row.total_credit * m.rateUsed);
          merged.balance = this.round2(merged.balance + row.balance * m.rateUsed);
          merged.by_org!.push({
            organization_id: m.orgId,
            organization_name: m.orgName,
            amount: translated,
          });
        }
      }
    }

    // 5. Eliminations: subtract intercompany pair amounts (per account_code).
    const eliminationsByCode = new Map<string, number>();
    const includeEliminations =
      filters?.include_eliminations === undefined ? true : !!filters.include_eliminations;

    if (includeEliminations) {
      // Find pairs where BOTH JEs sit inside the group's member set within the period.
      const { data: pairRows, error: pairErr } = await supabase
        .from('journal_entries')
        .select('id, organization_id, intercompany_pair_id, entry_date, status')
        .in('organization_id', memberIds)
        .eq('status', 'posted')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .not('intercompany_pair_id', 'is', null);

      if (pairErr) {
        this.logger.warn(`Eliminations lookup failed: ${pairErr.message}`);
      } else {
        const byPair = new Map<string, Array<{ id: string; org: string }>>();
        for (const r of pairRows || []) {
          const list = byPair.get(r.intercompany_pair_id as string) || [];
          list.push({ id: r.id as string, org: r.organization_id as string });
          byPair.set(r.intercompany_pair_id as string, list);
        }

        // Only consider pairs with >=2 entries from at least 2 different member orgs.
        const eligibleEntryIds: string[] = [];
        byPair.forEach((entries) => {
          const distinctOrgs = new Set(entries.map((e) => e.org));
          if (entries.length >= 2 && distinctOrgs.size >= 2) {
            for (const e of entries) eligibleEntryIds.push(e.id);
          }
        });

        if (eligibleEntryIds.length > 0) {
          // Fetch journal_items joined to accounts for those entries.
          const { data: items, error: itemsErr } = await supabase
            .from('journal_items')
            .select('debit, credit, journal_entry_id, accounts!inner(code, account_type, organization_id)')
            .in('journal_entry_id', eligibleEntryIds);
          if (itemsErr) {
            this.logger.warn(`Eliminations items lookup failed: ${itemsErr.message}`);
          } else {
            // Per entry, find the org's currency to translate.
            const orgIdByEntry = new Map<string, string>();
            for (const r of pairRows || []) {
              orgIdByEntry.set(r.id as string, r.organization_id as string);
            }
            for (const it of items || []) {
              const acct = (it as any).accounts;
              if (!acct) continue;
              const accountType = (acct.account_type as string).toLowerCase();
              if (accountType !== 'revenue' && accountType !== 'expense') continue;
              const code = acct.code as string;
              const orgId = orgIdByEntry.get(it.journal_entry_id as string);
              if (!orgId) continue;
              const orgInfo = orgMap.get(orgId);
              if (!orgInfo) continue;
              const memberRep = memberReports.find((m) => m.orgId === orgId);
              const rate = memberRep?.rateUsed ?? 1;
              // For revenue: display_amount sign convention is credit-debit.
              // For expense: debit-credit. Use the same sign convention so we
              // subtract from display_amount.
              const debit = Number(it.debit || 0);
              const credit = Number(it.credit || 0);
              const elimRaw =
                accountType === 'revenue' ? credit - debit : debit - credit;
              const elim = this.round2(elimRaw * rate);
              if (Math.abs(elim) < 0.005) continue;
              eliminationsByCode.set(code, this.round2((eliminationsByCode.get(code) || 0) + elim));
            }
          }
        }
      }

      // Apply eliminations to merged rows
      for (const section of Object.keys(sectionBuckets) as ProfitLossSection[]) {
        const bucket = sectionBuckets[section];
        bucket.forEach((row, code) => {
          const elim = eliminationsByCode.get(code);
          if (elim) {
            row.display_amount = this.round2(row.display_amount - elim);
          }
        });
      }
    }

    // 6. Filter zero balances unless requested
    const finalize = (section: ProfitLossSection): ConsolidatedRow[] => {
      const arr = Array.from(sectionBuckets[section].values());
      const filtered = includeZero
        ? arr
        : arr.filter((r) => Math.abs(r.display_amount) >= 0.005);
      return filtered
        .map((r) => {
          const { _key, ...rest } = r as any;
          return rest as ConsolidatedRow;
        })
        .sort((a, b) => a.account_code.localeCompare(b.account_code));
    };

    const directIncome = finalize('direct_income');
    const otherIncome = finalize('other_income');
    const cogs = finalize('cogs');
    const indirectExpenses = finalize('indirect_expense');
    const otherExpenses = finalize('other_expense');

    const sumOf = (rows: ConsolidatedRow[]) =>
      rows.reduce((s, r) => s + r.display_amount, 0);
    const totalDirectIncome = this.round2(sumOf(directIncome));
    const totalOtherIncome = this.round2(sumOf(otherIncome));
    const totalIncome = this.round2(totalDirectIncome + totalOtherIncome);
    const totalCogs = this.round2(sumOf(cogs));
    const totalIndirect = this.round2(sumOf(indirectExpenses));
    const totalOtherExp = this.round2(sumOf(otherExpenses));
    const totalExpenses = this.round2(totalCogs + totalIndirect + totalOtherExp);
    const grossProfit = this.round2(totalDirectIncome - totalCogs);
    const operatingProfit = this.round2(grossProfit - totalIndirect);
    const netIncome = this.round2(operatingProfit + totalOtherIncome - totalOtherExp);

    const eliminations = Array.from(eliminationsByCode.entries()).map(([code, amt]) => ({
      account_code: code,
      amount: this.round2(amt),
    }));

    return {
      start_date: startDate,
      end_date: endDate,
      direct_income: directIncome,
      other_income: otherIncome,
      cogs,
      indirect_expenses: indirectExpenses,
      other_expenses: otherExpenses,
      totals: {
        total_direct_income: totalDirectIncome,
        total_other_income: totalOtherIncome,
        total_income: totalIncome,
        total_cogs: totalCogs,
        total_indirect_expenses: totalIndirect,
        total_other_expenses: totalOtherExp,
        total_expenses: totalExpenses,
        gross_profit: grossProfit,
        operating_profit: operatingProfit,
        net_income: netIncome,
        ebitda: operatingProfit,
      },
      group_id: group.id,
      group_name: group.name,
      group_base_currency: groupCcy,
      member_organizations: memberReports.map((m) => ({
        id: m.orgId,
        name: m.orgName,
        currency: m.currency,
        rate_used: m.rateUsed,
      })),
      eliminations: eliminations.sort((a, b) => a.account_code.localeCompare(b.account_code)),
    };
  }

  private emptyReport(
    group: any,
    startDate: string,
    endDate: string,
  ): ConsolidatedProfitLossReport {
    return {
      start_date: startDate,
      end_date: endDate,
      direct_income: [],
      other_income: [],
      cogs: [],
      indirect_expenses: [],
      other_expenses: [],
      totals: {
        total_direct_income: 0,
        total_other_income: 0,
        total_income: 0,
        total_cogs: 0,
        total_indirect_expenses: 0,
        total_other_expenses: 0,
        total_expenses: 0,
        gross_profit: 0,
        operating_profit: 0,
        net_income: 0,
        ebitda: 0,
      },
      group_id: group.id,
      group_name: group.name,
      group_base_currency: (group.base_currency as string).toUpperCase(),
      member_organizations: [],
      eliminations: [],
    };
  }
}
