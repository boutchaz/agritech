import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface SupportedCountry {
  id: string;
  country_code: string;
  country_name: string;
  region: string;
  enabled: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportedCountryDto {
  country_code: string;
  country_name: string;
  region: string;
  enabled?: boolean;
  display_order?: number;
}

export interface UpdateSupportedCountryDto {
  country_name?: string;
  region?: string;
  enabled?: boolean;
  display_order?: number;
}

@Injectable()
export class SupportedCountriesService {
  private readonly logger = new Logger(SupportedCountriesService.name);
  private readonly supabaseAdmin;

  constructor(private databaseService: DatabaseService) {
    this.supabaseAdmin = this.databaseService.getAdminClient();
  }

  async findAll(): Promise<SupportedCountry[]> {
    const { data, error } = await this.supabaseAdmin
      .from('supported_countries')
      .select('*')
      .order('region')
      .order('display_order');

    if (error) {
      this.logger.error(`Failed to fetch supported countries: ${error.message}`);
      throw error;
    }

    return data || [];
  }

  async findEnabled(): Promise<SupportedCountry[]> {
    const { data, error } = await this.supabaseAdmin
      .from('supported_countries')
      .select('*')
      .eq('enabled', true)
      .order('region')
      .order('display_order');

    if (error) {
      this.logger.error(`Failed to fetch enabled countries: ${error.message}`);
      throw error;
    }

    return data || [];
  }

  async create(dto: CreateSupportedCountryDto): Promise<SupportedCountry> {
    const { data, error } = await this.supabaseAdmin
      .from('supported_countries')
      .insert({
        country_code: dto.country_code.toUpperCase(),
        country_name: dto.country_name,
        region: dto.region,
        enabled: dto.enabled ?? true,
        display_order: dto.display_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create supported country: ${error.message}`);
      throw error;
    }

    return data;
  }

  async update(id: string, dto: UpdateSupportedCountryDto): Promise<SupportedCountry> {
    const { data, error } = await this.supabaseAdmin
      .from('supported_countries')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update supported country: ${error.message}`);
      throw error;
    }

    if (!data) {
      throw new NotFoundException(`Supported country with id ${id} not found`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabaseAdmin
      .from('supported_countries')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete supported country: ${error.message}`);
      throw error;
    }
  }

  async toggleEnabled(id: string, enabled: boolean): Promise<SupportedCountry> {
    return this.update(id, { enabled });
  }
}
