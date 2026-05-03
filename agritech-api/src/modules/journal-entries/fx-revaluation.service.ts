import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { AccountingAutomationService } from './accounting-automation.service';
import { JournalEntryStatus, JournalEntryType } from './dto/create-journal-entry.dto';

const norm = (v: string | null | undefined): string => (v || '').trim().toLowerCase();

const MONETARY_SUBTYPE_PATTERNS = [
  'cash',
  'bank',
  'receivable',
  'payable',
  'loan',
  'debt',
  'note',
];

interface MonetaryAccount {
  id: string;
  code: string;
  name: string;
  account_type: string;
  account_subtype: string | null;
  currency_code: string | null;
}

@Injectable()
export class FxRevaluationService {
  private readonly logger = new Logger(FxRevaluationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    private readonly fiscalYearsService: FiscalYearsService,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly accountingAutomationService: AccountingAutomationService,
  ) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private isMonetary(account: { account_type: string; account_subtype: string | null; name: string }): boolean {
    const t = norm(account.account_type);
    if (t !== 'asset' && t !== 'liability') return false;
    const hay = `${norm(account.account_subtype)} ${norm(account.name)}`;
    return MONETARY_SUBTYPE_PATTERNS.some((p) => hay.includes(p));
  }

  /**
   * Post a single journal entry that revaluates monetary foreign-currency
   * account balances to their current exchange rate. Difference goes to the
   * "Unrealized FX Gain/Loss" P&L account (resolved via account_mappings).
   *
   * Idempotent: refuses to create a second revaluation for the same as_of_date.
   */
  async revaluate(params: {
    organizationId: string;
    userId: string;
    asOfDate: string;
    baseCurrency?: string;
    remarks?: string;
  }): Promise<{ journalEntryId: string; entryNumber: string; netGainLoss: number; revaluedAccounts: number }> {
    const { organizationId, userId, asOfDate, remarks } = params;
    const supabase = this.databaseService.getAdminClient();

    await this.accountingAutomationService.assertPeriodOpen(organizationId, asOfDate);

    // Resolve org base currency
    let baseCurrency = params.baseCurrency;
    if (!baseCurrency) {
      const { data: org } = await supabase
        .from('organizations')
        .select('currency_code')
        .eq('id', organizationId)
        .maybeSingle();
      baseCurrency = (org?.currency_code as string | undefined) || 'MAD';
    }
    baseCurrency = baseCurrency.toUpperCase();

    // Idempotency check
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id, entry_number')
      .eq('organization_id', organizationId)
      .eq('entry_type', 'fx_revaluation')
      .eq('entry_date', asOfDate)
      .maybeSingle();
    if (existing) {
      throw new BadRequestException(
        `FX revaluation entry already exists for ${asOfDate} (entry: ${existing.entry_number}). Reverse it first.`,
      );
    }

    // Resolve gain & loss account (single account preferred; fall back to type if separate ones exist)
    const gainLossAccountId =
      (await this.accountingAutomationService.resolveAccountId(
        organizationId,
        'fx',
        'unrealized_gain_loss',
      )) ||
      (await this.accountingAutomationService.resolveAccountId(
        organizationId,
        'cost_type',
        'unrealized_fx_gain_loss',
      )) ||
      (await this.accountingAutomationService.resolveAccountId(
        organizationId,
        'revenue_type',
        'unrealized_fx_gain_loss',
      ));

    if (!gainLossAccountId) {
      throw new BadRequestException(
        `Account mapping missing for "Unrealized FX Gain/Loss". ` +
          `Configure an account_mapping with mapping_type='fx' and mapping_key='unrealized_gain_loss'.`,
      );
    }

    // Fetch monetary foreign-currency accounts
    const { data: accountsRaw, error: acctErr } = await supabase
      .from('accounts')
      .select('id, code, name, account_type, account_subtype, currency_code')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .eq('is_group', false);
    if (acctErr) {
      throw new BadRequestException(`Failed to fetch accounts: ${acctErr.message}`);
    }

    const candidates: MonetaryAccount[] = (accountsRaw || []).filter((a: any) => {
      if (!a.currency_code) return false;
      if (String(a.currency_code).toUpperCase() === baseCurrency) return false;
      return this.isMonetary({
        account_type: a.account_type,
        account_subtype: a.account_subtype,
        name: a.name,
      });
    });

    if (candidates.length === 0) {
      throw new BadRequestException(
        `No monetary foreign-currency accounts found to revaluate for ${baseCurrency}.`,
      );
    }

    // Build the JE items
    const items: Array<{
      account_id: string;
      debit: number;
      credit: number;
      currency: string;
      exchange_rate: number;
      fc_debit: number;
      fc_credit: number;
      description: string;
    }> = [];
    let totalDebit = 0;
    let totalCredit = 0;
    let revaluedCount = 0;

    for (const acc of candidates) {
      const accCcy = String(acc.currency_code).toUpperCase();

      // Sum balances from journal_items up to as_of_date (posted only)
      const { data: items_, error: itErr } = await supabase
        .from('journal_items')
        .select('debit, credit, fc_debit, fc_credit, journal_entries!inner(status, entry_date, organization_id)')
        .eq('account_id', acc.id)
        .eq('journal_entries.organization_id', organizationId)
        .eq('journal_entries.status', 'posted')
        .lte('journal_entries.entry_date', asOfDate);
      if (itErr) {
        throw new BadRequestException(`Failed to read balances for ${acc.code}: ${itErr.message}`);
      }

      let bookBaseDebit = 0;
      let bookBaseCredit = 0;
      let fcDebit = 0;
      let fcCredit = 0;
      for (const it of items_ || []) {
        bookBaseDebit += Number(it.debit || 0);
        bookBaseCredit += Number(it.credit || 0);
        fcDebit += Number(it.fc_debit ?? it.debit ?? 0);
        fcCredit += Number(it.fc_credit ?? it.credit ?? 0);
      }

      const bookBaseBalance = this.round2(bookBaseDebit - bookBaseCredit);
      const fcBalance = this.round2(fcDebit - fcCredit);

      if (Math.abs(fcBalance) < 0.005) continue;

      const currentRate = await this.exchangeRatesService.getRate(
        organizationId,
        accCcy,
        baseCurrency,
        asOfDate,
      );
      const currentBaseBalance = this.round2(fcBalance * currentRate);
      const adjustment = this.round2(currentBaseBalance - bookBaseBalance);
      if (Math.abs(adjustment) < 0.005) continue;

      // Adjustment: debit account if positive, credit account if negative
      if (adjustment > 0) {
        items.push({
          account_id: acc.id,
          debit: adjustment,
          credit: 0,
          currency: accCcy,
          exchange_rate: currentRate,
          fc_debit: 0,
          fc_credit: 0,
          description: `FX revaluation ${acc.code} @ ${currentRate}`,
        });
        totalDebit += adjustment;
      } else {
        items.push({
          account_id: acc.id,
          debit: 0,
          credit: -adjustment,
          currency: accCcy,
          exchange_rate: currentRate,
          fc_debit: 0,
          fc_credit: 0,
          description: `FX revaluation ${acc.code} @ ${currentRate}`,
        });
        totalCredit += -adjustment;
      }
      revaluedCount += 1;
    }

    if (revaluedCount === 0) {
      throw new BadRequestException('No revaluation needed: all FX balances already match current rates.');
    }

    // Offset to gain/loss account
    const diff = this.round2(totalDebit - totalCredit);
    if (Math.abs(diff) >= 0.005) {
      if (diff > 0) {
        items.push({
          account_id: gainLossAccountId,
          debit: 0,
          credit: diff,
          currency: baseCurrency,
          exchange_rate: 1,
          fc_debit: 0,
          fc_credit: diff,
          description: 'Unrealized FX gain',
        });
        totalCredit += diff;
      } else {
        items.push({
          account_id: gainLossAccountId,
          debit: -diff,
          credit: 0,
          currency: baseCurrency,
          exchange_rate: 1,
          fc_debit: -diff,
          fc_credit: 0,
          description: 'Unrealized FX loss',
        });
        totalDebit += -diff;
      }
    }

    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new BadRequestException(
        `FX revaluation entry not balanced: debits=${totalDebit}, credits=${totalCredit}`,
      );
    }

