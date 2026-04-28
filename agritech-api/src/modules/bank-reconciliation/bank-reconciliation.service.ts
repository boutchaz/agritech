import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateBankTransactionDto,
  ListBankTransactionsQueryDto,
  MatchBankTransactionDto,
} from './dto/bank-transaction.dto';

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Manually create a bank transaction line. CSV/OFX imports will use a
   * batch path that calls this in a loop with source != 'manual'.
   */
  async createTransaction(
    dto: CreateBankTransactionDto,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // Verify the bank account belongs to the org
    const { data: bank, error: bErr } = await supabase
      .from('bank_accounts')
      .select('id, currency_code')
      .eq('id', dto.bank_account_id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (bErr || !bank) throw new NotFoundException('Bank account not found');

    const { data, error } = await supabase
      .from('bank_transactions')
      .insert({
        organization_id: organizationId,
        bank_account_id: dto.bank_account_id,
        transaction_date: dto.transaction_date,
        value_date: dto.value_date || null,
        amount: dto.amount,
        currency_code: bank.currency_code || 'MAD',
        description: dto.description || null,
        reference: dto.reference || null,
        balance_after: dto.balance_after ?? null,
        source: dto.source || 'manual',
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create transaction: ${error.message}`);
    }
    return data;
  }

  /**
   * List bank transactions for an account, optionally only unreconciled.
   */
  async listTransactions(
    bankAccountId: string,
    organizationId: string,
    query: ListBankTransactionsQueryDto,
  ): Promise<any[]> {
    const supabase = this.databaseService.getAdminClient();

    let q = supabase
      .from('bank_transactions')
      .select(`
        *,
        matched_payment:accounting_payments!bank_transactions_matched_payment_id_fkey(
          id, payment_number, payment_date, amount, party_name
        )
      `)
      .eq('organization_id', organizationId)
      .eq('bank_account_id', bankAccountId);

    if (query.unreconciled_only) {
      q = q.is('reconciled_at', null);
    }
    if (query.from_date) q = q.gte('transaction_date', query.from_date);
    if (query.to_date) q = q.lte('transaction_date', query.to_date);

    const { data, error } = await q.order('transaction_date', { ascending: false });
    if (error) throw new BadRequestException(`Failed to list: ${error.message}`);
    return data || [];
  }

  /**
   * Match a bank transaction to an accounting_payment. Verifies amounts
   * and bank_account compatibility. Sets reconciled_at + reconciled_by.
   */
  async matchTransaction(
    transactionId: string,
    dto: MatchBankTransactionDto,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data: txn, error: tErr } = await supabase
      .from('bank_transactions')
      .select('id, bank_account_id, amount, reconciled_at')
      .eq('id', transactionId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (tErr || !txn) throw new NotFoundException('Transaction not found');
    if (txn.reconciled_at) {
      throw new BadRequestException('Transaction already reconciled — unmatch first');
    }

    const { data: payment, error: pErr } = await supabase
      .from('accounting_payments')
      .select('id, bank_account_id, amount, payment_type')
      .eq('id', dto.payment_id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (pErr || !payment) throw new NotFoundException('Payment not found');

    if (payment.bank_account_id && payment.bank_account_id !== txn.bank_account_id) {
      throw new BadRequestException('Payment is on a different bank account');
    }

    // Sign check: receive payments should match positive bank amounts;
    // pay payments should match negative bank amounts.
    const txnAmount = Number(txn.amount);
    const payAmount = Number(payment.amount);
    const expectedSign = payment.payment_type === 'receive' ? 1 : -1;
    if (Math.sign(txnAmount) !== expectedSign) {
      throw new BadRequestException(
        `Sign mismatch: ${payment.payment_type} payment cannot match ${txnAmount > 0 ? 'inflow' : 'outflow'}`,
      );
    }
    if (Math.abs(Math.abs(txnAmount) - payAmount) > 0.01) {
      throw new BadRequestException(
        `Amount mismatch: bank ${Math.abs(txnAmount)} vs payment ${payAmount}`,
      );
    }

    const { data, error } = await supabase
      .from('bank_transactions')
      .update({
        matched_payment_id: dto.payment_id,
        reconciled_at: new Date().toISOString(),
        reconciled_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to match: ${error.message}`);
    return data;
  }

  async unmatchTransaction(
    transactionId: string,
    organizationId: string,
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('bank_transactions')
      .update({
        matched_payment_id: null,
        reconciled_at: null,
        reconciled_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .eq('organization_id', organizationId)
      .select()
      .single();
    if (error) throw new BadRequestException(`Failed to unmatch: ${error.message}`);
    return data;
  }

  /**
   * Reconciliation summary for a bank account: count + total of
   * unreconciled transactions, last reconciled date.
   */
  async getSummary(bankAccountId: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('amount, reconciled_at')
      .eq('organization_id', organizationId)
      .eq('bank_account_id', bankAccountId);
    if (error) throw new BadRequestException(`Failed to load summary: ${error.message}`);

    const all = data || [];
    const unreconciled = all.filter((t) => !t.reconciled_at);
    const lastReconciled = all
      .filter((t) => t.reconciled_at)
      .map((t) => t.reconciled_at!)
      .sort()
      .pop() || null;

    return {
      total_transactions: all.length,
      unreconciled_count: unreconciled.length,
      unreconciled_total: unreconciled.reduce((s, t) => s + Number(t.amount), 0),
      last_reconciled_at: lastReconciled,
    };
  }
}
