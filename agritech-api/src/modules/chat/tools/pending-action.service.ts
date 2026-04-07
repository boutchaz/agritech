import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface PendingAction {
  id: string;
  user_id: string;
  organization_id: string;
  tool_name: string;
  parameters: Record<string, any>;
  preview_data: Record<string, any>;
  created_at: string;
  expires_at: string;
}

@Injectable()
export class PendingActionService {
  private readonly logger = new Logger(PendingActionService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Upsert a pending action for a user+org pair.
   * Replaces any existing pending action (one at a time constraint).
   */
  async upsert(
    userId: string,
    organizationId: string,
    toolName: string,
    parameters: Record<string, any>,
    previewData: Record<string, any>,
  ): Promise<PendingAction> {
    const client = this.databaseService.getAdminClient();

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data, error } = await client
      .from('chat_pending_actions')
      .upsert(
        {
          user_id: userId,
          organization_id: organizationId,
          tool_name: toolName,
          parameters,
          preview_data: previewData,
          expires_at: expiresAt,
        },
        { onConflict: 'user_id,organization_id' },
      )
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Failed to upsert pending action: ${error.message}`);
      throw new Error(`Failed to store pending action: ${error.message}`);
    }

    this.logger.log(
      `Pending action upserted: ${toolName} for user ${userId} in org ${organizationId}`,
    );

    return data as PendingAction;
  }

  /**
   * Load the current pending action for a user+org pair.
   * Returns null if no action exists or if it has expired.
   */
  async load(userId: string, organizationId: string): Promise<PendingAction | null> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('chat_pending_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to load pending action: ${error.message}`);
      throw new Error(`Failed to load pending action: ${error.message}`);
    }

    return (data as PendingAction) ?? null;
  }

  /**
   * Delete the pending action for a user+org pair.
   */
  async delete(userId: string, organizationId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('chat_pending_actions')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete pending action: ${error.message}`);
      throw new Error(`Failed to delete pending action: ${error.message}`);
    }

    this.logger.log(
      `Pending action deleted for user ${userId} in org ${organizationId}`,
    );
  }
}
