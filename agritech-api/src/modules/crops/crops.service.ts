import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { paginatedResponse, type PaginatedResponse } from "../../common/dto/paginated-query.dto";
import { CropFiltersDto, CreateCropDto } from "./dto";
import { sanitizeSearch } from "../../common/utils/sanitize-search";

@Injectable()
export class CropsService {
  private readonly logger = new Logger(CropsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId: string, filters: CropFiltersDto = {}) {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from("crops")
      .select(
        `
        *,
        farms!inner(id, name, organization_id),
        parcels(id, parcel_name),
        crop_varieties(id, name)
      `,
        { count: "exact" },
      )
      .eq("farms.organization_id", organizationId);

    // Apply filters
    if (filters.farm_id) {
      query = query.eq("farm_id", filters.farm_id);
    }
    if (filters.parcel_id) {
      query = query.eq("parcel_id", filters.parcel_id);
    }
    if (filters.variety_id) {
      query = query.eq("variety_id", filters.variety_id);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.search) {
      { const s = sanitizeSearch(filters.search); if (s) query = query.ilike("name", `%${s}%`); }
    }

    // Apply sorting
    const sortBy = filters.sortBy || "name";
    const sortDir = filters.sortDir === "desc" ? false : true;
    query = query.order(sortBy, { ascending: sortDir });

    // Apply pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Failed to fetch crops: ${error.message}`);
      throw error;
    }

    // Transform data to flatten joined fields
    const crops = (data || []).map((crop: any) => ({
      ...crop,
      farm_name: crop.farms?.name,
      parcel_name: crop.parcels?.parcel_name,
      variety_name: crop.crop_varieties?.name,
      // Remove nested objects
      farms: undefined,
      parcels: undefined,
      crop_varieties: undefined,
    }));

    return paginatedResponse(crops, count || 0, page, pageSize);
  }

  async findOne(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from("crops")
      .select(
        `
        *,
        farms!inner(id, name, organization_id),
        parcels(id, parcel_name),
        crop_varieties(id, name)
      `,
      )
      .eq("id", id)
      .eq("farms.organization_id", organizationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundException("Crop not found");
      }
      this.logger.error(`Failed to fetch crop: ${error.message}`);
      throw error;
    }

    return {
      ...data,
      farm_name: data.farms?.name,
      parcel_name: data.parcels?.parcel_name,
      variety_name: data.crop_varieties?.name,
      farms: undefined,
      parcels: undefined,
      crop_varieties: undefined,
    };
  }

  async create(organizationId: string, createDto: CreateCropDto) {
    const client = this.databaseService.getAdminClient();

    // Verify farm belongs to organization
    const { data: farm, error: farmError } = await client
      .from("farms")
      .select("id")
      .eq("id", createDto.farm_id)
      .eq("organization_id", organizationId)
      .single();

    if (farmError || !farm) {
      throw new NotFoundException(
        "Farm not found or does not belong to organization",
      );
    }

    const { data, error } = await client
      .from("crops")
      .insert(createDto)
      .select(
        `
        *,
        farms!inner(id, name, organization_id),
        parcels(id, parcel_name),
        crop_varieties(id, name)
      `,
      )
      .single();

    if (error) {
      this.logger.error(`Failed to create crop: ${error.message}`);
      throw error;
    }

    return {
      ...data,
      farm_name: data.farms?.name,
      parcel_name: data.parcels?.parcel_name,
      variety_name: data.crop_varieties?.name,
      farms: undefined,
      parcels: undefined,
      crop_varieties: undefined,
    };
  }

  async update(
    id: string,
    organizationId: string,
    updateDto: Partial<CreateCropDto>,
  ) {
    const client = this.databaseService.getAdminClient();

    // Verify crop exists and belongs to organization
    await this.findOne(id, organizationId);

    // If farm_id is being updated, verify it belongs to organization
    if (updateDto.farm_id) {
      const { data: farm, error: farmError } = await client
        .from("farms")
        .select("id")
        .eq("id", updateDto.farm_id)
        .eq("organization_id", organizationId)
        .single();

      if (farmError || !farm) {
        throw new NotFoundException(
          "Farm not found or does not belong to organization",
        );
      }
    }

    const { data, error } = await client
      .from("crops")
      .update({
        ...updateDto,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        farms!inner(id, name, organization_id),
        parcels(id, parcel_name),
        crop_varieties(id, name)
      `,
      )
      .single();

    if (error) {
      this.logger.error(`Failed to update crop: ${error.message}`);
      throw error;
    }

    return {
      ...data,
      farm_name: data.farms?.name,
      parcel_name: data.parcels?.parcel_name,
      variety_name: data.crop_varieties?.name,
      farms: undefined,
      parcels: undefined,
      crop_varieties: undefined,
    };
  }

  async remove(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Verify crop exists and belongs to organization
    await this.findOne(id, organizationId);

    const { error } = await client.from("crops").delete().eq("id", id);

    if (error) {
      this.logger.error(`Failed to delete crop: ${error.message}`);
      throw error;
    }

    return { id };
  }
}
