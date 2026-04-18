import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';

type ReservationParams = {
  organizationId: string;
  itemId: string;
  variantId?: string;
  warehouseId: string;
  quantity: number;
  reservedBy: string;
  referenceType: string;
  referenceId: string;
  expiresInMs?: number;
};

@Injectable()
export class StockReservationsService {
  private readonly logger = new Logger(StockReservationsService.name);
  private static readonly DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000;

  constructor(private readonly databaseService: DatabaseService) {}

  async reserveStock(
    params: ReservationParams,
    client?: PoolClient,
  ): Promise<any> {
    if (params.quantity <= 0) {
      throw new BadRequestException('Reservation quantity must be greater than zero');
    }

    const operation = async (txClient: PoolClient) => {
      await txClient.query(
        `UPDATE stock_reservations
         SET status = 'expired', updated_at = NOW()
         WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
         AND status = 'active' AND expires_at <= NOW()
         AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))`,
        [params.organizationId, params.itemId, params.warehouseId, params.variantId ?? null],
      );

      await txClient.query(
        `SELECT id FROM stock_movements
         WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
         AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))
         FOR UPDATE`,
        [params.organizationId, params.itemId, params.warehouseId, params.variantId ?? null],
      );

      await txClient.query(
        `SELECT id FROM stock_reservations
         WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
         AND status = 'active' AND expires_at > NOW()
         AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))
         FOR UPDATE`,
        [params.organizationId, params.itemId, params.warehouseId, params.variantId ?? null],
      );

      const totalResult = await txClient.query(
        `SELECT COALESCE(SUM(quantity), 0) as total
         FROM stock_movements
         WHERE item_id = $1 AND warehouse_id = $2 AND organization_id = $3
         AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))`,
        [params.itemId, params.warehouseId, params.organizationId, params.variantId ?? null],
      );

      const reservedResult = await txClient.query(
        `SELECT COALESCE(SUM(quantity), 0) as reserved
         FROM stock_reservations
         WHERE item_id = $1 AND warehouse_id = $2 AND organization_id = $3
         AND status = 'active' AND expires_at > NOW()
         AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))`,
        [params.itemId, params.warehouseId, params.organizationId, params.variantId ?? null],
      );

      const totalQuantity = parseFloat(totalResult.rows[0]?.total || '0');
      const reservedQuantity = parseFloat(reservedResult.rows[0]?.reserved || '0');
      const availableQuantity = totalQuantity - reservedQuantity;

      if (availableQuantity < params.quantity) {
        throw new BadRequestException(
          `Insufficient available stock: ${availableQuantity} available, ${params.quantity} requested`,
        );
      }

      const expiresAt = new Date(Date.now() + (params.expiresInMs ?? StockReservationsService.DEFAULT_EXPIRY_MS));

      const insertResult = await txClient.query(
        `INSERT INTO stock_reservations (
          organization_id, item_id, variant_id, warehouse_id, quantity,
          reserved_by, expires_at, status, reference_type, reference_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)
        RETURNING *`,
        [
          params.organizationId,
          params.itemId,
          params.variantId ?? null,
          params.warehouseId,
          params.quantity,
          params.reservedBy,
          expiresAt,
          params.referenceType,
          params.referenceId,
        ],
      );

      return insertResult.rows[0];
    };

    return client ? operation(client) : this.executeInPgTransaction(operation);
  }

  async releaseReservation(
    reservationId: string,
    organizationId: string,
    client?: PoolClient,
  ): Promise<void> {
    const operation = async (txClient: PoolClient) => {
      await txClient.query(
        `UPDATE stock_reservations
         SET status = 'released', updated_at = NOW()
         WHERE id = $1 AND organization_id = $2 AND status = 'active'`,
        [reservationId, organizationId],
      );
    };

    if (client) {
      await operation(client);
      return;
    }

    await this.executeInPgTransaction(operation);
  }

  async fulfillReservation(
    reservationId: string,
    organizationId: string,
    client?: PoolClient,
  ): Promise<void> {
    const operation = async (txClient: PoolClient) => {
      await txClient.query(
        `UPDATE stock_reservations
         SET status = 'fulfilled', updated_at = NOW()
         WHERE id = $1 AND organization_id = $2 AND status = 'active'`,
        [reservationId, organizationId],
      );
    };

    if (client) {
      await operation(client);
      return;
    }

    await this.executeInPgTransaction(operation);
  }

