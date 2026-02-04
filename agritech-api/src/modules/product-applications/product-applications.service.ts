import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProductApplicationDto } from './dto/create-product-application.dto';

@Injectable()
export class ProductApplicationsService {
  private readonly logger = new Logger(ProductApplicationsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all product applications for an organization
   */
  async listProductApplications(userId: string, organizationId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data, error } = await supabase
        .from('product_applications')
        .select(`
          *,
          items!inner (
            item_name,
            default_unit
          )
        `)
        .eq('organization_id', organizationId)
        .order('application_date', { ascending: false });

      if (error) {
        this.logger.error('Error fetching product applications:', error);
        throw new InternalServerErrorException('Failed to fetch product applications');
      }

      // Transform the response to match the expected DTO structure
      // items (item_name, default_unit) -> inventory (name, unit)
      const transformedApplications = (data || []).map((app: any) => ({
        ...app,
        inventory: {
          name: app.items.item_name,
          unit: app.items.default_unit,
        },
        // Remove the items property as it's transformed to inventory
        items: undefined,
      }));

      return {
        success: true,
        applications: transformedApplications,
        total: transformedApplications.length,
      };
    } catch (error) {
      this.logger.error('Error in listProductApplications:', error);
      throw error;
    }
  }

  /**
   * Create a new product application
   */
  async createProductApplication(
    userId: string,
    organizationId: string,
    createDto: CreateProductApplicationDto,
  ) {
    try {
      const supabase = this.databaseService.getAdminClient();

      // Add organization_id to the data
      const applicationData = {
        ...createDto,
        organization_id: organizationId,
      };

      const { data, error } = await supabase
        .from('product_applications')
        .insert([applicationData])
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating product application:', error);
        throw new InternalServerErrorException('Failed to create product application');
      }

      return {
        success: true,
        application: data,
      };
    } catch (error) {
      this.logger.error('Error in createProductApplication:', error);
      throw error;
    }
  }

  /**
   * Get products from inventory_items that are available (quantity > 0)
   */
  async getAvailableProducts(userId: string, organizationId: string) {
    try {
      const supabase = this.databaseService.getAdminClient();

      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, quantity, unit')
        .eq('organization_id', organizationId)
        .gt('quantity', 0)
        .order('name');

      if (error) {
        this.logger.error('Error fetching available products:', error);
        throw new InternalServerErrorException('Failed to fetch available products');
      }

      return {
        success: true,
        products: data || [],
        total: data?.length || 0,
      };
    } catch (error) {
      this.logger.error('Error in getAvailableProducts:', error);
      throw error;
    }
  }
}
