import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class FarmSeedService {
  private readonly logger = new Logger(FarmSeedService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create demo farm
   */
  async createDemoFarm(organizationId: string, userId: string) {
    const client = this.databaseService.getAdminClient();

    const { data: farm, error } = await client
      .from('farms')
      .insert({
        organization_id: organizationId,
        name: 'Ferme Démo - Domaine Agricole',
        location: 'Berkane, Maroc',
        city: 'Berkane',
        state: 'Oriental',
        country: 'Maroc',
        size: 25,
        size_unit: 'hectare',
        description: 'Ferme de démonstration pour explorer les fonctionnalités de la plateforme',
        manager_name: 'Gestionnaire Démo',
        manager_email: 'demo@example.com',
        status: 'active',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create demo farm: ${error.message}`);
      throw error;
    }

    return farm;
  }

  /**
   * Create demo parcels
   */
  async createDemoParcels(organizationId: string, farmId: string) {
    const client = this.databaseService.getAdminClient();

    // Base coordinates for Berkane, Morocco (approximately)
    const baseLat = 34.9214;
    const baseLon = -2.3197;

    // Parcelle Olives (10 hectares)
    const olivesBoundary = [
      [baseLon, baseLat],
      [baseLon + 0.00285, baseLat],
      [baseLon + 0.00285, baseLat + 0.00285],
      [baseLon, baseLat + 0.00285],
      [baseLon, baseLat],
    ];

    // Parcelle Agrumes (8 hectares)
    const agrumesBoundary = [
      [baseLon + 0.003, baseLat],
      [baseLon + 0.003 + 0.00255, baseLat],
      [baseLon + 0.003 + 0.00255, baseLat + 0.00255],
      [baseLon + 0.003, baseLat + 0.00255],
      [baseLon + 0.003, baseLat],
    ];

    // Parcelle Légumes (7 hectares)
    const legumesBoundary = [
      [baseLon, baseLat + 0.003],
      [baseLon + 0.00238, baseLat + 0.003],
      [baseLon + 0.00238, baseLat + 0.003 + 0.00238],
      [baseLon, baseLat + 0.003 + 0.00238],
      [baseLon, baseLat + 0.003],
    ];

    const parcels = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: 'Parcelle Olives',
        description: 'Parcelle principale d\'oliviers',
        area: 10,
        area_unit: 'hectares',
        crop_type: 'Olives',
        crop_category: 'fruit_trees',
        variety: 'Picholine',
        planting_year: 2020,
        planting_date: '2020-03-15',
        soil_type: 'Argileux',
        irrigation_type: 'Goutte à goutte',
        boundary: olivesBoundary,
        calculated_area: 10,
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: 'Parcelle Agrumes',
        description: 'Parcelle d\'agrumes variés',
        area: 8,
        area_unit: 'hectares',
        crop_type: 'Agrumes',
        crop_category: 'fruit_trees',
        variety: 'Clémentine',
        planting_year: 2021,
        planting_date: '2021-04-10',
        soil_type: 'Sableux',
        irrigation_type: 'Aspersion',
        boundary: agrumesBoundary,
        calculated_area: 8,
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: 'Parcelle Légumes',
        description: 'Parcelle de légumes de saison',
        area: 7,
        area_unit: 'hectares',
        crop_type: 'Tomates',
        crop_category: 'vegetables',
        variety: 'Marmande',
        planting_year: 2023,
        planting_date: '2023-05-01',
        soil_type: 'Limoneux',
        irrigation_type: 'Goutte à goutte',
        boundary: legumesBoundary,
        calculated_area: 7,
        is_active: true,
      },
    ];

    const { data: createdParcels, error } = await client
      .from('parcels')
      .insert(parcels)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo parcels: ${error.message}`);
      throw error;
    }

    return createdParcels || [];
  }
}
