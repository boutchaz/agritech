import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EncryptionService } from '../../common/services/encryption.service';
import {
  AIProviderType,
  UpsertAIProviderDto,
  AIProviderSettingsResponseDto,
} from './dto';

@Injectable()
export class OrganizationAISettingsService {
  private readonly logger = new Logger(OrganizationAISettingsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Get all AI provider settings for an organization
   */
  async getProviderSettings(
    organizationId: string,
  ): Promise<AIProviderSettingsResponseDto[]> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('organization_ai_settings')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to fetch AI settings: ${error.message}`);
      throw new BadRequestException('Failed to fetch AI provider settings');
    }

    // Build response for all providers
    const providers = Object.values(AIProviderType);
    return providers.map((provider) => {
      const setting = data?.find((s) => s.provider === provider);

      if (!setting) {
        return {
          provider,
          configured: false,
          enabled: false,
        };
      }

      // Decrypt to mask the key
      let maskedKey: string | undefined;
      if (setting.encrypted_api_key) {
        try {
          const decrypted = this.encryptionService.decrypt(setting.encrypted_api_key);
          maskedKey = this.encryptionService.maskApiKey(decrypted);
        } catch {
          maskedKey = '****';
        }
      }

      return {
        provider: setting.provider as AIProviderType,
        configured: true,
        enabled: setting.enabled ?? true,
        masked_key: maskedKey,
        updated_at: setting.updated_at,
      };
    });
  }

  /**
   * Create or update an AI provider setting
   */
  async upsertProvider(
    organizationId: string,
    dto: UpsertAIProviderDto,
  ): Promise<AIProviderSettingsResponseDto> {
    const supabase = this.databaseService.getAdminClient();

    // Validate API key format
    if (!this.encryptionService.validateApiKeyFormat(dto.api_key, dto.provider)) {
      throw new BadRequestException(
        `Invalid API key format for ${dto.provider}. Please check your API key.`,
      );
    }

    // Encrypt the API key
    const encryptedApiKey = this.encryptionService.encrypt(dto.api_key);

    // Check if setting already exists
    const { data: existing } = await supabase
      .from('organization_ai_settings')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('provider', dto.provider)
      .single();

    const now = new Date().toISOString();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('organization_ai_settings')
        .update({
          encrypted_api_key: encryptedApiKey,
          enabled: dto.enabled ?? true,
          updated_at: now,
        })
        .eq('id', existing.id);

      if (error) {
        this.logger.error(`Failed to update AI settings: ${error.message}`);
        throw new BadRequestException('Failed to update AI provider settings');
      }
    } else {
      // Insert new
      const { error } = await supabase.from('organization_ai_settings').insert({
        organization_id: organizationId,
        provider: dto.provider,
        encrypted_api_key: encryptedApiKey,
        enabled: dto.enabled ?? true,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        this.logger.error(`Failed to create AI settings: ${error.message}`);
        throw new BadRequestException('Failed to create AI provider settings');
      }
    }

    this.logger.log(
      `AI provider ${dto.provider} configured for organization ${organizationId}`,
    );

    return {
      provider: dto.provider,
      configured: true,
      enabled: dto.enabled ?? true,
      masked_key: this.encryptionService.maskApiKey(dto.api_key),
      updated_at: now,
    };
  }

  /**
   * Delete an AI provider setting
   */
  async deleteProvider(
    organizationId: string,
    provider: AIProviderType,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const { error } = await supabase
      .from('organization_ai_settings')
      .delete()
      .eq('organization_id', organizationId)
      .eq('provider', provider);

    if (error) {
      this.logger.error(`Failed to delete AI settings: ${error.message}`);
      throw new BadRequestException('Failed to delete AI provider settings');
    }

    this.logger.log(
      `AI provider ${provider} removed for organization ${organizationId}`,
    );
  }

  /**
   * Get decrypted API key for a provider (internal use only)
   */
  async getDecryptedApiKey(
    organizationId: string,
    provider: AIProviderType,
  ): Promise<string | null> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('organization_ai_settings')
      .select('encrypted_api_key, enabled')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .single();

    if (error || !data) {
      return null;
    }

    if (!data.enabled) {
      return null;
    }

    try {
      return this.encryptionService.decrypt(data.encrypted_api_key);
    } catch {
      this.logger.error(`Failed to decrypt API key for ${provider}`);
      return null;
    }
  }

  /**
   * Toggle provider enabled status
   */
  async toggleProvider(
    organizationId: string,
    provider: AIProviderType,
    enabled: boolean,
  ): Promise<AIProviderSettingsResponseDto> {
    const supabase = this.databaseService.getAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from('organization_ai_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException(`Provider ${provider} is not configured`);
    }

    const { error } = await supabase
      .from('organization_ai_settings')
      .update({
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      throw new BadRequestException('Failed to toggle provider status');
    }

    let maskedKey: string | undefined;
    if (existing.encrypted_api_key) {
      try {
        const decrypted = this.encryptionService.decrypt(existing.encrypted_api_key);
        maskedKey = this.encryptionService.maskApiKey(decrypted);
      } catch {
        maskedKey = '****';
      }
    }

    return {
      provider,
      configured: true,
      enabled,
      masked_key: maskedKey,
      updated_at: new Date().toISOString(),
    };
  }
}
