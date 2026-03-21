import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface AuditMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogParams {
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  changedFields?: string[];
  userId: string;
  organizationId: string;
  meta?: AuditMeta;
}

/**
 * Sensitive fields that should be stripped from audit log data
 * to prevent secrets from being persisted in plain text.
 */
const SENSITIVE_FIELDS = [
  'encrypted_api_key',
  'password',
  'password_hash',
  'secret',
  'token',
  'api_key',
];

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Log a single audit entry with explicit user_id.
   * This bypasses the DB trigger's auth.uid() which is NULL
   * when called from the NestJS service role.
   */
  async logChange(params: AuditLogParams): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const sanitizedOldData = params.oldData
      ? this.stripSensitiveFields(params.oldData)
      : null;
    const sanitizedNewData = params.newData
      ? this.stripSensitiveFields(params.newData)
      : null;

    const { error } = await supabase.from('audit_logs').insert({
      table_name: params.tableName,
      record_id: params.recordId,
      action: params.action,
      old_data: sanitizedOldData,
      new_data: sanitizedNewData,
      changed_fields: params.changedFields || null,
      user_id: params.userId,
      organization_id: params.organizationId,
      ip_address: params.meta?.ipAddress || null,
      user_agent: params.meta?.userAgent || null,
    });

    if (error) {
      // Log the error but don't throw - audit failures should not break business operations
      this.logger.error(
        `Failed to write audit log for ${params.action} on ${params.tableName}:${params.recordId}: ${error.message}`,
      );
    } else {
      this.logger.debug(
        `Audit log recorded: ${params.action} on ${params.tableName}:${params.recordId} by user ${params.userId}`,
      );
    }
  }

  /**
   * Convenience method for INSERT audit entries.
   */
  async logInsert(
    tableName: string,
    recordId: string,
    newData: Record<string, any>,
    userId: string,
    organizationId: string,
    meta?: AuditMeta,
  ): Promise<void> {
    await this.logChange({
      tableName,
      recordId,
      action: 'INSERT',
      oldData: null,
      newData,
      changedFields: Object.keys(newData),
      userId,
      organizationId,
      meta,
    });
  }

  /**
   * Convenience method for UPDATE audit entries.
   * Automatically computes changed_fields by comparing oldData and newData.
   */
  async logUpdate(
    tableName: string,
    recordId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    userId: string,
    organizationId: string,
    meta?: AuditMeta,
  ): Promise<void> {
    const changedFields = this.computeChangedFields(oldData, newData);

    await this.logChange({
      tableName,
      recordId,
      action: 'UPDATE',
      oldData,
      newData,
      changedFields,
      userId,
      organizationId,
      meta,
    });
  }

  /**
   * Convenience method for DELETE audit entries.
   */
  async logDelete(
    tableName: string,
    recordId: string,
    oldData: Record<string, any>,
    userId: string,
    organizationId: string,
    meta?: AuditMeta,
  ): Promise<void> {
    await this.logChange({
      tableName,
      recordId,
      action: 'DELETE',
      oldData,
      newData: null,
      changedFields: null,
      userId,
      organizationId,
      meta,
    });
  }

  /**
   * Compare old and new data objects and return an array of field names that differ.
   */
  private computeChangedFields(
    oldData: Record<string, any>,
    newData: Record<string, any>,
  ): string[] {
    const allKeys = Array.from(
      new Set([
        ...Object.keys(oldData || {}),
        ...Object.keys(newData || {}),
      ]),
    );

    const changed: string[] = [];
    for (const key of allKeys) {
      if (JSON.stringify(oldData?.[key]) !== JSON.stringify(newData?.[key])) {
        changed.push(key);
      }
    }

    return changed;
  }

  /**
   * Remove sensitive fields from data before persisting to audit_logs.
   * Returns a shallow copy with sensitive values replaced by '[REDACTED]'.
   */
  private stripSensitiveFields(
    data: Record<string, any>,
  ): Record<string, any> {
    const sanitized = { ...data };

    for (const field of SENSITIVE_FIELDS) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
