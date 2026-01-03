import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import {
    CreatePaymentDto,
    AllocatePaymentDto,
    UpdatePaymentStatusDto,
    PaginatedPaymentQueryDto,
    PaginatedResponse,
    PaymentType,
    SortDirection,
} from './dto';
import { buildPaymentLedgerLines } from '../journal-entries/helpers/ledger.helper';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly sequencesService: SequencesService,
    ) { }

    /**
     * Create a new payment record
     */
    async create(
        dto: CreatePaymentDto,
        organizationId: string,
        userId: string,
    ) {
        const supabaseClient = this.databaseService.getAdminClient();

        try {
            // Generate payment number
            const paymentNumber = await this.sequencesService.generatePaymentNumber(
                organizationId,
            );

            // Create payment
            const { data: payment, error } = await supabaseClient
                .from('accounting_payments')
                .insert({
                    organization_id: organizationId,
                    payment_number: paymentNumber,
                    payment_type: dto.payment_type,
                    payment_method: dto.payment_method,
                    payment_date: dto.payment_date,
                    amount: dto.amount,
                    party_name: dto.party_name,
                    party_id: dto.party_id,
                    party_type: dto.party_type,
                    bank_account_id: dto.bank_account_id,
                    reference_number: dto.reference_number,
                    currency_code: dto.currency_code || 'MAD',
                    exchange_rate: dto.exchange_rate || 1.0,
                    remarks: dto.remarks || dto.notes,
                    status: 'draft',
                    created_by: userId,
                })
                .select()
                .single();

            if (error) {
                this.logger.error('Error creating payment:', error);
                throw new BadRequestException(`Failed to create payment: ${error.message}`);
            }

            return payment;
        } catch (error) {
            this.logger.error('Error in create payment:', error);
            throw error;
        }
    }

    /**
     * Allocate payment to invoices
     * This creates payment_allocations records and the database trigger
     * will automatically update invoice amounts and status
     */
    async allocatePayment(
        paymentId: string,
        dto: AllocatePaymentDto,
        organizationId: string,
        userId: string,
    ) {
        const supabaseClient = this.databaseService.getAdminClient();

        try {
            // Fetch payment
            const { data: payment, error: paymentError } = await supabaseClient
                .from('accounting_payments')
                .select('*')
                .eq('id', paymentId)
                .eq('organization_id', organizationId)
                .single();

            if (paymentError || !payment) {
                throw new NotFoundException('Payment not found');
            }

            // Validate payment status
            if (payment.status !== 'draft') {
                throw new BadRequestException('Only draft payments can be allocated');
            }

            // Validate total allocation equals payment amount
            const totalAllocated = dto.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
            const paymentAmount = Number(payment.amount);

            if (Math.abs(totalAllocated - paymentAmount) > 0.01) {
                throw new BadRequestException(
                    `Total allocated amount (${totalAllocated}) must equal payment amount (${paymentAmount})`
                );
            }

            // Fetch all invoices to validate
            const invoiceIds = dto.allocations.map(a => a.invoice_id);
            const { data: invoices, error: invoicesError } = await supabaseClient
                .from('invoices')
                .select('id, invoice_type, outstanding_amount, status')
                .in('id', invoiceIds)
                .eq('organization_id', organizationId);

            if (invoicesError) {
                throw new BadRequestException(`Failed to fetch invoices: ${invoicesError.message}`);
            }

            if (!invoices || invoices.length !== invoiceIds.length) {
                throw new BadRequestException('One or more invoices not found');
            }

            // Validate invoice types match payment type
            const expectedInvoiceType = payment.payment_type === PaymentType.RECEIVE ? 'sales' : 'purchase';
            const invalidInvoices = invoices.filter(inv => inv.invoice_type !== expectedInvoiceType);

            if (invalidInvoices.length > 0) {
                throw new BadRequestException(
                    `Invoice types do not match payment type. Expected ${expectedInvoiceType} invoices.`
                );
            }

            // Validate allocations don't exceed outstanding amounts
            for (const allocation of dto.allocations) {
                const invoice = invoices.find(inv => inv.id === allocation.invoice_id);
                if (invoice && allocation.amount > Number(invoice.outstanding_amount)) {
                    throw new BadRequestException(
                        `Allocation amount for invoice ${invoice.id} exceeds outstanding amount`
                    );
                }
            }

            // Create payment allocations
            const allocationsToInsert = dto.allocations.map(alloc => ({
                payment_id: paymentId,
                invoice_id: alloc.invoice_id,
                allocated_amount: alloc.amount,
            }));

            const { error: allocError } = await supabaseClient
                .from('payment_allocations')
                .insert(allocationsToInsert);

            if (allocError) {
                this.logger.error('Error creating payment allocations:', allocError);
                throw new BadRequestException(`Failed to allocate payment: ${allocError.message}`);
            }

            // Update invoices outstanding amounts and status
            const now = new Date().toISOString();
            for (const allocation of dto.allocations) {
                const invoice = invoices.find(inv => inv.id === allocation.invoice_id);
                if (!invoice) continue;

                const remaining = Number(invoice.outstanding_amount) - allocation.amount;
                const newStatus = remaining <= 0.01 ? 'paid' : 'partially_paid';

                const { error: invoiceUpdateError } = await supabaseClient
                    .from('invoices')
                    .update({
                        outstanding_amount: Math.max(0, remaining),
                        paid_amount: Number(invoice.outstanding_amount) - remaining,
                        status: newStatus,
                        updated_at: now,
                    })
                    .eq('id', allocation.invoice_id);

                if (invoiceUpdateError) {
                    throw new BadRequestException(
                        `Failed to update invoice ${allocation.invoice_id}: ${invoiceUpdateError.message}`
                    );
                }
            }

            // Get required GL accounts
            const LEDGER_CODES = ['1110', '1200', '2110'];
            const { data: ledgerAccounts, error: ledgerError } = await supabaseClient
                .from('accounts')
                .select('id, code')
                .eq('organization_id', organizationId)
                .in('code', LEDGER_CODES);

            if (ledgerError) {
                throw new BadRequestException(`Failed to load ledger accounts: ${ledgerError.message}`);
            }

            const ledgerMap = new Map<string, string>(
                (ledgerAccounts ?? []).map((acc) => [acc.code, acc.id])
            );

            // Determine cash account (use bank account's GL account if specified)
            let cashLedgerAccountId = ledgerMap.get('1110') ?? '';
            if (payment.bank_account_id) {
                const { data: bankAccount, error: bankError } = await supabaseClient
                    .from('bank_accounts')
                    .select('gl_account_id')
                    .eq('id', payment.bank_account_id)
                    .eq('organization_id', organizationId)
                    .single();

                if (bankAccount?.gl_account_id) {
                    cashLedgerAccountId = bankAccount.gl_account_id;
                }
            }

            // Generate journal entry number
            const { data: entryNumber, error: entryNumError } = await supabaseClient
                .rpc('generate_journal_entry_number', { p_organization_id: organizationId });

            if (entryNumError) {
                throw new BadRequestException(`Failed to generate journal entry number: ${entryNumError.message}`);
            }

            // Create journal entry header
            const { data: journalEntry, error: journalError } = await supabaseClient
                .from('journal_entries')
                .insert({
                    organization_id: organizationId,
                    entry_number: entryNumber,
                    entry_date: payment.payment_date,
                    posting_date: payment.payment_date,
                    reference_type: 'Payment',
                    reference_number: payment.payment_number,
                    remarks: `Payment ${payment.payment_type === 'receive' ? 'received from' : 'made to'} ${payment.party_name}`,
                    created_by: userId,
                    status: 'draft',
                })
                .select()
                .single();

            if (journalError || !journalEntry) {
                throw new BadRequestException(`Failed to create journal entry: ${journalError?.message}`);
            }

            try {
                // Build journal lines using ledger helper
                const journalLines = buildPaymentLedgerLines(
                    {
                        id: payment.id,
                        payment_number: payment.payment_number,
                        payment_type: payment.payment_type,
                        payment_method: payment.payment_method,
                        payment_date: payment.payment_date,
                        amount: totalAllocated,
                        party_name: payment.party_name,
                        bank_account_id: payment.bank_account_id,
                    },
                    journalEntry.id,
                    {
                        cashAccountId: cashLedgerAccountId,
                        accountsReceivableId: ledgerMap.get('1200') ?? '',
                        accountsPayableId: ledgerMap.get('2110') ?? '',
                    }
                );

                // Validate double-entry principle
                const totalDebit = journalLines.reduce((sum, line) => sum + line.debit, 0);
                const totalCredit = journalLines.reduce((sum, line) => sum + line.credit, 0);

                if (Math.abs(totalDebit - totalCredit) >= 0.01) {
                    await supabaseClient.from('journal_entries').delete().eq('id', journalEntry.id);
                    throw new BadRequestException(
                        `Payment journal entry is not balanced: debits=${totalDebit}, credits=${totalCredit}`
                    );
                }

                // Insert journal items
                const { error: insertLinesError } = await supabaseClient
                    .from('journal_items')
                    .insert(journalLines);

                if (insertLinesError) {
                    await supabaseClient.from('journal_entries').delete().eq('id', journalEntry.id);
                    throw new BadRequestException(`Failed to create payment journal lines: ${insertLinesError.message}`);
                }

                // Post journal entry
                const { error: postJournalError } = await supabaseClient
                    .from('journal_entries')
                    .update({
                        status: 'posted',
                        posted_by: userId,
                        posted_at: now,
                    })
                    .eq('id', journalEntry.id);

                if (postJournalError) {
                    throw new BadRequestException(`Failed to post payment journal entry: ${postJournalError.message}`);
                }

                // Update payment status to submitted and link journal entry
                const { error: updateError } = await supabaseClient
                    .from('accounting_payments')
                    .update({
                        status: 'submitted',
                        journal_entry_id: journalEntry.id,
                        updated_at: now,
                    })
                    .eq('id', paymentId);

                if (updateError) {
                    this.logger.error('Error updating payment status:', updateError);
                    throw new BadRequestException(`Failed to update payment status: ${updateError.message}`);
                }

                this.logger.log(`Payment ${payment.payment_number} allocated with journal entry ${entryNumber}`);

                // Fetch updated payment with allocations
                const { data: updatedPayment } = await supabaseClient
                    .from('accounting_payments')
                    .select(`
                        *,
                        allocations:payment_allocations(
                            *,
                            invoice:invoices(id, invoice_number, grand_total, paid_amount, outstanding_amount, status)
                        )
                    `)
                    .eq('id', paymentId)
                    .single();

                return {
                    success: true,
                    message: 'Payment allocated successfully',
                    data: {
                        payment: updatedPayment,
                        journal_entry_id: journalEntry.id,
                        allocated_amount: totalAllocated,
                    },
                };
            } catch (error) {
                // Rollback: delete journal entry if anything fails
                await supabaseClient.from('journal_entries').delete().eq('id', journalEntry.id);
                throw error;
            }
        } catch (error) {
            this.logger.error('Error in allocatePayment:', error);
            throw error;
        }
    }

    /**
     * Get all payments with pagination, sorting, search, and filters
     */
    async findAll(
        organizationId: string,
        query: PaginatedPaymentQueryDto,
    ): Promise<PaginatedResponse<any>> {
        const supabaseClient = this.databaseService.getAdminClient();

        try {
            const {
                page = 1,
                pageSize = 10,
                sortBy = 'payment_date',
                sortDir = SortDirection.DESC,
                search,
                payment_type,
                status,
                dateFrom,
                dateTo,
            } = query;

            const offset = (page - 1) * pageSize;

            // Build count query for total
            let countQuery = supabaseClient
                .from('accounting_payments')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', organizationId);

            // Build data query
            let dataQuery = supabaseClient
                .from('accounting_payments')
                .select(`
                    *,
                    allocations:payment_allocations(
                        *,
                        invoice:invoices(id, invoice_number, invoice_type)
                    )
                `)
                .eq('organization_id', organizationId);

            // Apply search filter (payment_number or party_name)
            if (search) {
                const searchFilter = `payment_number.ilike.%${search}%,party_name.ilike.%${search}%`;
                countQuery = countQuery.or(searchFilter);
                dataQuery = dataQuery.or(searchFilter);
            }

            // Apply payment_type filter
            if (payment_type) {
                countQuery = countQuery.eq('payment_type', payment_type);
                dataQuery = dataQuery.eq('payment_type', payment_type);
            }

            // Apply status filter
            if (status) {
                countQuery = countQuery.eq('status', status);
                dataQuery = dataQuery.eq('status', status);
            }

            // Apply date range filter
            if (dateFrom) {
                countQuery = countQuery.gte('payment_date', dateFrom);
                dataQuery = dataQuery.gte('payment_date', dateFrom);
            }

            if (dateTo) {
                countQuery = countQuery.lte('payment_date', dateTo);
                dataQuery = dataQuery.lte('payment_date', dateTo);
            }

            // Apply sorting
            const validSortFields = ['payment_number', 'payment_date', 'party_name', 'amount', 'status', 'payment_type', 'payment_method'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'payment_date';
            dataQuery = dataQuery.order(sortField, { ascending: sortDir === SortDirection.ASC });

            // Apply pagination
            dataQuery = dataQuery.range(offset, offset + pageSize - 1);

            // Execute both queries in parallel
            const [countResult, dataResult] = await Promise.all([
                countQuery,
                dataQuery,
            ]);

            if (countResult.error) {
                this.logger.error('Error counting payments:', countResult.error);
                throw new BadRequestException(`Failed to count payments: ${countResult.error.message}`);
            }

            if (dataResult.error) {
                this.logger.error('Error fetching payments:', dataResult.error);
                throw new BadRequestException(`Failed to fetch payments: ${dataResult.error.message}`);
            }

            const total = countResult.count || 0;
            const totalPages = Math.ceil(total / pageSize);

            return {
                data: dataResult.data || [],
                total,
                page,
                pageSize,
                totalPages,
            };
        } catch (error) {
            this.logger.error('Error in findAll payments:', error);
            throw error;
        }
    }

    /**
     * Get a single payment by ID
     */
    async findOne(id: string, organizationId: string) {
        const supabaseClient = this.databaseService.getAdminClient();

        try {
            const { data, error } = await supabaseClient
                .from('accounting_payments')
                .select(`
          *,
          allocations:payment_allocations(
            *,
            invoice:invoices(
              id, 
              invoice_number, 
              invoice_type, 
              grand_total, 
              paid_amount, 
              outstanding_amount, 
              status
            )
          )
        `)
                .eq('id', id)
                .eq('organization_id', organizationId)
                .single();

            if (error || !data) {
                throw new NotFoundException(`Payment with ID ${id} not found`);
            }

            return data;
        } catch (error) {
            this.logger.error('Error in findOne payment:', error);
            throw error;
        }
    }

    /**
     * Update payment status
     */
    async updateStatus(
        id: string,
        dto: UpdatePaymentStatusDto,
        organizationId: string,
    ) {
        const supabaseClient = this.databaseService.getAdminClient();

        try {
            // Check if payment exists
            const payment = await this.findOne(id, organizationId);

            // Validate status transition
            this.validateStatusTransition(payment.status, dto.status);

            const updateData: any = {
                status: dto.status,
                updated_at: new Date().toISOString(),
            };

            if (dto.notes) {
                updateData.remarks = payment.remarks
                    ? `${payment.remarks}\n\n[${dto.status}] ${dto.notes}`
                    : `[${dto.status}] ${dto.notes}`;
            }

            const { error } = await supabaseClient
                .from('accounting_payments')
                .update(updateData)
                .eq('id', id)
                .eq('organization_id', organizationId);

            if (error) {
                this.logger.error('Error updating payment status:', error);
                throw new BadRequestException(`Failed to update payment status: ${error.message}`);
            }

            return this.findOne(id, organizationId);
        } catch (error) {
            this.logger.error('Error in updateStatus:', error);
            throw error;
        }
    }

    /**
     * Delete a payment (only drafts without allocations)
     */
    async delete(id: string, organizationId: string) {
        const supabaseClient = this.databaseService.getAdminClient();

        try {
            const payment = await this.findOne(id, organizationId);

            if (payment.status !== 'draft') {
                throw new BadRequestException('Only draft payments can be deleted');
            }

            // Check if payment has allocations
            const { data: allocations } = await supabaseClient
                .from('payment_allocations')
                .select('id')
                .eq('payment_id', id)
                .limit(1);

            if (allocations && allocations.length > 0) {
                throw new BadRequestException('Cannot delete payment with allocations');
            }

            const { error } = await supabaseClient
                .from('accounting_payments')
                .delete()
                .eq('id', id)
                .eq('organization_id', organizationId);

            if (error) {
                this.logger.error('Error deleting payment:', error);
                throw new BadRequestException(`Failed to delete payment: ${error.message}`);
            }

            return { message: 'Payment deleted successfully' };
        } catch (error) {
            this.logger.error('Error in delete payment:', error);
            throw error;
        }
    }

    /**
     * Validate status transition
     */
    private validateStatusTransition(currentStatus: string, newStatus: string): void {
        const validTransitions: Record<string, string[]> = {
            draft: ['submitted', 'cancelled'],
            submitted: ['reconciled', 'cancelled'],
            reconciled: [],
            cancelled: [],
        };

        const allowed = validTransitions[currentStatus] || [];

        if (!allowed.includes(newStatus)) {
            throw new BadRequestException(
                `Invalid status transition from ${currentStatus} to ${newStatus}`
            );
        }
    }
}
