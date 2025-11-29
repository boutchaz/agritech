import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import {
    CreatePaymentDto,
    AllocatePaymentDto,
    UpdatePaymentStatusDto,
    PaymentType
} from './dto';

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
        const supabaseClient = this.databaseService.getClient();

        try {
            // Generate payment number
            const paymentNumber = await this.sequencesService.getNextSequence(
                organizationId,
                'payment' as any,
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
                    bank_account_id: dto.bank_account_id,
                    reference_number: dto.reference_number,
                    currency_code: dto.currency_code || 'MAD',
                    exchange_rate: dto.exchange_rate || 1.0,
                    remarks: dto.remarks,
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
        const supabaseClient = this.databaseService.getClient();

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

            // Update payment status to submitted
            const { error: updateError } = await supabaseClient
                .from('accounting_payments')
                .update({
                    status: 'submitted',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', paymentId);

            if (updateError) {
                this.logger.error('Error updating payment status:', updateError);
                throw new BadRequestException(`Failed to update payment status: ${updateError.message}`);
            }

            // Note: Invoice amounts and status are automatically updated by database trigger
            // The trigger 'update_invoice_after_payment' handles:
            // - paid_amount calculation
            // - outstanding_amount calculation
            // - status transition (partially_paid / paid)

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

            return updatedPayment;
        } catch (error) {
            this.logger.error('Error in allocatePayment:', error);
            throw error;
        }
    }

    /**
     * Get all payments with optional filters
     */
    async findAll(organizationId: string, filters?: any) {
        const supabaseClient = this.databaseService.getClient();

        try {
            let query = supabaseClient
                .from('accounting_payments')
                .select(`
          *,
          allocations:payment_allocations(
            *,
            invoice:invoices(id, invoice_number, invoice_type)
          )
        `)
                .eq('organization_id', organizationId)
                .order('payment_date', { ascending: false });

            // Apply filters
            if (filters?.payment_type) {
                query = query.eq('payment_type', filters.payment_type);
            }

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            if (filters?.date_from) {
                query = query.gte('payment_date', filters.date_from);
            }

            if (filters?.date_to) {
                query = query.lte('payment_date', filters.date_to);
            }

            const { data, error } = await query;

            if (error) {
                this.logger.error('Error fetching payments:', error);
                throw new BadRequestException(`Failed to fetch payments: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            this.logger.error('Error in findAll payments:', error);
            throw error;
        }
    }

    /**
     * Get a single payment by ID
     */
    async findOne(id: string, organizationId: string) {
        const supabaseClient = this.databaseService.getClient();

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
        const supabaseClient = this.databaseService.getClient();

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
        const supabaseClient = this.databaseService.getClient();

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
