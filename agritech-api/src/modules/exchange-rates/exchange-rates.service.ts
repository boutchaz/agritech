import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';

export interface ExchangeRate {
  id: string;
  organization_id: string | null;
  rate_date: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source: string;
  created_at: string;
}

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(
    organizationId: string,
    filters?: { from_currency?: string; to_currency?: string; from_date?: string; to_date?: string },
  ): Promise<ExchangeRate[]> {
    const supabase = this.databaseService.getAdminClient();
    let query = supabase
      .from('exchange_rates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('rate_date', { ascending: false });

    if (filters?.from_currency) query = query.eq('from_currency', filters.from_currency.toUpperCase());
    if (filters?.to_currency) query = query.eq('to_currency', filters.to_currency.toUpperCase());
    if (filters?.from_date) query = query.gte('rate_date', filters.from_date);
    if (filters?.to_date) query = query.lte('rate_date', filters.to_date);

    const { data, error } = await query;
    if (error) {
      this.logger.error(`Failed to list exchange rates: ${error.message}`);
      throw new BadRequestException(`Failed to list exchange rates: ${error.message}`);
    }
    return (data || []) as ExchangeRate[];
  }

  async findOne(id: string, organizationId: string): Promise<ExchangeRate> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Exchange rate not found: ${id}`);
    return data as ExchangeRate;
  }

  async create(organizationId: string, dto: CreateExchangeRateDto): Promise<ExchangeRate> {
    const supabase = this.databaseService.getAdminClient();
    const payload = {
      organization_id: organizationId,
      rate_date: dto.rate_date,
      from_currency: dto.from_currency.toUpperCase(),
      to_currency: dto.to_currency.toUpperCase(),
      rate: dto.rate,
      source: dto.source || 'manual',
    };
    const { data, error } = await supabase
      .from('exchange_rates')
      .insert(payload)
      .select()
      .single();
    if (error) {
      this.logger.error(`Failed to create exchange rate: ${error.message}`);
      throw new BadRequestException(error.message);
    }
    return data as ExchangeRate;
  }

  async update(id: string, organizationId: string, dto: UpdateExchangeRateDto): Promise<ExchangeRate> {
    const supabase = this.databaseService.getAdminClient();
    const payload: Record<string, unknown> = {};
    if (dto.rate_date !== undefined) payload.rate_date = dto.rate_date;
    if (dto.from_currency !== undefined) payload.from_currency = dto.from_currency.toUpperCase();
    if (dto.to_currency !== undefined) payload.to_currency = dto.to_currency.toUpperCase();
    if (dto.rate !== undefined) payload.rate = dto.rate;
    if (dto.source !== undefined) payload.source = dto.source;

    const { data, error } = await supabase
      .from('exchange_rates')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Exchange rate not found: ${id}`);
    return data as ExchangeRate;
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase
      .from('exchange_rates')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);
    if (error) throw new BadRequestException(error.message);
  }

  /**
   * Get the exchange rate for converting fromCurrency to toCurrency on a date.
   * - Same currency => 1.
   * - Else: latest org-specific rate <= date.
   * - Falls back to global (organization_id IS NULL) rate if no org rate.
   * Throws if none found.
   */
  async getRate(
    organizationId: string,
    fromCurrency: string,
    toCurrency: string,
    date: string,
  ): Promise<number> {
    const from = (fromCurrency || '').toUpperCase();
    const to = (toCurrency || '').toUpperCase();
    if (!from || !to) {
      throw new BadRequestException('from_currency and to_currency are required');
    }
    if (from === to) return 1;

    const supabase = this.databaseService.getAdminClient();

    // 1. Org-specific
    const { data: orgRate, error: orgErr } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('organization_id', organizationId)
      .eq('from_currency', from)
      .eq('to_currency', to)
      .lte('rate_date', date)
      .order('rate_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orgErr) {
      this.logger.warn(`Org rate lookup failed: ${orgErr.message}`);
    }
    if (orgRate?.rate) return Number(orgRate.rate);

    // 2. Global fallback
    const { data: globalRate, error: gErr } = await supabase
      .from('exchange_rates')
      .select('rate')
      .is('organization_id', null)
      .eq('from_currency', from)
      .eq('to_currency', to)
      .lte('rate_date', date)
      .order('rate_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (gErr) {
      this.logger.warn(`Global rate lookup failed: ${gErr.message}`);
    }
    if (globalRate?.rate) return Number(globalRate.rate);

    // 3. Inverse rate (1/rate) attempt
    const { data: invRate } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('organization_id', organizationId)
      .eq('from_currency', to)
      .eq('to_currency', from)
      .lte('rate_date', date)
      .order('rate_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (invRate?.rate && Number(invRate.rate) > 0) return 1 / Number(invRate.rate);

    throw new BadRequestException(
      `No exchange rate found for ${from} -> ${to} on or before ${date}`,
    );
  }
}
