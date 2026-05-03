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
    CreateAdvanceDto,
    ApplyAdvanceDto,
    AdvancePartyKind,
} from './dto';

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

            // Block posting to closed fiscal periods
            await this.accountingAutomationService.assertPeriodOpen(organizationId, payment.payment_date);

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
                .select('id, invoice_number, invoice_type, outstanding_amount, status')
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

                // 4. Build journal lines: one cash line (aggregate) + one counter-party line per allocated invoice.
                // Each counter-party line links to its invoice via reference_type/reference_id for sub-ledger reconciliation.
                const fx = Number(payment.exchange_rate ?? 1) || 1;
                const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
                const isReceive = payment.payment_type === PaymentType.RECEIVE;
                const counterAccountId = isReceive ? receivableAccountId : payableAccountId;

                const cashAmount = round2(totalAllocated * fx);
                const cashDescription = `Payment ${isReceive ? 'received' : 'made'} via ${payment.payment_method}`;

                // Insert cash/bank line
                await pgClient.query(
                    `INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        journalEntryId,
                        cashLedgerAccountId,
                        cashDescription,
                        isReceive ? cashAmount : 0,
                        isReceive ? 0 : cashAmount,
                    ],
                );

                let counterTotal = 0;
                for (const alloc of dto.allocations) {
                    const inv = invoices.find(i => i.id === alloc.invoice_id);
                    const lineAmount = round2(alloc.amount * fx);
                    counterTotal += lineAmount;
                    const desc = `${isReceive ? 'From' : 'To'} ${payment.party_name} — invoice ${inv?.invoice_number ?? alloc.invoice_id}`;

                    await pgClient.query(
                        `INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit, reference_type, reference_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            journalEntryId,
                            counterAccountId,
                            desc,
                            isReceive ? 0 : lineAmount,
                            isReceive ? lineAmount : 0,
                            'invoice',
                            alloc.invoice_id,
                        ],
                    );
                }

                // Double-entry validation after per-invoice splitting (rounding can accumulate)
                if (Math.abs(cashAmount - round2(counterTotal)) >= 0.01) {
                    throw new BadRequestException(
                        `Payment journal entry not balanced after per-invoice split: cash=${cashAmount}, counter=${counterTotal}`,
                    );
                }

                // 6. Post journal entry (set explicit totals — no DB trigger)
                await pgClient.query(
                    `UPDATE journal_entries SET status = 'posted', posted_by = $1, posted_at = $2, total_debit = $3, total_credit = $4 WHERE id = $5`,
                    [userId, now, cashAmount, cashAmount, journalEntryId],
                );
                await this.accountingAutomationService.applyCashSettlementDate(
                    pgClient,
                    journalEntryId,
                    payment.payment_date,
                );

                // 7. Update payment status to submitted and link journal entry
                await pgClient.query(
                    `UPDATE accounting_payments SET status = 'submitted', journal_entry_id = $1, updated_at = $2 WHERE id = $3`,
                    [journalEntryId, now, paymentId],
                );

                // 8. Update bank account current_balance (receive adds, pay subtracts)
                if (payment.bank_account_id) {
                    const delta = payment.payment_type === PaymentType.RECEIVE ? totalAllocated : -totalAllocated;
                    await pgClient.query(
                        `UPDATE bank_accounts
                         SET current_balance = COALESCE(current_balance, 0) + $1, updated_at = $2
                         WHERE id = $3 AND organization_id = $4`,
                        [delta, now, payment.bank_account_id, organizationId],
                    );
                }

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

            // Block draft → submitted via raw status flip. The only legitimate
            // path is allocatePayment(), which posts the JE and then sets
            // status='submitted' + journal_entry_id atomically. Allowing this
            // shortcut would create orphan submitted payments with no GL entry.
            if (payment.status === 'draft' && dto.status === 'submitted') {
                throw new BadRequestException(
                    'Cannot promote a draft payment to submitted directly. Allocate the payment to an invoice (which posts the journal entry) or record it as an advance.',
                );
            }

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

    /**
     * Resolve the advance GL account for a party kind.
     * Tries the org-level account_mappings first (mapping_type='advance',
     * mapping_key='customer'/'supplier'); falls back to the Moroccan CGNC
     * default codes (4421 = customer advances, 3421 = supplier advances).
     */
    private async resolveAdvanceAccount(
        organizationId: string,
        kind: AdvancePartyKind,
    ): Promise<string | null> {
        const mappingKey = kind === AdvancePartyKind.CUSTOMER ? 'customer' : 'supplier';
        const mapped = await this.accountingAutomationService.resolveAccountId(
            organizationId,
            'advance',
            mappingKey,
        );
        if (mapped) return mapped;

        // Fallback: lookup by CGNC code
        const code = kind === AdvancePartyKind.CUSTOMER ? '4421' : '3421';
        const supabase = this.databaseService.getAdminClient();
        const { data } = await supabase
            .from('accounts')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('code', code)
            .maybeSingle();
        return data?.id ?? null;
    }

    /**
     * Record an advance — a payment received from a customer (prepayment) or
     * paid to a supplier (deposit) before the matching invoice exists. Posts
     * to a dedicated CGNC advance account (4421/3421) instead of AR/AP. Use
     * applyAdvance() later to allocate it against an invoice.
     */
    async recordAdvance(
        dto: CreateAdvanceDto,
        organizationId: string,
        userId: string,
    ): Promise<{ payment: any; journal_entry_id: string }> {
        const isCustomer = dto.party_kind === AdvancePartyKind.CUSTOMER;
        const paymentType = isCustomer ? PaymentType.RECEIVE : PaymentType.PAY;
        const postingDate = dto.payment_date || new Date().toISOString().split('T')[0];

        await this.accountingAutomationService.assertPeriodOpen(organizationId, postingDate);

        const advanceAccountId = await this.resolveAdvanceAccount(organizationId, dto.party_kind);
        if (!advanceAccountId) {
            throw new BadRequestException(
                isCustomer
                    ? 'Customer advance account (CGNC 4421) missing — configure account_mappings or seed the CGNC chart'
                    : 'Supplier advance account (CGNC 3421) missing — configure account_mappings or seed the CGNC chart',
            );
        }

        const cashAccountId = await this.accountingAutomationService.resolveAccountId(
            organizationId,
            'cash',
            'bank',
        );
        if (!cashAccountId) {
            throw new BadRequestException('Account mapping missing for cash/bank.');
        }

        // Resolve bank-specific GL account if a bank account was chosen
        const supabase = this.databaseService.getAdminClient();
        let cashLedgerAccountId = cashAccountId;
        if (dto.bank_account_id) {
            const { data: bankAccount } = await supabase
                .from('bank_accounts')
                .select('gl_account_id')
                .eq('id', dto.bank_account_id)
                .eq('organization_id', organizationId)
                .single();
            if (bankAccount?.gl_account_id) {
                cashLedgerAccountId = bankAccount.gl_account_id;
            }
        }

        const paymentNumber = await this.sequencesService.generatePaymentNumber(organizationId);
        const journalEntryNumber = await this.sequencesService.generateJournalEntryNumber(organizationId);
        const fx = Number(dto.exchange_rate ?? 1) || 1;
        const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
        const amount = round2(Number(dto.amount) * fx);
        const now = new Date().toISOString();

        const { paymentId, journalEntryId } = await this.databaseService.executeInPgTransaction(async (pgClient) => {
            // 1. Insert advance payment row
            const pRes = await pgClient.query(
                `INSERT INTO accounting_payments (
                    organization_id, payment_number, payment_type, payment_method,
                    payment_date, amount, party_id, party_name, party_type,
                    bank_account_id, reference_number, currency_code, exchange_rate,
                    remarks, status, created_by,
                    is_advance, advance_account_id
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                    $14, 'submitted', $15, true, $16
                ) RETURNING id`,
                [
                    organizationId,
                    paymentNumber,
                    paymentType,
                    dto.payment_method || 'bank_transfer',
                    postingDate,
                    dto.amount,
                    dto.party_id,
                    dto.party_name,
                    dto.party_kind, // 'customer' or 'supplier'
                    dto.bank_account_id || null,
                    dto.reference_number || null,
                    dto.currency_code || 'MAD',
                    fx,
                    dto.notes || null,
                    userId,
                    advanceAccountId,
                ],
            );
            const paymentId = pRes.rows[0].id;

            // 2. Create journal entry
            const jeRes = await pgClient.query(
                `INSERT INTO journal_entries (organization_id, entry_number, entry_date, posting_date, reference_type, reference_number, reference_id, remarks, created_by, status)
                 VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, 'draft') RETURNING id`,
                [
                    organizationId,
                    journalEntryNumber,
                    postingDate,
                    'Advance',
                    paymentNumber,
                    paymentId,
                    `Advance ${isCustomer ? 'received from' : 'paid to'} ${dto.party_name}`,
                    userId,
                ],
            );
            const jeId = jeRes.rows[0].id;

            // 3. JE lines:
            //   Customer prepayment (receive):  DR Bank / CR Customer Advance (4421)
            //   Supplier advance (paid):        DR Supplier Advance (3421) / CR Bank
            const cashLine = isCustomer
                ? { account: cashLedgerAccountId, debit: amount, credit: 0 }
                : { account: cashLedgerAccountId, debit: 0, credit: amount };
            const advanceLine = isCustomer
                ? { account: advanceAccountId, debit: 0, credit: amount }
                : { account: advanceAccountId, debit: amount, credit: 0 };

            for (const line of [cashLine, advanceLine]) {
                await pgClient.query(
                    `INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        jeId,
                        line.account,
                        `Advance ${paymentNumber}: ${dto.party_name}`,
                        line.debit,
                        line.credit,
                    ],
                );
            }

            await pgClient.query(
                `UPDATE journal_entries SET status='posted', posted_by=$1, posted_at=$2, total_debit=$3, total_credit=$3 WHERE id=$4`,
                [userId, now, amount, jeId],
            );
            await this.accountingAutomationService.applyCashSettlementDate(pgClient, jeId, postingDate);

            await pgClient.query(
                `UPDATE accounting_payments SET journal_entry_id=$1 WHERE id=$2`,
                [jeId, paymentId],
            );

            // Update bank balance
            if (dto.bank_account_id) {
                const delta = isCustomer ? Number(dto.amount) : -Number(dto.amount);
                await pgClient.query(
                    `UPDATE bank_accounts
                     SET current_balance = COALESCE(current_balance, 0) + $1, updated_at = $2
                     WHERE id = $3 AND organization_id = $4`,
                    [delta, now, dto.bank_account_id, organizationId],
                );
            }

            return { paymentId, journalEntryId: jeId };
        });

        const { data: payment } = await supabase
            .from('accounting_payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        this.logger.log(`Advance ${paymentNumber} recorded for ${dto.party_name} (${dto.party_kind})`);
        return { payment, journal_entry_id: journalEntryId };
    }

    /**
     * Apply an open advance to one or more invoices. Inserts payment_allocations
     * and posts an internal-transfer JE moving the amount from the advance
     * account to AR/AP, then updates each invoice's outstanding/paid/status.
     */
    async applyAdvance(
        advanceId: string,
        dto: ApplyAdvanceDto,
        organizationId: string,
        userId: string,
    ): Promise<{ journal_entry_id: string; allocated_total: number }> {
        const supabase = this.databaseService.getAdminClient();

        const { data: advance, error: advErr } = await supabase
            .from('accounting_payments')
            .select('*, allocations:payment_allocations(allocated_amount)')
            .eq('id', advanceId)
            .eq('organization_id', organizationId)
            .maybeSingle();

        if (advErr || !advance) throw new NotFoundException('Advance not found');
        if (!advance.is_advance) throw new BadRequestException('Payment is not an advance');
        if (advance.status === 'cancelled') throw new BadRequestException('Cannot apply a cancelled advance');
        if (!advance.advance_account_id) throw new BadRequestException('Advance has no advance_account_id — was it created via recordAdvance?');

        const alreadyApplied = (advance.allocations || []).reduce(
            (sum: number, a: { allocated_amount: number }) => sum + Number(a.allocated_amount),
            0,
        );
        const remaining = Number(advance.amount) - alreadyApplied;
        const totalRequest = dto.allocations.reduce((s, a) => s + Number(a.amount), 0);
        if (totalRequest > remaining + 0.01) {
            throw new BadRequestException(
                `Allocation ${totalRequest} exceeds remaining advance balance ${remaining}`,
            );
        }

        const isCustomer = advance.payment_type === PaymentType.RECEIVE;
        const expectedInvoiceType = isCustomer ? 'sales' : 'purchase';

        const invoiceIds = dto.allocations.map((a) => a.invoice_id);
        const { data: invoices } = await supabase
            .from('invoices')
            .select('id, invoice_number, invoice_type, outstanding_amount, status, party_id')
            .in('id', invoiceIds)
            .eq('organization_id', organizationId);

        if (!invoices || invoices.length !== invoiceIds.length) {
            throw new BadRequestException('One or more invoices not found');
        }
        for (const inv of invoices) {
            if (inv.invoice_type !== expectedInvoiceType) {
                throw new BadRequestException(
                    `Invoice ${inv.invoice_number} is ${inv.invoice_type}; advance is for ${expectedInvoiceType}`,
                );
            }
            if (inv.party_id && advance.party_id && inv.party_id !== advance.party_id) {
                throw new BadRequestException(
                    `Invoice ${inv.invoice_number} party does not match the advance party`,
                );
            }
        }
        for (const a of dto.allocations) {
            const inv = invoices.find((i) => i.id === a.invoice_id)!;
            if (a.amount > Number(inv.outstanding_amount) + 0.01) {
                throw new BadRequestException(
                    `Allocation ${a.amount} exceeds outstanding ${inv.outstanding_amount} on ${inv.invoice_number}`,
                );
            }
        }

        const postingDate = dto.posting_date || new Date().toISOString().split('T')[0];
        await this.accountingAutomationService.assertPeriodOpen(organizationId, postingDate);

        const counterAccountId = await this.accountingAutomationService.resolveAccountId(
            organizationId,
            isCustomer ? 'receivable' : 'payable',
            'trade',
        );
        if (!counterAccountId) {
            throw new BadRequestException(
                `Account mapping missing for ${isCustomer ? 'receivable' : 'payable'}/trade`,
            );
        }

        const journalEntryNumber = await this.sequencesService.generateJournalEntryNumber(organizationId);
        const fx = Number(advance.exchange_rate ?? 1) || 1;
        const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
        const now = new Date().toISOString();

        const journalEntryId = await this.databaseService.executeInPgTransaction(async (pgClient) => {
            // 1. Insert allocations
            for (const a of dto.allocations) {
                await pgClient.query(
                    `INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount) VALUES ($1, $2, $3)`,
                    [advanceId, a.invoice_id, a.amount],
                );
            }

            // 2. Update invoice outstanding/status
            for (const a of dto.allocations) {
                const inv = invoices.find((i) => i.id === a.invoice_id)!;
                const newOutstanding = Math.max(0, Number(inv.outstanding_amount) - a.amount);
                const newStatus = newOutstanding <= 0.01 ? 'paid' : 'partially_paid';
                await pgClient.query(
                    `UPDATE invoices
                     SET outstanding_amount=$1, paid_amount=COALESCE(paid_amount,0)+$2, status=$3, updated_at=$4
                     WHERE id=$5`,
                    [newOutstanding, a.amount, newStatus, now, a.invoice_id],
                );
            }

            // 3. Internal-transfer JE
            //   Customer prepayment apply: DR Customer Advance / CR Receivable
            //   Supplier advance apply:    DR Payable / CR Supplier Advance
            const jeRes = await pgClient.query(
                `INSERT INTO journal_entries (organization_id, entry_number, entry_date, posting_date, reference_type, reference_number, reference_id, remarks, created_by, status)
                 VALUES ($1, $2, $3, $3, 'Advance Allocation', $4, $5, $6, $7, 'draft') RETURNING id`,
                [
                    organizationId,
                    journalEntryNumber,
                    postingDate,
                    advance.payment_number,
                    advanceId,
                    `Apply advance ${advance.payment_number} for ${advance.party_name}`,
                    userId,
                ],
            );
            const jeId = jeRes.rows[0].id;

            for (const a of dto.allocations) {
                const inv = invoices.find((i) => i.id === a.invoice_id)!;
                const lineAmount = round2(Number(a.amount) * fx);
                const advLine = isCustomer
                    ? { account: advance.advance_account_id, debit: lineAmount, credit: 0 }
                    : { account: advance.advance_account_id, debit: 0, credit: lineAmount };
                const counterLine = isCustomer
                    ? { account: counterAccountId, debit: 0, credit: lineAmount }
                    : { account: counterAccountId, debit: lineAmount, credit: 0 };

                for (const line of [advLine, counterLine]) {
                    await pgClient.query(
                        `INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit, reference_type, reference_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            jeId,
                            line.account,
                            `Apply advance to ${inv.invoice_number}`,
                            line.debit,
                            line.credit,
                            'invoice',
                            a.invoice_id,
                        ],
                    );
                }
            }

            const totalDebit = round2(totalRequest * fx);
            await pgClient.query(
                `UPDATE journal_entries SET status='posted', posted_by=$1, posted_at=$2, total_debit=$3, total_credit=$3 WHERE id=$4`,
                [userId, now, totalDebit, jeId],
            );
            await this.accountingAutomationService.applyCashSettlementDate(pgClient, jeId, postingDate);

            return jeId;
        });

        this.logger.log(`Advance ${advance.payment_number} applied to ${dto.allocations.length} invoice(s)`);
        return { journal_entry_id: journalEntryId, allocated_total: totalRequest };
    }

    /**
     * List open advances (is_advance=true with remaining balance > 0).
     * Optionally filter by party.
     */
    async listOpenAdvances(
        organizationId: string,
        partyId?: string,
        partyType?: string,
    ): Promise<any[]> {
        const supabase = this.databaseService.getAdminClient();
        let query = supabase
            .from('accounting_payments')
            .select(`
                *,
                allocations:payment_allocations(allocated_amount)
            `)
            .eq('organization_id', organizationId)
            .eq('is_advance', true)
            .neq('status', 'cancelled');

        if (partyId) query = query.eq('party_id', partyId);
        if (partyType) query = query.eq('party_type', partyType);

        const { data, error } = await query.order('payment_date', { ascending: false });
        if (error) throw new BadRequestException(`Failed to list advances: ${error.message}`);

        return (data || [])
            .map((adv: any) => {
                const applied = (adv.allocations || []).reduce(
                    (s: number, a: { allocated_amount: number }) => s + Number(a.allocated_amount),
                    0,
                );
                const remaining = Number(adv.amount) - applied;
                return { ...adv, applied_amount: applied, remaining_amount: remaining };
            })
            .filter((adv: { remaining_amount: number }) => adv.remaining_amount > 0.01);
    }
}
