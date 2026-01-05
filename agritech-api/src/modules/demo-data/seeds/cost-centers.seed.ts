import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class CostCentersSeedService {
  private readonly logger = new Logger(CostCentersSeedService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create demo cost centers (one per parcel)
   */
  async createDemoCostCenters(organizationId: string, parcels: any[]) {
    const client = this.databaseService.getAdminClient();

    const costCenters = parcels.map((parcel, index) => ({
      organization_id: organizationId,
      code: `CC-${String(index + 1).padStart(3, '0')}`,
      name: `Centre de Coût - ${parcel.name}`,
      description: `Centre de coût pour ${parcel.name}`,
      parcel_id: parcel.id,
      is_active: true,
    }));

    const { error } = await client.from('cost_centers').insert(costCenters);

    if (error) {
      this.logger.error(`Failed to create demo cost centers: ${error.message}`);
      // Don't throw - cost centers are optional
    }
  }
}
