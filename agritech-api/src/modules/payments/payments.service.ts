import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { NotificationsService, MANAGEMENT_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
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
        private readonly accountingAutomationService: AccountingAutomationService,
        private readonly notificationsService: NotificationsService,
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

            // Notify management about new payment
            try {
                await this.notificationsService.createNotificationsForRoles(
                    organizationId,
                    MANAGEMENT_ROLES,
                    userId,
                    NotificationType.PAYMENT_STATUS_CHANGED,
                    `💳 Payment ${payment.payment_number || ''} created — ${dto.amount} ${dto.currency_code || 'MAD'}`,
                    `Payment of ${dto.amount} ${dto.currency_code || 'MAD'} created`,
                    { paymentId: payment.id, amount: dto.amount, currency: dto.currency_code || 'MAD', status: 'draft' },
                );
            } catch (notifError) {
                this.logger.warn(`Failed to send payment notification: ${notifError}`);
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

            // Resolve GL accounts via account_mappings BEFORE the transaction
            const cashAccountId = await this.accountingAutomationService.resolveAccountId(organizationId, 'cash', 'bank');
            const receivableAccountId = await this.accountingAutomationService.resolveAccountId(organizationId, 'receivable', 'trade');
            const payableAccountId = await this.accountingAutomationService.resolveAccountId(organizationId, 'payable', 'trade');

            if (!cashAccountId) {
                throw new BadRequestException(
                    'Account mapping missing for cash/bank. Please configure account mappings before processing payments.',
                );
            }
            if (!receivableAccountId) {
                throw new BadRequestException(
                    'Account mapping missing for receivable/trade. Please configure account mappings before processing payments.',
                );
            }
            if (!payableAccountId) {
                throw new BadRequestException(
                    'Account mapping missing for payable/trade. Please configure account mappings before processing payments.',
                );
            }

            // Determine cash account (use bank account's GL account if specified, otherwise use mapping)
            let cashLedgerAccountId = cashAccountId;
            if (payment.bank_account_id) {
                const { data: bankAccount } = await supabaseClient
                    .from('bank_accounts')
                    .select('gl_account_id')
                    .eq('id', payment.bank_account_id)
                    .eq('organization_id', organizationId)
                    .single();

                if (bankAccount?.gl_account_id) {
                    cashLedgerAccountId = bankAccount.gl_account_id;
                }
            }

            // Generate journal entry number BEFORE the transaction
            const entryNumber = await this.sequencesService.generateJournalEntryNumber(organizationId);

            const now = new Date().toISOString();

            // Execute all mutations inside a PostgreSQL transaction for ACID guarantees
            const result = await this.databaseService.executeInPgTransaction(async (pgClient) => {
                // 1. Insert payment allocations
                for (const alloc of dto.allocations) {
                    await pgClient.query(
                        `INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount) VALUES ($1, $2, $3)`,
                        [paymentId, alloc.invoice_id, alloc.amount],
                    );
                }

                // 2. Update invoices outstanding amounts and status
                for (const allocation of dto.allocations) {
                    const invoice = invoices.find(inv => inv.id === allocation.invoice_id);
                    if (!invoice) continue;

                    const remaining = Number(invoice.outstanding_amount) - allocation.amount;
                    const newStatus = remaining <= 0.01 ? 'paid' : 'partially_paid';

                    await pgClient.query(
                        `UPDATE invoices SET outstanding_amount = $1, paid_amount = $2, status = $3, updated_at = $4 WHERE id = $5`,
                        [Math.max(0, remaining), Number(invoice.outstanding_amount) - remaining, newStatus, now, allocation.invoice_id],
                    );
                }

                // 3. Create journal entry header
                const jeResult = await pgClient.query(
                    `INSERT INTO journal_entries (organization_id, entry_number, entry_date, posting_date, reference_type, reference_number, remarks, created_by, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
                    [
                        organizationId, entryNumber, payment.payment_date, payment.payment_date,
                        'Payment', payment.payment_number,
                        `Payment ${payment.payment_type === 'receive' ? 'received from' : 'made to'} ${payment.party_name}`,
                        userId, 'draft',
                    ],
                );
                const journalEntryId = jeResult.rows[0].id;

                // 4. Build and validate journal lines
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
                    journalEntryId,
                    {
                        cashAccountId: cashLedgerAccountId,
                        accountsReceivableId: receivableAccountId,
                        accountsPayableId: payableAccountId,
                    }
                );

                const totalDebit = journalLines.reduce((sum, line) => sum + line.debit, 0);
                const totalCredit = journalLines.reduce((sum, line) => sum + line.credit, 0);

                if (Math.abs(totalDebit - totalCredit) >= 0.01) {
                    throw new BadRequestException(
                        `Payment journal entry is not balanced: debits=${totalDebit}, credits=${totalCredit}`
                    );
                }

                // 5. Insert journal items
                for (const line of journalLines) {
                    await pgClient.query(
                        `INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit, cost_center_id)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [line.journal_entry_id, line.account_id, line.description || null, line.debit, line.credit, line.cost_center_id || null],
                    );
                }

                // 6. Post journal entry
                await pgClient.query(
                    `UPDATE journal_entries SET status = 'posted', posted_by = $1, posted_at = $2 WHERE id = $3`,
                    [userId, now, journalEntryId],
                );

                // 7. Update payment status to submitted and link journal entry
                await pgClient.query(
                    `UPDATE accounting_payments SET status = 'submitted', journal_entry_id = $1, updated_at = $2 WHERE id = $3`,
                    [journalEntryId, now, paymentId],
                );

                return { journalEntryId };
            });

            this.logger.log(`Payment ${payment.payment_number} allocated with journal entry ${entryNumber}`);

            // Fetch updated payment with allocations (read outside transaction is fine)
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
                    journal_entry_id: result.journalEntryId,
                    allocated_amount: totalAllocated,
                },
            };
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
            // Strip characters that can inject PostgREST filter operators (commas, dots, parens, quotes)
            if (search) {
                const safeSearch = search.replace(/[\\%_,.()'"]/g, '');
                if (safeSearch.length > 0) {
                    const searchFilter = `payment_number.ilike.%${safeSearch}%,party_name.ilike.%${safeSearch}%`;
                    countQuery = countQuery.or(searchFilter);
                    dataQuery = dataQuery.or(searchFilter);
                }
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
