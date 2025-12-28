import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateAnalysisDto,
  UpdateAnalysisDto,
  AnalysisFiltersDto,
  CreateRecommendationDto,
  UpdateRecommendationDto,
} from './dto';

@Injectable()
export class AnalysesService {
  private readonly supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger(AnalysesService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Get all analyses with optional filters
   */
  async findAll(organizationId: string, filters: AnalysisFiltersDto) {
    this.logger.log(`Finding analyses for org ${organizationId} with filters:`, filters);

    try {
      let parcelIds: string[] = [];

      // If farm_id is provided, get all parcels for that farm
      if (filters.farm_id) {
        const { data: parcels, error: parcelsError } = await this.supabaseAdmin
          .from('parcels')
          .select('id')
          .eq('farm_id', filters.farm_id);

        if (parcelsError) {
          this.logger.error('Error fetching parcels by farm_id', parcelsError);
          throw new InternalServerErrorException('Failed to fetch parcels for farm');
        }

        parcelIds = parcels?.map(p => p.id) || [];

        if (parcelIds.length === 0) {
          // No parcels found for this farm, return empty result
          return { data: [], count: 0 };
        }
      } else if (filters.parcel_ids) {
        // Use provided parcel IDs (comma-separated)
        parcelIds = filters.parcel_ids.split(',').map(id => id.trim());
      } else if (filters.parcel_id) {
        // Single parcel ID
        parcelIds = [filters.parcel_id];
      } else {
        // Get all parcels for the organization
        const { data: farms, error: farmsError } = await this.supabaseAdmin
          .from('farms')
          .select('id')
          .eq('organization_id', organizationId);

        if (farmsError) {
          this.logger.error('Error fetching farms', farmsError);
          throw new InternalServerErrorException('Failed to fetch farms');
        }

        const farmIds = farms?.map(f => f.id) || [];

        if (farmIds.length === 0) {
          return { data: [], count: 0 };
        }

        const { data: parcels, error: parcelsError } = await this.supabaseAdmin
          .from('parcels')
          .select('id')
          .in('farm_id', farmIds);

        if (parcelsError) {
          this.logger.error('Error fetching parcels', parcelsError);
          throw new InternalServerErrorException('Failed to fetch parcels');
        }

        parcelIds = parcels?.map(p => p.id) || [];
      }

      if (parcelIds.length === 0) {
        return { data: [], count: 0 };
      }

      // Build the query for analyses
      let query = this.supabaseAdmin
        .from('analyses')
        .select('*', { count: 'exact' })
        .in('parcel_id', parcelIds)
        .order('analysis_date', { ascending: false });

      // Apply filters
      if (filters.analysis_type) {
        query = query.eq('analysis_type', filters.analysis_type);
      }

      if (filters.date_from) {
        query = query.gte('analysis_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('analysis_date', filters.date_to);
      }

      // Apply pagination
      if (filters.page && filters.limit) {
        const from = (filters.page - 1) * filters.limit;
        const to = from + filters.limit - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) {
        this.logger.error('Error fetching analyses', error);
        throw new InternalServerErrorException(`Failed to fetch analyses: ${error.message}`);
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error('Unexpected error in findAll', error);
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  /**
   * Get a single analysis by ID
   */
  async findOne(id: string, organizationId: string) {
    this.logger.log(`Finding analysis ${id} for org ${organizationId}`);

    // Verify the analysis belongs to the organization
    const { data: analysis, error } = await this.supabaseAdmin
      .from('analyses')
      .select(`
        *,
        parcels!inner(
          id,
          name,
          farms!inner(
            organization_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error('Error fetching analysis', error);
      throw new NotFoundException('Analysis not found');
    }

    // Check organization access
    const farmOrg = (analysis as any).parcels?.farms?.organization_id;
    if (farmOrg !== organizationId) {
      throw new NotFoundException('Analysis not found');
    }

    return analysis;
  }

  /**
   * Create a new analysis
   */
  async create(dto: CreateAnalysisDto, organizationId: string) {
    this.logger.log(`Creating analysis for org ${organizationId}`, dto);

    // Verify the parcel belongs to the organization
    const { data: parcel, error: parcelError } = await this.supabaseAdmin
      .from('parcels')
      .select(`
        id,
        farms!inner(
          organization_id
        )
      `)
      .eq('id', dto.parcel_id)
      .single();

    if (parcelError || !parcel) {
      this.logger.error('Parcel not found or access denied', parcelError);
      throw new BadRequestException('Invalid parcel ID or access denied');
    }

    const farmOrg = (parcel as any).farms?.organization_id;
    if (farmOrg !== organizationId) {
      throw new BadRequestException('Invalid parcel ID or access denied');
    }

    // Create the analysis
    const { data: newAnalysis, error: createError } = await this.supabaseAdmin
      .from('analyses')
      .insert([dto])
      .select()
      .single();

    if (createError) {
      this.logger.error('Error creating analysis', createError);
      throw new InternalServerErrorException(`Failed to create analysis: ${createError.message}`);
    }

    return newAnalysis;
  }

  /**
   * Update an analysis
   */
  async update(id: string, organizationId: string, dto: UpdateAnalysisDto) {
    this.logger.log(`Updating analysis ${id} for org ${organizationId}`);

    // First verify the analysis exists and belongs to the organization
    await this.findOne(id, organizationId);

    // Update the analysis
    const { data: updatedAnalysis, error: updateError } = await this.supabaseAdmin
      .from('analyses')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      this.logger.error('Error updating analysis', updateError);
      throw new InternalServerErrorException(`Failed to update analysis: ${updateError.message}`);
    }

    return updatedAnalysis;
  }

  /**
   * Delete an analysis
   */
  async delete(id: string, organizationId: string) {
    this.logger.log(`Deleting analysis ${id} for org ${organizationId}`);

    // First verify the analysis exists and belongs to the organization
    await this.findOne(id, organizationId);

    // Delete the analysis (will cascade to recommendations)
    const { error: deleteError } = await this.supabaseAdmin
      .from('analyses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      this.logger.error('Error deleting analysis', deleteError);
      throw new InternalServerErrorException(`Failed to delete analysis: ${deleteError.message}`);
    }

    return { message: 'Analysis deleted successfully' };
  }

  async getRecommendations(analysisId: string, organizationId: string) {
    this.logger.log(`Getting recommendations for analysis ${analysisId}`);

    await this.findOne(analysisId, organizationId);

    const { data, error } = await this.supabaseAdmin
      .from('analysis_recommendations')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('priority', { ascending: false });

    if (error) {
      this.logger.error('Error fetching recommendations', error);
      throw new InternalServerErrorException(`Failed to fetch recommendations: ${error.message}`);
    }

    return data || [];
  }

  async createRecommendation(dto: CreateRecommendationDto, organizationId: string) {
    this.logger.log(`Creating recommendation for analysis ${dto.analysis_id}`);

    await this.findOne(dto.analysis_id, organizationId);

    const { data, error } = await this.supabaseAdmin
      .from('analysis_recommendations')
      .insert([dto])
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating recommendation', error);
      throw new InternalServerErrorException(`Failed to create recommendation: ${error.message}`);
    }

    return data;
  }

  async updateRecommendation(
    recommendationId: string,
    organizationId: string,
    dto: UpdateRecommendationDto,
  ) {
    this.logger.log(`Updating recommendation ${recommendationId}`);

    const { data: rec, error: recError } = await this.supabaseAdmin
      .from('analysis_recommendations')
      .select('analysis_id')
      .eq('id', recommendationId)
      .single();

    if (recError || !rec) {
      throw new NotFoundException('Recommendation not found');
    }

    await this.findOne(rec.analysis_id, organizationId);

    const { data, error } = await this.supabaseAdmin
      .from('analysis_recommendations')
      .update(dto)
      .eq('id', recommendationId)
      .select()
      .single();

    if (error) {
      this.logger.error('Error updating recommendation', error);
      throw new InternalServerErrorException(`Failed to update recommendation: ${error.message}`);
    }

    return data;
  }

  async deleteRecommendation(recommendationId: string, organizationId: string) {
    this.logger.log(`Deleting recommendation ${recommendationId}`);

    const { data: rec, error: recError } = await this.supabaseAdmin
      .from('analysis_recommendations')
      .select('analysis_id')
      .eq('id', recommendationId)
      .single();

    if (recError || !rec) {
      throw new NotFoundException('Recommendation not found');
    }

    await this.findOne(rec.analysis_id, organizationId);

    const { error } = await this.supabaseAdmin
      .from('analysis_recommendations')
      .delete()
      .eq('id', recommendationId);

    if (error) {
      this.logger.error('Error deleting recommendation', error);
      throw new InternalServerErrorException(`Failed to delete recommendation: ${error.message}`);
    }

    return { message: 'Recommendation deleted successfully' };
  }
}