  async releaseReservationsForReference(
    referenceType: string,
    referenceId: string,
    organizationId: string,
    client?: PoolClient,
  ): Promise<void> {
    const operation = async (txClient: PoolClient) => {
      await txClient.query(
        `UPDATE stock_reservations
         SET status = 'released', updated_at = NOW()
         WHERE reference_type = $1 AND reference_id = $2 AND organization_id = $3
         AND status = 'active'`,
        [referenceType, referenceId, organizationId],
      );
    };

    if (client) {
      await operation(client);
      return;
    }

    await this.executeInPgTransaction(operation);
  }

  async fulfillReservationsForReference(
    referenceType: string,
    referenceId: string,
    organizationId: string,
    client?: PoolClient,
  ): Promise<void> {
    const operation = async (txClient: PoolClient) => {
      await txClient.query(
        `UPDATE stock_reservations
         SET status = 'fulfilled', updated_at = NOW()
         WHERE reference_type = $1 AND reference_id = $2 AND organization_id = $3
         AND status = 'active'`,
        [referenceType, referenceId, organizationId],
      );
    };

    if (client) {
      await operation(client);
      return;
    }

    await this.executeInPgTransaction(operation);
  }

  async getReservedQuantity(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    variantId?: string,
    client?: PoolClient,
  ): Promise<number> {
    const queryClient = client ?? (await this.databaseService.getPgPool().connect());
    const ownsClient = !client;

    try {
      const result = await queryClient.query(
        `SELECT COALESCE(SUM(quantity), 0) as reserved
         FROM stock_reservations
         WHERE item_id = $1 AND warehouse_id = $2 AND organization_id = $3
         AND status = 'active' AND expires_at > NOW()
         AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))`,
        [itemId, warehouseId, organizationId, variantId ?? null],
      );

      return parseFloat(result.rows[0]?.reserved || '0');
    } finally {
      if (ownsClient) {
        queryClient.release();
      }
    }
  }

  async expireReservations(client?: PoolClient): Promise<number> {
    const operation = async (txClient: PoolClient) => {
      const result = await txClient.query(
        `UPDATE stock_reservations
         SET status = 'expired', updated_at = NOW()
         WHERE status = 'active' AND expires_at <= NOW()
         RETURNING id`,
      );

      return result.rowCount ?? result.rows.length;
    };

    return client ? operation(client) : this.executeInPgTransaction(operation);
  }

  async getAvailableQuantity(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    variantId?: string,
    client?: PoolClient,
  ): Promise<number> {
    const queryClient = client ?? (await this.databaseService.getPgPool().connect());
    const ownsClient = !client;

    try {
      await queryClient.query(
        `UPDATE stock_reservations
         SET status = 'expired', updated_at = NOW()
         WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
         AND status = 'active' AND expires_at <= NOW()
         AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))`,
        [organizationId, itemId, warehouseId, variantId ?? null],
      );

      const levelResult = await queryClient.query(
        `SELECT quantity, reserved_quantity
         FROM warehouse_stock_levels
         WHERE organization_id = $1 AND item_id = $2 AND warehouse_id = $3
         AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))`,
        [organizationId, itemId, warehouseId, variantId ?? null],
      );

      if (levelResult.rows.length > 0) {
        const quantity = parseFloat(levelResult.rows[0]?.quantity || '0');
        const reserved = parseFloat(levelResult.rows[0]?.reserved_quantity || '0');
        return quantity - reserved;
      }

      const totalResult = await queryClient.query(
        `SELECT COALESCE(SUM(quantity), 0) as total
         FROM stock_movements
         WHERE item_id = $1 AND warehouse_id = $2 AND organization_id = $3
         AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))`,
        [itemId, warehouseId, organizationId, variantId ?? null],
      );

      const reservedResult = await queryClient.query(
        `SELECT COALESCE(SUM(quantity), 0) as reserved
         FROM stock_reservations
         WHERE item_id = $1 AND warehouse_id = $2 AND organization_id = $3
         AND status = 'active' AND expires_at > NOW()
         AND (variant_id = $4 OR ($4 IS NULL AND variant_id IS NULL))`,
        [itemId, warehouseId, organizationId, variantId ?? null],
      );

      const totalQuantity = parseFloat(totalResult.rows[0]?.total || '0');
      const reservedQuantity = parseFloat(reservedResult.rows[0]?.reserved || '0');

      return totalQuantity - reservedQuantity;
    } finally {
      if (ownsClient) {
        queryClient.release();
      }
    }
  }

  private async executeInPgTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const pool = this.databaseService.getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      const err = error as Error;
      await client.query('ROLLBACK');
      this.logger.error(`Reservation transaction failed: ${err.message}`, err.stack);
      throw error;
    } finally {
      client.release();
    }
  }
}
