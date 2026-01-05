import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class StructuresSeedService {
  private readonly logger = new Logger(StructuresSeedService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create demo infrastructure structures
   */
  async createDemoStructures(organizationId: string, farmId: string, userId: string) {
    const client = this.databaseService.getAdminClient();

    const baseLat = 34.9214;
    const baseLon = -2.3197;

    // Organization-level structures (shared across all farms)
    const organizationStructures = [
      {
        organization_id: organizationId,
        farm_id: null,
        name: 'Siège Administratif',
        type: 'technical_room',
        location: { lat: baseLat + 0.005, lng: baseLon + 0.005 },
        installation_date: '2018-06-15',
        condition: 'excellent',
        usage: 'Bureau administratif et salle de réunion',
        structure_details: {
          width: 12,
          length: 15,
          height: 3.5,
          construction_type: 'concrete',
          equipment: ['Climatisation', 'Réseau informatique', 'Salle de réunion', 'Archives'],
        },
        notes: 'Siège principal de l\'organisation avec bureaux et salle de conférence',
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: null,
        name: 'Entrepôt Central',
        type: 'stable',
        location: { lat: baseLat + 0.006, lng: baseLon + 0.004 },
        installation_date: '2019-03-20',
        condition: 'good',
        usage: 'Stockage centralisé des intrants et équipements',
        structure_details: {
          width: 20,
          length: 30,
          height: 6,
          construction_type: 'metal',
        },
        notes: 'Entrepôt métallique pour stockage des engrais, semences et équipements partagés',
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: null,
        name: 'Station de Pompage Centrale',
        type: 'well',
        location: { lat: baseLat + 0.004, lng: baseLon + 0.006 },
        installation_date: '2017-09-10',
        condition: 'good',
        usage: 'Alimentation en eau principale pour toutes les fermes',
        structure_details: {
          depth: 80,
          pump_type: 'submersible',
          pump_power: 15,
          condition: 'good',
        },
        notes: 'Forage profond avec pompe haute capacité, dessert plusieurs fermes',
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: null,
        name: 'Bassin de Rétention Principal',
        type: 'basin',
        location: { lat: baseLat + 0.003, lng: baseLon + 0.007 },
        installation_date: '2018-11-25',
        condition: 'excellent',
        usage: 'Réserve d\'eau pour irrigation en période de pointe',
        structure_details: {
          shape: 'rectangular',
          dimensions: { width: 25, length: 40, height: 4 },
          volume: 4000,
        },
        notes: 'Grand bassin de stockage avec système de filtration, capacité 4000 m³',
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: null,
        name: 'Laboratoire Qualité',
        type: 'technical_room',
        location: { lat: baseLat + 0.007, lng: baseLon + 0.003 },
        installation_date: '2020-02-15',
        condition: 'excellent',
        usage: 'Analyses qualité des récoltes et contrôle phytosanitaire',
        structure_details: {
          width: 8,
          length: 10,
          height: 3,
          construction_type: 'concrete',
          equipment: ['Spectromètre', 'Balance de précision', 'Réfrigérateur échantillons', 'Microscope'],
        },
        notes: 'Laboratoire équipé pour analyses de qualité et certification des produits',
        is_active: true,
      },
    ];

    // Farm-level structures (specific to the demo farm)
    const farmStructures = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: 'Puits Principal',
        type: 'well',
        location: { lat: baseLat + 0.001, lng: baseLon + 0.001 },
        installation_date: '2020-01-15',
        condition: 'good',
        usage: 'Irrigation principale pour toutes les parcelles',
        structure_details: {
          depth: 45,
          pump_type: 'submersible',
          pump_power: 7.5,
          condition: 'good',
        },
        notes: 'Puits principal avec pompe submersible, maintenance annuelle requise',
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: 'Bassin de Stockage Est',
        type: 'basin',
        location: { lat: baseLat + 0.002, lng: baseLon + 0.002 },
        installation_date: '2020-03-20',
        condition: 'excellent',
        usage: 'Stockage d\'eau pour irrigation des parcelles Est',
        structure_details: {
          shape: 'rectangular',
          dimensions: { width: 10, length: 20, height: 2.5 },
          volume: 500,
        },
        notes: 'Bassin en béton de 500m³, nettoyage trimestriel',
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: 'Local Technique Ferme',
        type: 'technical_room',
        location: { lat: baseLat, lng: baseLon },
        installation_date: '2019-11-10',
        condition: 'good',
        usage: 'Stockage équipements et outils agricoles',
        structure_details: {
          width: 5,
          length: 10,
          height: 3,
          construction_type: 'mixed',
          equipment: ['Outils manuels', 'Petit matériel irrigation', 'Produits phytosanitaires'],
        },
        notes: 'Local technique équipé avec électricité et eau',
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: 'Bassin de Stockage Ouest',
        type: 'basin',
        location: { lat: baseLat - 0.001, lng: baseLon - 0.001 },
        installation_date: '2021-05-10',
        condition: 'good',
        usage: 'Stockage d\'eau pour irrigation des parcelles Ouest',
        structure_details: {
          shape: 'circular',
          dimensions: { radius: 5.5, height: 3 },
          volume: 285,
        },
        notes: 'Bassin secondaire pour irrigation complémentaire',
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: 'Puits Secondaire',
        type: 'well',
        location: { lat: baseLat - 0.002, lng: baseLon + 0.001 },
        installation_date: '2022-08-15',
        condition: 'fair',
        usage: 'Puits de secours et irrigation complémentaire',
        structure_details: {
          depth: 35,
          pump_type: 'surface',
          pump_power: 4,
          condition: 'fair',
        },
        notes: 'Puits secondaire, nécessite maintenance préventive',
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: 'Écurie',
        type: 'stable',
        location: { lat: baseLat - 0.001, lng: baseLon + 0.002 },
        installation_date: '2019-06-01',
        condition: 'good',
        usage: 'Abri pour animaux de travail et stockage fourrage',
        structure_details: {
          width: 8,
          length: 12,
          height: 4,
          construction_type: 'wood',
        },
        notes: 'Écurie en bois avec 4 box et zone de stockage fourrage',
        is_active: true,
      },
    ];

    // Insert organization-level structures
    const { error: orgError } = await client.from('structures').insert(organizationStructures);
    if (orgError) {
      this.logger.error(`Failed to create organization structures: ${orgError.message}`);
    }

    // Insert farm-level structures
    const { error: farmError } = await client.from('structures').insert(farmStructures);
    if (farmError) {
      this.logger.error(`Failed to create farm structures: ${farmError.message}`);
    }
  }
}
