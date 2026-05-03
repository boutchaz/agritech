import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { StockEntryStatus, StockEntryType } from './dto/create-stock-entry.dto';
import { StockReservationsService } from './stock-reservations.service';

@Injectable()
export class StockEntryApprovalsService {
  private readonly logger = new Logger(StockEntryApprovalsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stockReservationsService: StockReservationsService,
  ) {}

  async requestApproval(stockEntryId: string, organizationId: string, requestedBy: string): Promise<any> {
    return this.databaseService.executeInPgTransaction(async (client) => {
      return this.requestApprovalInTransaction(stockEntryId, organizationId, requestedBy, client);
    });
  }

  async requestApprovalInTransaction(
    stockEntryId: string,
    organizationId: string,
    requestedBy: string,
    client: PoolClient,
  ): Promise<any> {
    const entryResult = await client.query(
      `SELECT id, organization_id, status
       FROM stock_entries
       WHERE id = $1 AND organization_id = $2
       FOR UPDATE`,
      [stockEntryId, organizationId],
    );

    if (entryResult.rows.length === 0) {
      throw new NotFoundException('Stock entry not found');
    }

    const stockEntry = entryResult.rows[0];

    if (stockEntry.status !== StockEntryStatus.DRAFT) {
      throw new BadRequestException('Only draft stock entries can request approval');
    }

    const existingApprovalResult = await client.query(
      `SELECT id
       FROM stock_entry_approvals
       WHERE stock_entry_id = $1 AND status = 'pending'`,
      [stockEntryId],
    );

    if (existingApprovalResult.rows.length > 0) {
      throw new BadRequestException('A pending approval request already exists for this stock entry');
    }

    const approvalResult = await client.query(
      `INSERT INTO stock_entry_approvals (stock_entry_id, requested_by, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [stockEntryId, requestedBy],
    );

    await client.query(
      `UPDATE stock_entries
       SET status = $1, updated_at = NOW(), updated_by = $2
       WHERE id = $3 AND organization_id = $4`,
      [StockEntryStatus.SUBMITTED, requestedBy, stockEntryId, organizationId],
    );

    this.logger.log(`Approval requested for stock entry ${stockEntryId}`);

    return approvalResult.rows[0];
  }

  async approveEntry(approvalId: string, organizationId: string, approvedBy: string): Promise<any> {
    return this.databaseService.executeInPgTransaction(async (client) => {
      const approval = await this.getApprovalForUpdate(approvalId, organizationId, client);

      if (approval.status !== 'pending') {
        throw new BadRequestException('Only pending approval requests can be approved');
      }

      const result = await client.query(
        `UPDATE stock_entry_approvals
         SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [approvedBy, approvalId],
      );

      this.logger.log(`Approval ${approvalId} approved`);

      return result.rows[0];
    });
  }

  async rejectEntry(
    approvalId: string,
    organizationId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<any> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    return this.databaseService.executeInPgTransaction(async (client) => {
      const approval = await this.getApprovalForUpdate(approvalId, organizationId, client);

      if (approval.status !== 'pending') {
        throw new BadRequestException('Only pending approval requests can be rejected');
      }

      const result = await client.query(
        `UPDATE stock_entry_approvals
         SET status = 'rejected', rejected_by = $1, rejected_at = NOW(), rejection_reason = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [rejectedBy, reason.trim(), approvalId],
      );

      await client.query(
        `UPDATE stock_entries
         SET status = $1, updated_at = NOW(), updated_by = $2
         WHERE id = $3 AND organization_id = $4`,
        [StockEntryStatus.DRAFT, rejectedBy, approval.stock_entry_id, organizationId],
      );

      await this.stockReservationsService.releaseReservationsForReference(
        'stock_entry',
        approval.stock_entry_id,
        organizationId,
        client,
      );

      this.logger.log(`Approval ${approvalId} rejected`);

      return result.rows[0];
    });
  }

  async getPendingApprovals(organizationId: string, filters?: any): Promise<any> {
    return this.databaseService.executeInPgTransaction(async (client) => {
      const values: any[] = [organizationId];
      const conditions = [`se.organization_id = $1`, `sea.status = 'pending'`];

      if (filters?.entryType) {
        values.push(filters.entryType);
        conditions.push(`se.entry_type = $${values.length}`);
      }

      if (filters?.requestedBy) {
        values.push(filters.requestedBy);
        conditions.push(`sea.requested_by = $${values.length}`);
      }

      const result = await client.query(
        `SELECT sea.*,
                se.entry_number, se.entry_type, se.entry_date, se.status AS stock_entry_status,
                se.from_warehouse_id, se.to_warehouse_id,
                w.name AS warehouse_name,
                u.raw_user_meta_data->>'full_name' AS requested_by_name,
                (SELECT COUNT(*) FROM stock_entry_items sei WHERE sei.stock_entry_id = se.id) AS total_items,
                (SELECT COALESCE(SUM(sei.quantity * COALESCE(sei.cost_per_unit, 0)), 0)
                 FROM stock_entry_items sei WHERE sei.stock_entry_id = se.id) AS total_value
         FROM stock_entry_approvals sea
         INNER JOIN stock_entries se ON se.id = sea.stock_entry_id
         LEFT JOIN warehouses w ON w.id = COALESCE(se.to_warehouse_id, se.from_warehouse_id)
         LEFT JOIN auth.users u ON u.id = sea.requested_by
         WHERE ${conditions.join(' AND ')}
         ORDER BY sea.created_at ASC`,
        values,
      );

      return result.rows.map((row) => ({
        id: row.id,
        entryId: row.stock_entry_id,
        entryNumber: row.entry_number,
        entryType: row.entry_type,
        entryDate: row.entry_date,
        requestedByName: row.requested_by_name || 'Unknown',
        warehouseName: row.warehouse_name || 'Unknown',
        totalItems: parseInt(row.total_items, 10) || 0,
        totalValue: parseFloat(row.total_value) || 0,
        status: row.status,
        requestedAt: row.created_at,
      }));
    });
  }

  async requiresApproval(userRole: string, entryType: string, totalValue: number): Promise<boolean> {
    const role = userRole?.toLowerCase();

    if (role === 'day_laborer' || role === 'farm_worker') {
      return true;
    }

    if (role === 'farm_manager') {
      return entryType === StockEntryType.STOCK_TRANSFER && totalValue > 10000;
    }

    if (role === 'organization_admin' || role === 'system_admin') {
      return false;
    }

    return true;
  }

  async resolveUserRole(userId: string, organizationId: string): Promise<string | null> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('organization_users')
      .select('roles(name)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      this.logger.warn(`Could not resolve role for user ${userId} in org ${organizationId}: ${error?.message}`);
      return null;
    }

    return (data.roles as any)?.name ?? null;
  }

  async autoRequestApprovalIfNeeded(
    stockEntryId: string,
    organizationId: string,
    userId: string,
    entryType: string,
    totalValue: number,
  ): Promise<{ approvalRequested: boolean; approvalId?: string }> {
    const userRole = await this.resolveUserRole(userId, organizationId);

    if (!userRole) {
      this.logger.warn(`No role found for user ${userId}, skipping auto-approval check`);
      return { approvalRequested: false };
    }

    const needsApproval = await this.requiresApproval(userRole, entryType, totalValue);

    if (!needsApproval) {
      return { approvalRequested: false };
    }

    const approval = await this.requestApproval(stockEntryId, organizationId, userId);

    return { approvalRequested: true, approvalId: approval.id };
  }

  async assertApprovedForPosting(
    stockEntryId: string,
    organizationId: string,
    client?: PoolClient,
  ): Promise<void> {
    const runCheck = async (txClient: PoolClient) => {
      const result = await txClient.query(
        `SELECT sea.id
         FROM stock_entry_approvals sea
         INNER JOIN stock_entries se ON se.id = sea.stock_entry_id
         WHERE sea.stock_entry_id = $1
           AND se.organization_id = $2
           AND sea.status = 'approved'
         ORDER BY sea.approved_at DESC NULLS LAST, sea.created_at DESC
         LIMIT 1`,
        [stockEntryId, organizationId],
      );

      if (result.rows.length === 0) {
        throw new BadRequestException('Stock entry requires approval before posting');
      }
    };

    if (client) {
      await runCheck(client);
      return;
    }

    const pool = this.databaseService.getPgPool();
    const queryClient = await pool.connect();

    try {
      await runCheck(queryClient);
    } finally {
      queryClient.release();
    }
  }

  private async getApprovalForUpdate(
    approvalId: string,
    organizationId: string,
    client: PoolClient,
  ): Promise<any> {
    const result = await client.query(
      `SELECT sea.*, se.organization_id
       FROM stock_entry_approvals sea
       INNER JOIN stock_entries se ON se.id = sea.stock_entry_id
       WHERE sea.id = $1 AND se.organization_id = $2
       FOR UPDATE OF sea, se`,
      [approvalId, organizationId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Stock entry approval not found');
    }

    return result.rows[0];
  }
}