    // diff (totalDebit - totalCredit BEFORE offset):
    //   > 0: monetary lines net debit -> we credit gain account -> net gain (positive)
    //   < 0: monetary lines net credit -> we debit loss account  -> net loss (negative)
    // We report `diff` as the net P&L impact (positive = gain).
    const reportedNet = this.round2(diff);

    // Build JE
    const fiscalYearId = await this.fiscalYearsService.resolveFiscalYear(organizationId, asOfDate);
    const entryNumber = await this.sequencesService.generateJournalEntryNumber(organizationId);

    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_number: entryNumber,
        entry_date: asOfDate,
        entry_type: 'fx_revaluation',
        description: `FX revaluation as of ${asOfDate}`,
        reference_type: 'fx_revaluation',
        reference_id: null,
        remarks: remarks || `Unrealized FX revaluation for ${revaluedCount} account(s)`,
        total_debit: this.round2(totalDebit),
        total_credit: this.round2(totalCredit),
        status: JournalEntryStatus.DRAFT,
        created_by: userId,
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      })
      .select()
      .single();

    if (entryError) {
      throw new BadRequestException(`Failed to create FX revaluation JE: ${entryError.message}`);
    }

    const insertItems = items.map((it) => ({
      journal_entry_id: journalEntry.id,
      account_id: it.account_id,
      debit: this.round2(it.debit),
      credit: this.round2(it.credit),
      currency: it.currency,
      exchange_rate: it.exchange_rate,
      fc_debit: this.round2(it.fc_debit),
      fc_credit: this.round2(it.fc_credit),
      description: it.description,
      ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
    }));

    const { error: itemsErr } = await supabase.from('journal_items').insert(insertItems);
    if (itemsErr) {
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      throw new BadRequestException(`Failed to insert FX revaluation items: ${itemsErr.message}`);
    }

    await supabase
      .from('journal_entries')
      .update({
        status: JournalEntryStatus.POSTED,
        total_debit: this.round2(totalDebit),
        total_credit: this.round2(totalCredit),
      })
      .eq('id', journalEntry.id);

    this.logger.log(
      `FX revaluation ${entryNumber} posted: ${revaluedCount} accounts, net=${reportedNet}`,
    );

    return {
      journalEntryId: journalEntry.id,
      entryNumber,
      netGainLoss: reportedNet,
      revaluedAccounts: revaluedCount,
    };
  }

  /**
   * Reverse a prior FX revaluation entry posted on `asOfDate`.
   */
  async reverse(params: {
    organizationId: string;
    userId: string;
    asOfDate: string;
    reason?: string;
  }): Promise<{ reversalEntryId: string; reversalNumber: string }> {
    const { organizationId, userId, asOfDate, reason } = params;
    const supabase = this.databaseService.getAdminClient();

    const { data: original, error } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('entry_type', 'fx_revaluation')
      .eq('entry_date', asOfDate)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!original) {
      throw new BadRequestException(`No FX revaluation entry found for ${asOfDate}`);
    }

    return this.accountingAutomationService.createReversalEntry(
      organizationId,
      original.id,
      userId,
      reason || `Reverse FX revaluation ${asOfDate}`,
    );
  }
}
