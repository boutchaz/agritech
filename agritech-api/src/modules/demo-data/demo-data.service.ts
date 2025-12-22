import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DemoDataService {
  private readonly logger = new Logger(DemoDataService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Seed demo data for a new organization
   * Creates minimal but representative data across key modules
   */
  async seedDemoData(organizationId: string, userId: string): Promise<void> {
    this.logger.log(`Starting demo data seeding for organization ${organizationId}`);

    try {
      // 1. Seed Farm
      const farm = await this.createDemoFarm(organizationId, userId);
      this.logger.log(`✅ Created demo farm: ${farm.name}`);

      // 2. Seed Parcels (linked to farm)
      const parcels = await this.createDemoParcels(organizationId, farm.id);
      this.logger.log(`✅ Created ${parcels.length} demo parcels`);

      // 3. Seed Workers
      const workers = await this.createDemoWorkers(organizationId, farm.id, userId);
      this.logger.log(`✅ Created ${workers.length} demo workers`);

      // 4. Seed Cost Centers (one per parcel)
      await this.createDemoCostCenters(organizationId, parcels);
      this.logger.log(`✅ Created demo cost centers`);

      // 5. Seed Tasks (linked to parcels and workers) - returns tasks including harvest task
      const tasks = await this.createDemoTasks(organizationId, farm.id, parcels, workers, userId);
      this.logger.log(`✅ Created ${tasks.length} demo tasks`);

      // 6. Seed Infrastructure (structures)
      await this.createDemoStructures(organizationId, farm.id, userId);
      this.logger.log(`✅ Created demo infrastructure`);

      // 7. Seed Warehouses and Items
      const { warehouse, items } = await this.createDemoItems(organizationId, farm.id, userId);
      this.logger.log(`✅ Created demo items and warehouses`);

      // 7b. Seed Stock Entries
      await this.createDemoStockEntries(organizationId, warehouse, items, userId);
      this.logger.log(`✅ Created demo stock entries`);

      // 8. Seed Customers/Suppliers
      const { customers, suppliers } = await this.createDemoParties(organizationId, userId);
      this.logger.log(`✅ Created demo customers/suppliers`);

      // 9. Seed Quotes
      const quotes = await this.createDemoQuotes(organizationId, customers, items, userId);
      this.logger.log(`✅ Created ${quotes.length} demo quotes`);

      // 10. Seed Sales Orders
      const salesOrders = await this.createDemoSalesOrders(organizationId, customers, items, userId);
      this.logger.log(`✅ Created ${salesOrders.length} demo sales orders`);

      // 11. Seed Purchase Orders
      const purchaseOrders = await this.createDemoPurchaseOrders(organizationId, suppliers, items, userId);
      this.logger.log(`✅ Created ${purchaseOrders.length} demo purchase orders`);

      // 12. Seed Invoices
      await this.createDemoInvoices(organizationId, parcels, customers, userId);
      this.logger.log(`✅ Created demo invoices`);

      // 11. Seed Harvest Records (linked to harvest tasks)
      const harvests = await this.createDemoHarvests(organizationId, farm.id, parcels, workers, tasks, userId);
      this.logger.log(`✅ Created ${harvests.length} demo harvest records`);

      // 12. Seed Reception Batches with Quality Control
      await this.createDemoReceptionBatches(organizationId, farm.id, parcels, workers, harvests, userId);
      this.logger.log(`✅ Created demo reception batches`);

      // 13. Seed Sample Costs/Revenues
      await this.createDemoFinancialData(organizationId, parcels, userId);
      this.logger.log(`✅ Created demo financial data`);

      this.logger.log(`✅ Demo data seeding completed successfully for organization ${organizationId}`);
    } catch (error) {
      this.logger.error(`❌ Error seeding demo data: ${error.message}`, error.stack);
      // Don't throw - allow organization creation to succeed even if demo data fails
    }
  }

  /**
   * Create demo farm
   */
  private async createDemoFarm(organizationId: string, userId: string) {
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
  private async createDemoParcels(organizationId: string, farmId: string): Promise<any[]> {
    const client = this.databaseService.getAdminClient();

    // Base coordinates for Berkane, Morocco (approximately)
    // Latitude: 34.9214, Longitude: -2.3197
    const baseLat = 34.9214;
    const baseLon = -2.3197;

    // Create rectangular boundaries for each parcel
    // Each degree is approximately 111km, so for hectares:
    // 10 ha ≈ 316m x 316m ≈ 0.00285 degrees
    // 8 ha ≈ 283m x 283m ≈ 0.00255 degrees
    // 7 ha ≈ 264m x 264m ≈ 0.00238 degrees

    // Parcelle Olives (10 hectares) - Rectangle ~316m x 316m
    const olivesBoundary = [
      [baseLon, baseLat], // Southwest corner
      [baseLon + 0.00285, baseLat], // Southeast corner
      [baseLon + 0.00285, baseLat + 0.00285], // Northeast corner
      [baseLon, baseLat + 0.00285], // Northwest corner
      [baseLon, baseLat], // Close the polygon
    ];

    // Parcelle Agrumes (8 hectares) - Rectangle ~283m x 283m, positioned to the east
    const agrumesBoundary = [
      [baseLon + 0.003, baseLat], // Southwest corner
      [baseLon + 0.003 + 0.00255, baseLat], // Southeast corner
      [baseLon + 0.003 + 0.00255, baseLat + 0.00255], // Northeast corner
      [baseLon + 0.003, baseLat + 0.00255], // Northwest corner
      [baseLon + 0.003, baseLat], // Close the polygon
    ];

    // Parcelle Légumes (7 hectares) - Rectangle ~264m x 264m, positioned to the north
    const legumesBoundary = [
      [baseLon, baseLat + 0.003], // Southwest corner
      [baseLon + 0.00238, baseLat + 0.003], // Southeast corner
      [baseLon + 0.00238, baseLat + 0.003 + 0.00238], // Northeast corner
      [baseLon, baseLat + 0.003 + 0.00238], // Northwest corner
      [baseLon, baseLat + 0.003], // Close the polygon
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

  /**
   * Create demo workers
   */
  private async createDemoWorkers(organizationId: string, farmId: string, userId: string) {
    const client = this.databaseService.getAdminClient();

    const workers = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        first_name: 'Ahmed',
        last_name: 'Benali',
        worker_type: 'fixed_salary',
        position: 'Gestionnaire de Ferme',
        hire_date: '2022-01-15',
        is_cnss_declared: true,
        monthly_salary: 8000,
        payment_method: 'bank_transfer',
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        first_name: 'Fatima',
        last_name: 'Alami',
        worker_type: 'daily_worker',
        position: 'Ouvrière Agricole',
        hire_date: '2023-03-01',
        is_cnss_declared: false,
        daily_rate: 150,
        payment_method: 'cash',
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        first_name: 'Mohamed',
        last_name: 'Tazi',
        worker_type: 'daily_worker',
        position: 'Spécialiste Récolte',
        hire_date: '2023-06-01',
        is_cnss_declared: false,
        daily_rate: 180,
        payment_method: 'cash',
        specialties: ['harvesting', 'pruning'],
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdWorkers, error } = await client
      .from('workers')
      .insert(workers)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo workers: ${error.message}`);
      throw error;
    }

    return createdWorkers || [];
  }

  /**
   * Create demo cost centers (one per parcel)
   */
  private async createDemoCostCenters(organizationId: string, parcels: any[]) {
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

  /**
   * Create demo tasks
   */
  private async createDemoTasks(
    organizationId: string,
    farmId: string,
    parcels: any[],
    workers: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const tasks = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        title: 'Irrigation Parcelle Olives',
        description: 'Irrigation complète de la parcelle d\'oliviers',
        task_type: 'irrigation',
        priority: 'high',
        status: 'completed',
        assigned_to: workers[0].id,
        scheduled_start: twoDaysAgo.toISOString(),
        actual_start: twoDaysAgo.toISOString(),
        actual_end: new Date(twoDaysAgo.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        completed_date: twoDaysAgo.toISOString().split('T')[0],
        completion_percentage: 100,
        estimated_duration: 4,
        actual_duration: 4,
        weather_dependency: false,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id,
        title: 'Taille des arbres fruitiers',
        description: 'Taille de formation et d\'entretien des agrumes',
        task_type: 'pruning',
        priority: 'medium',
        status: 'in_progress',
        assigned_to: workers[2].id,
        scheduled_start: now.toISOString(),
        actual_start: now.toISOString(),
        completion_percentage: 45,
        estimated_duration: 8,
        weather_dependency: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id,
        title: 'Récolte Agrumes',
        description: 'Récolte de la parcelle d\'agrumes',
        task_type: 'harvesting',
        priority: 'high',
        status: 'completed',
        assigned_to: workers[2].id,
        scheduled_start: lastMonth.toISOString(),
        actual_start: lastMonth.toISOString(),
        actual_end: new Date(lastMonth.getTime() + 8 * 60 * 60 * 1000).toISOString(),
        completed_date: lastMonth.toISOString().split('T')[0],
        completion_percentage: 100,
        estimated_duration: 8,
        actual_duration: 8,
        weather_dependency: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2].id,
        title: 'Plantation Tomates',
        description: 'Plantation de nouvelles variétés de tomates',
        task_type: 'planting',
        priority: 'medium',
        status: 'assigned',
        assigned_to: workers[1].id,
        scheduled_start: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_duration: 6,
        weather_dependency: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        title: 'Fertilisation Organique',
        description: 'Application d\'engrais organique sur la parcelle d\'oliviers',
        task_type: 'fertilization',
        priority: 'medium',
        status: 'pending',
        scheduled_start: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_duration: 3,
        weather_dependency: false,
        created_by: userId,
      },
      // Additional tasks
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        title: 'Traitement Phytosanitaire',
        description: 'Traitement préventif contre les maladies des oliviers',
        task_type: 'pest_control',
        priority: 'high',
        status: 'completed',
        assigned_to: workers[0].id,
        scheduled_start: lastWeek.toISOString(),
        actual_start: lastWeek.toISOString(),
        actual_end: new Date(lastWeek.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        completed_date: lastWeek.toISOString().split('T')[0],
        completion_percentage: 100,
        estimated_duration: 3,
        actual_duration: 3,
        weather_dependency: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id,
        title: 'Irrigation Complémentaire',
        description: 'Irrigation d\'appoint pour les agrumes',
        task_type: 'irrigation',
        priority: 'medium',
        status: 'in_progress',
        assigned_to: workers[1].id,
        scheduled_start: now.toISOString(),
        actual_start: now.toISOString(),
        completion_percentage: 60,
        estimated_duration: 5,
        weather_dependency: false,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2].id,
        title: 'Désherbage Manuel',
        description: 'Désherbage manuel de la parcelle de légumes',
        task_type: 'maintenance',
        priority: 'low',
        status: 'assigned',
        assigned_to: workers[1].id,
        scheduled_start: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_duration: 4,
        weather_dependency: false,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        title: 'Récolte Olives',
        description: 'Récolte annuelle des olives',
        task_type: 'harvesting',
        priority: 'high',
        status: 'pending',
        assigned_to: workers[2].id,
        scheduled_start: nextMonth.toISOString(),
        due_date: nextMonth.toISOString().split('T')[0],
        estimated_duration: 20,
        weather_dependency: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id,
        title: 'Application Engrais NPK',
        description: 'Application d\'engrais NPK pour les agrumes',
        task_type: 'fertilization',
        priority: 'medium',
        status: 'pending',
        scheduled_start: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_duration: 4,
        weather_dependency: false,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2].id,
        title: 'Récolte Tomates',
        description: 'Première récolte de tomates de saison',
        task_type: 'harvesting',
        priority: 'high',
        status: 'assigned',
        assigned_to: workers[1].id,
        scheduled_start: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_duration: 8,
        weather_dependency: true,
        created_by: userId,
      },
    ];

    const { data: createdTasks, error } = await client
      .from('tasks')
      .insert(tasks)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo tasks: ${error.message}`);
      throw error;
    }

    return createdTasks || [];
  }

  /**
   * Create demo customers and suppliers
   */
  private async createDemoParties(organizationId: string, userId: string): Promise<{ customers: any[]; suppliers: any[] }> {
    const client = this.databaseService.getAdminClient();

    const customersData = [
      {
        organization_id: organizationId,
        customer_code: 'CUST-001',
        customer_name: 'Marché Central de Casablanca',
        customer_type: 'business',
        email: 'contact@marche-casa.ma',
        phone: '+212522123456',
        address: 'Boulevard Zerktouni, Casablanca',
        city: 'Casablanca',
        country: 'Maroc',
        tax_id: '123456789',
        payment_terms: 'Net 30',
        credit_limit: 50000,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        customer_code: 'CUST-002',
        customer_name: 'Coopérative Agricole Berkane',
        customer_type: 'cooperative',
        email: 'info@coop-berkane.ma',
        phone: '+212536789012',
        address: 'Route de Nador, Berkane',
        city: 'Berkane',
        country: 'Maroc',
        tax_id: '987654321',
        payment_terms: 'Net 15',
        credit_limit: 30000,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        customer_code: 'CUST-003',
        customer_name: 'Restaurant Le Jardin',
        customer_type: 'business',
        email: 'commandes@lejardin.ma',
        phone: '+212537456789',
        address: 'Avenue Mohammed V, Fès',
        city: 'Fès',
        country: 'Maroc',
        tax_id: '555666777',
        payment_terms: 'Net 15',
        credit_limit: 20000,
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdCustomers, error } = await client
      .from('customers')
      .insert(customersData)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo customers: ${error.message}`);
      throw error;
    }

    // Create suppliers
    const suppliersData = [
      {
        organization_id: organizationId,
        supplier_code: 'SUP-001',
        supplier_name: 'AgriSupply Maroc',
        supplier_type: 'wholesaler',
        email: 'contact@agrisupply.ma',
        phone: '+212522654321',
        address: 'Zone Industrielle, Rabat',
        city: 'Rabat',
        country: 'Maroc',
        tax_id: '456789123',
        payment_terms: 'Net 30',
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        supplier_code: 'SUP-002',
        supplier_name: 'Engrais & Semences du Maroc',
        supplier_type: 'manufacturer',
        email: 'ventes@esmaroc.ma',
        phone: '+212528987654',
        address: 'Parc Industriel, Agadir',
        city: 'Agadir',
        country: 'Maroc',
        tax_id: '789123456',
        payment_terms: 'Net 45',
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdSuppliers, error: supplierError } = await client
      .from('suppliers')
      .insert(suppliersData)
      .select();

    if (supplierError) {
      this.logger.error(`Failed to create demo suppliers: ${supplierError.message}`);
    }

    return {
      customers: createdCustomers || [],
      suppliers: createdSuppliers || [],
    };
  }

  /**
   * Create demo quotes
   */
  private async createDemoQuotes(
    organizationId: string,
    customers: any[],
    items: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Find olive oil and citrus items
    const oliveOilItem = items.find(i => i.item_name?.includes('Olive')) || items[0];
    const citrusItem = items.find(i => i.item_name?.includes('Clémentine') || i.item_name?.includes('Agrume')) || items[1];

    const quotes = [
      {
        organization_id: organizationId,
        quote_number: 'DEV-2024-001',
        quote_date: lastWeek.toISOString().split('T')[0],
        valid_until: nextMonth.toISOString().split('T')[0],
        customer_id: customers[0]?.id,
        customer_name: customers[0]?.customer_name || 'Client Demo',
        status: 'sent',
        subtotal: 25000,
        tax_total: 4500,
        grand_total: 29500,
        payment_terms: 'Net 30',
        delivery_terms: 'Livraison sur site',
        notes: 'Devis pour commande régulière mensuelle',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        quote_number: 'DEV-2024-002',
        quote_date: twoWeeksAgo.toISOString().split('T')[0],
        valid_until: inTwoWeeks.toISOString().split('T')[0],
        customer_id: customers[1]?.id,
        customer_name: customers[1]?.customer_name || 'Client Demo 2',
        status: 'accepted',
        subtotal: 12000,
        tax_total: 2160,
        grand_total: 14160,
        payment_terms: 'Net 15',
        delivery_terms: 'Retrait en ferme',
        notes: 'Devis accepté - convertir en commande',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        quote_number: 'DEV-2024-003',
        quote_date: now.toISOString().split('T')[0],
        valid_until: nextMonth.toISOString().split('T')[0],
        customer_id: customers[2]?.id || customers[0]?.id,
        customer_name: customers[2]?.customer_name || customers[0]?.customer_name || 'Client Demo',
        status: 'draft',
        subtotal: 8500,
        tax_total: 1530,
        grand_total: 10030,
        payment_terms: 'Net 15',
        delivery_terms: 'Livraison express',
        notes: 'En attente de confirmation des quantités',
        created_by: userId,
      },
    ];

    const { data: createdQuotes, error } = await client
      .from('quotes')
      .insert(quotes)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo quotes: ${error.message}`);
      return [];
    }

    // Create quote items
    if (createdQuotes && createdQuotes.length > 0) {
      const quoteItems = [
        // Quote 1 items
        {
          quote_id: createdQuotes[0].id,
          line_number: 1,
          item_id: oliveOilItem?.id,
          item_name: 'Huile d\'Olive Extra Vierge',
          description: 'Huile d\'olive pressée à froid, qualité premium',
          quantity: 500,
          unit_of_measure: 'L',
          unit_price: 40,
          discount_percent: 0,
          tax_rate: 18,
          amount: 20000,
          tax_amount: 3600,
          line_total: 23600,
        },
        {
          quote_id: createdQuotes[0].id,
          line_number: 2,
          item_id: citrusItem?.id,
          item_name: 'Clémentines Bio',
          description: 'Clémentines de saison, agriculture biologique',
          quantity: 200,
          unit_of_measure: 'kg',
          unit_price: 25,
          discount_percent: 0,
          tax_rate: 18,
          amount: 5000,
          tax_amount: 900,
          line_total: 5900,
        },
        // Quote 2 items
        {
          quote_id: createdQuotes[1].id,
          line_number: 1,
          item_id: oliveOilItem?.id,
          item_name: 'Huile d\'Olive Extra Vierge',
          description: 'Huile d\'olive pressée à froid',
          quantity: 300,
          unit_of_measure: 'L',
          unit_price: 40,
          discount_percent: 0,
          tax_rate: 18,
          amount: 12000,
          tax_amount: 2160,
          line_total: 14160,
        },
        // Quote 3 items
        {
          quote_id: createdQuotes[2].id,
          line_number: 1,
          item_id: citrusItem?.id,
          item_name: 'Oranges Navel',
          description: 'Oranges fraîches pour jus',
          quantity: 500,
          unit_of_measure: 'kg',
          unit_price: 17,
          discount_percent: 0,
          tax_rate: 18,
          amount: 8500,
          tax_amount: 1530,
          line_total: 10030,
        },
      ];

      await client.from('quote_items').insert(quoteItems);
    }

    return createdQuotes || [];
  }

  /**
   * Create demo sales orders
   */
  private async createDemoSalesOrders(
    organizationId: string,
    customers: any[],
    items: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Find items
    const oliveOilItem = items.find(i => i.item_name?.includes('Olive')) || items[0];
    const citrusItem = items.find(i => i.item_name?.includes('Clémentine') || i.item_name?.includes('Agrume')) || items[1];

    const salesOrders = [
      {
        organization_id: organizationId,
        order_number: 'SO-2024-001',
        order_date: lastMonth.toISOString().split('T')[0],
        expected_delivery_date: new Date(lastMonth.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_id: customers[0]?.id,
        customer_name: customers[0]?.customer_name || 'Client Demo',
        customer_address: customers[0]?.address,
        status: 'delivered',
        subtotal: 15000,
        tax_amount: 2700,
        total_amount: 17700,
        stock_issued: true,
        notes: 'Commande livrée avec succès',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: 'SO-2024-002',
        order_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_delivery_date: nextWeek.toISOString().split('T')[0],
        customer_id: customers[1]?.id,
        customer_name: customers[1]?.customer_name || 'Client Demo 2',
        customer_address: customers[1]?.address,
        status: 'confirmed',
        subtotal: 8500,
        tax_amount: 1530,
        total_amount: 10030,
        stock_issued: false,
        notes: 'En préparation',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: 'SO-2024-003',
        order_date: now.toISOString().split('T')[0],
        expected_delivery_date: inTwoWeeks.toISOString().split('T')[0],
        customer_id: customers[2]?.id || customers[0]?.id,
        customer_name: customers[2]?.customer_name || customers[0]?.customer_name || 'Client Demo',
        customer_address: customers[2]?.address || customers[0]?.address,
        status: 'draft',
        subtotal: 20000,
        tax_amount: 3600,
        total_amount: 23600,
        stock_issued: false,
        notes: 'Nouvelle commande en attente de validation',
        created_by: userId,
      },
    ];

    const { data: createdOrders, error } = await client
      .from('sales_orders')
      .insert(salesOrders)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo sales orders: ${error.message}`);
      return [];
    }

    // Create sales order items for each order
    if (createdOrders && createdOrders.length > 0) {
      const orderItems = [
        {
          sales_order_id: createdOrders[0].id,
          line_number: 1,
          item_id: oliveOilItem?.id,
          item_name: 'Huile d\'Olive Extra Vierge',
          description: 'Huile d\'olive de qualité supérieure',
          quantity: 500,
          unit_of_measure: 'L',
          unit_price: 30,
          amount: 15000,
          tax_rate: 18,
          tax_amount: 2700,
          line_total: 17700,
        },
        {
          sales_order_id: createdOrders[1].id,
          line_number: 1,
          item_id: citrusItem?.id,
          item_name: 'Clémentines',
          description: 'Clémentines fraîches de saison',
          quantity: 300,
          unit_of_measure: 'kg',
          unit_price: 28.33,
          amount: 8500,
          tax_rate: 18,
          tax_amount: 1530,
          line_total: 10030,
        },
        {
          sales_order_id: createdOrders[2].id,
          line_number: 1,
          item_id: oliveOilItem?.id,
          item_name: 'Huile d\'Olive Extra Vierge',
          description: 'Grande commande huile olive',
          quantity: 400,
          unit_of_measure: 'L',
          unit_price: 40,
          amount: 16000,
          tax_rate: 18,
          tax_amount: 2880,
          line_total: 18880,
        },
        {
          sales_order_id: createdOrders[2].id,
          line_number: 2,
          item_id: citrusItem?.id,
          item_name: 'Oranges Navel',
          description: 'Oranges pour jus',
          quantity: 200,
          unit_of_measure: 'kg',
          unit_price: 20,
          amount: 4000,
          tax_rate: 18,
          tax_amount: 720,
          line_total: 4720,
        },
      ];

      await client.from('sales_order_items').insert(orderItems);
    }

    return createdOrders || [];
  }

  /**
   * Create demo purchase orders
   */
  private async createDemoPurchaseOrders(
    organizationId: string,
    suppliers: any[],
    items: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inThreeWeeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

    // Find input items (fertilizers, seeds, etc.)
    const fertilizerItem = items.find(i => i.item_name?.includes('Engrais') || i.item_name?.includes('NPK')) || items[0];
    const seedItem = items.find(i => i.item_name?.includes('Semence') || i.item_name?.includes('Graine')) || items[1];

    const purchaseOrders = [
      {
        organization_id: organizationId,
        order_number: 'PO-2024-001',
        order_date: lastMonth.toISOString().split('T')[0],
        expected_delivery_date: new Date(lastMonth.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplier_id: suppliers[0]?.id,
        supplier_name: suppliers[0]?.supplier_name || 'Fournisseur Demo',
        supplier_contact: suppliers[0]?.email,
        status: 'received',
        subtotal: 12500,
        tax_amount: 2250,
        total_amount: 14750,
        stock_received: true,
        stock_received_date: new Date(lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Commande reçue et contrôlée',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: 'PO-2024-002',
        order_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expected_delivery_date: nextWeek.toISOString().split('T')[0],
        supplier_id: suppliers[1]?.id || suppliers[0]?.id,
        supplier_name: suppliers[1]?.supplier_name || suppliers[0]?.supplier_name || 'Fournisseur Demo',
        supplier_contact: suppliers[1]?.email || suppliers[0]?.email,
        status: 'confirmed',
        subtotal: 8000,
        tax_amount: 1440,
        total_amount: 9440,
        stock_received: false,
        notes: 'En cours de livraison',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: 'PO-2024-003',
        order_date: now.toISOString().split('T')[0],
        expected_delivery_date: inThreeWeeks.toISOString().split('T')[0],
        supplier_id: suppliers[0]?.id,
        supplier_name: suppliers[0]?.supplier_name || 'Fournisseur Demo',
        supplier_contact: suppliers[0]?.email,
        status: 'draft',
        subtotal: 15000,
        tax_amount: 2700,
        total_amount: 17700,
        stock_received: false,
        notes: 'Commande en préparation pour la saison',
        created_by: userId,
      },
    ];

    const { data: createdOrders, error } = await client
      .from('purchase_orders')
      .insert(purchaseOrders)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo purchase orders: ${error.message}`);
      return [];
    }

    // Create purchase order items
    if (createdOrders && createdOrders.length > 0) {
      const orderItems = [
        // PO 1 items
        {
          purchase_order_id: createdOrders[0].id,
          line_number: 1,
          item_id: fertilizerItem?.id,
          item_name: 'Engrais NPK 20-20-20',
          description: 'Engrais équilibré pour cultures',
          quantity: 500,
          unit_of_measure: 'kg',
          unit_price: 25,
          amount: 12500,
          tax_rate: 18,
          tax_amount: 2250,
          line_total: 14750,
        },
        // PO 2 items
        {
          purchase_order_id: createdOrders[1].id,
          line_number: 1,
          item_id: seedItem?.id,
          item_name: 'Semences Tomate Bio',
          description: 'Semences certifiées biologiques',
          quantity: 50,
          unit_of_measure: 'kg',
          unit_price: 120,
          amount: 6000,
          tax_rate: 18,
          tax_amount: 1080,
          line_total: 7080,
        },
        {
          purchase_order_id: createdOrders[1].id,
          line_number: 2,
          item_id: fertilizerItem?.id,
          item_name: 'Compost Organique',
          description: 'Compost naturel enrichi',
          quantity: 100,
          unit_of_measure: 'kg',
          unit_price: 20,
          amount: 2000,
          tax_rate: 18,
          tax_amount: 360,
          line_total: 2360,
        },
        // PO 3 items
        {
          purchase_order_id: createdOrders[2].id,
          line_number: 1,
          item_id: fertilizerItem?.id,
          item_name: 'Engrais Phosphaté',
          description: 'Engrais riche en phosphore pour fruitiers',
          quantity: 300,
          unit_of_measure: 'kg',
          unit_price: 30,
          amount: 9000,
          tax_rate: 18,
          tax_amount: 1620,
          line_total: 10620,
        },
        {
          purchase_order_id: createdOrders[2].id,
          line_number: 2,
          item_id: seedItem?.id,
          item_name: 'Plants d\'Olivier',
          description: 'Jeunes plants d\'olivier certifiés',
          quantity: 50,
          unit_of_measure: 'unité',
          unit_price: 120,
          amount: 6000,
          tax_rate: 18,
          tax_amount: 1080,
          line_total: 7080,
        },
      ];

      await client.from('purchase_order_items').insert(orderItems);
    }

    return createdOrders || [];
  }

  /**
   * Create demo invoices
   */
  private async createDemoInvoices(
    organizationId: string,
    parcels: any[],
    customers: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 15);

    // Get expense account for cost center linking
    const { data: expenseAccounts } = await client
      .from('accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('account_type', 'Expense')
      .limit(1);

    const invoices = [
      {
        organization_id: organizationId,
        invoice_number: 'INV-2024-001',
        invoice_date: lastMonth.toISOString().split('T')[0],
        invoice_type: 'sales',
        party_id: customers[0].id,
        party_name: customers[0].customer_name,
        party_type: 'customer',
        subtotal: 1000,
        tax_total: 180,
        grand_total: 1180,
        paid_amount: 1180,
        outstanding_amount: 0,
        currency_code: 'MAD',
        status: 'paid',
        due_date: lastMonth.toISOString().split('T')[0],
        created_by: userId,
      },
      {
        organization_id: organizationId,
        invoice_number: 'INV-2024-002',
        invoice_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        invoice_type: 'sales',
        party_id: customers[0].id,
        party_name: customers[0].customer_name,
        party_type: 'customer',
        subtotal: 2500,
        tax_total: 450,
        grand_total: 2950,
        paid_amount: 0,
        outstanding_amount: 2950,
        currency_code: 'MAD',
        status: 'submitted',
        due_date: dueDate.toISOString().split('T')[0],
        created_by: userId,
      },
      {
        organization_id: organizationId,
        invoice_number: 'INV-2024-003',
        invoice_date: now.toISOString().split('T')[0],
        invoice_type: 'sales',
        party_id: customers[1].id,
        party_name: customers[1].customer_name,
        party_type: 'customer',
        subtotal: 1500,
        tax_total: 270,
        grand_total: 1770,
        paid_amount: 0,
        outstanding_amount: 1770,
        currency_code: 'MAD',
        status: 'draft',
        created_by: userId,
      },
    ];

    const { data: createdInvoices, error } = await client
      .from('invoices')
      .insert(invoices)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo invoices: ${error.message}`);
      // Don't throw - invoices are optional
      return [];
    }

    return createdInvoices || [];
  }

  /**
   * Create demo harvest records
   */
  private async createDemoHarvests(
    organizationId: string,
    farmId: string,
    parcels: any[],
    workers: any[],
    tasks: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    // Find completed harvest task from the tasks we just created
    const harvestTask = tasks.find(
      (t) => t.task_type === 'harvesting' && t.status === 'completed',
    );

    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Get warehouse for harvests
    const { data: warehouse } = await client
      .from('warehouses')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    const harvests = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id, // Agrumes parcel
        harvest_date: lastMonth.toISOString().split('T')[0],
        quantity: 5000,
        unit: 'kg',
        quality_grade: 'A',
        quality_score: 8,
        quality_notes: 'Excellent qualité, récolte abondante',
        harvest_task_id: harvestTask?.id || null,
        workers: [
          {
            worker_id: workers[2].id,
            hours_worked: 8,
            quantity_picked: 2000,
          },
          {
            worker_id: workers[1].id,
            hours_worked: 6,
            quantity_picked: 1500,
          },
        ],
        status: 'sold',
        intended_for: 'market',
        expected_price_per_unit: 12,
        warehouse_id: warehouse?.id || null,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id, // Olives parcel
        harvest_date: twoMonthsAgo.toISOString().split('T')[0],
        quantity: 3000,
        unit: 'kg',
        quality_grade: 'Extra',
        quality_score: 9,
        quality_notes: 'Qualité exceptionnelle, olives de première qualité',
        workers: [
          {
            worker_id: workers[2].id,
            hours_worked: 12,
            quantity_picked: 1500,
          },
          {
            worker_id: workers[0].id,
            hours_worked: 10,
            quantity_picked: 1000,
          },
        ],
        status: 'stored',
        intended_for: 'processing',
        expected_price_per_unit: 15,
        warehouse_id: warehouse?.id || null,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2].id, // Légumes parcel
        harvest_date: lastWeek.toISOString().split('T')[0],
        quantity: 1200,
        unit: 'kg',
        quality_grade: 'A',
        quality_score: 7,
        quality_notes: 'Tomates fraîches, bonne qualité générale',
        workers: [
          {
            worker_id: workers[1].id,
            hours_worked: 6,
            quantity_picked: 800,
          },
        ],
        status: 'in_delivery',
        intended_for: 'market',
        expected_price_per_unit: 8,
        warehouse_id: warehouse?.id || null,
        created_by: userId,
      },
    ];

    const { data: createdHarvests, error } = await client
      .from('harvest_records')
      .insert(harvests)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo harvests: ${error.message}`);
      // Don't throw - harvests are optional
      return [];
    }

    return createdHarvests || [];
  }

  /**
   * Create demo reception batches with quality control
   */
  private async createDemoReceptionBatches(
    organizationId: string,
    farmId: string,
    parcels: any[],
    workers: any[],
    harvests: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    // Get warehouse
    const { data: warehouse } = await client
      .from('warehouses')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    if (!warehouse) {
      this.logger.error('No warehouse found for reception batches');
      return;
    }

    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const receptionBatches = [
      {
        organization_id: organizationId,
        warehouse_id: warehouse.id,
        harvest_id: harvests[0]?.id || null, // Agrumes harvest
        parcel_id: parcels[1].id, // Agrumes parcel
        batch_code: 'RB-2024-001',
        reception_date: lastMonth.toISOString().split('T')[0],
        reception_time: '14:30:00',
        weight: 5000,
        weight_unit: 'kg',
        quantity: 5000,
        quantity_unit: 'kg',
        quality_grade: 'A',
        quality_score: 8,
        quality_notes: 'Qualité excellente, fruits mûrs et sans défauts',
        humidity_percentage: 75,
        maturity_level: 'optimal',
        temperature: 18,
        moisture_content: 12.5,
        received_by: workers[2].id,
        quality_checked_by: workers[0].id,
        decision: 'direct_sale',
        status: 'processed',
        notes: 'Lot approuvé pour vente directe',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        warehouse_id: warehouse.id,
        harvest_id: harvests[1]?.id || null, // Olives harvest
        parcel_id: parcels[0].id, // Olives parcel
        batch_code: 'RB-2024-002',
        reception_date: twoDaysAgo.toISOString().split('T')[0],
        reception_time: '10:15:00',
        weight: 3000,
        weight_unit: 'kg',
        quantity: 3000,
        quantity_unit: 'kg',
        quality_grade: 'Extra',
        quality_score: 9,
        quality_notes: 'Qualité exceptionnelle, olives de première qualité',
        humidity_percentage: 60,
        maturity_level: 'optimal',
        temperature: 20,
        moisture_content: 8.2,
        received_by: workers[1].id,
        quality_checked_by: workers[0].id,
        decision: 'storage',
        destination_warehouse_id: warehouse.id,
        status: 'decision_made',
        notes: 'Lot destiné au stockage pour transformation',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        warehouse_id: warehouse.id,
        harvest_id: harvests[2]?.id || null, // Tomates harvest
        parcel_id: parcels[2].id, // Légumes parcel
        batch_code: 'RB-2024-003',
        reception_date: lastWeek.toISOString().split('T')[0],
        reception_time: '16:45:00',
        weight: 1200,
        weight_unit: 'kg',
        quantity: 1200,
        quantity_unit: 'kg',
        quality_grade: 'A',
        quality_score: 7,
        quality_notes: 'Tomates fraîches, quelques défauts mineurs',
        humidity_percentage: 85,
        maturity_level: 'good',
        temperature: 22,
        moisture_content: 15.3,
        received_by: workers[1].id,
        quality_checked_by: workers[0].id,
        decision: 'direct_sale',
        status: 'quality_checked',
        notes: 'En attente de décision finale',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        warehouse_id: warehouse.id,
        parcel_id: parcels[1].id, // Agrumes parcel
        batch_code: 'RB-2024-004',
        reception_date: now.toISOString().split('T')[0],
        reception_time: '09:00:00',
        weight: 2500,
        weight_unit: 'kg',
        quantity: 2500,
        quantity_unit: 'kg',
        quality_grade: null,
        quality_score: null,
        quality_notes: null,
        humidity_percentage: null,
        maturity_level: null,
        temperature: null,
        moisture_content: null,
        received_by: workers[2].id,
        quality_checked_by: null,
        decision: 'pending',
        status: 'received',
        notes: 'Lot reçu, contrôle qualité en attente',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        warehouse_id: warehouse.id,
        parcel_id: parcels[0].id, // Olives parcel
        batch_code: 'RB-2024-005',
        reception_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        reception_time: '11:30:00',
        weight: 1500,
        weight_unit: 'kg',
        quantity: 1500,
        quantity_unit: 'kg',
        quality_grade: 'B',
        quality_score: 6,
        quality_notes: 'Qualité acceptable mais quelques défauts observés',
        humidity_percentage: 70,
        maturity_level: 'good',
        temperature: 19,
        moisture_content: 10.8,
        received_by: workers[1].id,
        quality_checked_by: workers[0].id,
        decision: 'transformation',
        status: 'decision_made',
        notes: 'Lot destiné à la transformation (huile)',
        created_by: userId,
      },
    ];

    const { error } = await client.from('reception_batches').insert(receptionBatches);

    if (error) {
      this.logger.error(`Failed to create demo reception batches: ${error.message}`);
      // Don't throw - reception batches are optional
    }
  }

  /**
   * Create demo financial data (costs and revenues)
   */
  private async createDemoFinancialData(
    organizationId: string,
    parcels: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // Create costs
    const costs = [
      {
        organization_id: organizationId,
        parcel_id: parcels[0].id,
        cost_type: 'materials',
        amount: 2500,
        currency: 'MAD',
        date: lastMonth.toISOString().split('T')[0],
        description: 'Achat engrais organique pour parcelle olives',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        parcel_id: parcels[1].id,
        cost_type: 'labor',
        amount: 1800,
        currency: 'MAD',
        date: lastMonth.toISOString().split('T')[0],
        description: 'Main d\'œuvre pour taille agrumes',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        parcel_id: parcels[2].id,
        cost_type: 'utilities',
        amount: 1200,
        currency: 'MAD',
        date: twoMonthsAgo.toISOString().split('T')[0],
        description: 'Coût irrigation parcelle légumes',
        created_by: userId,
      },
    ];

    await client.from('costs').insert(costs);

    // Create revenues
    const revenues = [
      {
        organization_id: organizationId,
        parcel_id: parcels[1].id,
        revenue_type: 'harvest',
        amount: 60000,
        currency: 'MAD',
        date: lastMonth.toISOString().split('T')[0],
        crop_type: 'Agrumes',
        quantity: 5000,
        unit: 'kg',
        price_per_unit: 12,
        description: 'Vente récolte agrumes',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        parcel_id: parcels[0].id,
        revenue_type: 'harvest',
        amount: 45000,
        currency: 'MAD',
        date: twoMonthsAgo.toISOString().split('T')[0],
        crop_type: 'Olives',
        quantity: 3000,
        unit: 'kg',
        price_per_unit: 15,
        description: 'Vente récolte olives',
        created_by: userId,
      },
    ];

    await client.from('revenues').insert(revenues);
  }

  /**
   * Create demo infrastructure structures
   */
  private async createDemoStructures(
    organizationId: string,
    farmId: string,
    _userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const baseLat = 34.9214;
    const baseLon = -2.3197;

    // Organization-level structures (shared across all farms)
    const organizationStructures = [
      {
        organization_id: organizationId,
        farm_id: null, // No farm_id = organization level
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

  /**
   * Clear all demo data for an organization
   * This deletes data that was created via demo seeding
   */
  async clearDemoData(organizationId: string): Promise<{ deletedCounts: Record<string, number> }> {
    this.logger.log(`Clearing demo data for organization ${organizationId}`);
    const client = this.databaseService.getAdminClient();
    const deletedCounts: Record<string, number> = {};

    try {
      // Delete in reverse order of dependencies

      // Financial data
      const { count: costsCount } = await client
        .from('costs')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['costs'] = costsCount || 0;

      const { count: revenuesCount } = await client
        .from('revenues')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['revenues'] = revenuesCount || 0;

      // Reception batches
      const { count: receptionBatchesCount } = await client
        .from('reception_batches')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['reception_batches'] = receptionBatchesCount || 0;

      // Harvests
      const { count: harvestsCount } = await client
        .from('harvest_records')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['harvest_records'] = harvestsCount || 0;

      // Invoice items then invoices
      const { data: invoices } = await client
        .from('invoices')
        .select('id')
        .eq('organization_id', organizationId);
      if (invoices && invoices.length > 0) {
        const invoiceIds = invoices.map(i => i.id);
        await client.from('invoice_items').delete().in('invoice_id', invoiceIds);
      }
      const { count: invoicesCount } = await client
        .from('invoices')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['invoices'] = invoicesCount || 0;

      // Quote items then quotes
      const { data: quotes } = await client
        .from('quotes')
        .select('id')
        .eq('organization_id', organizationId);
      if (quotes && quotes.length > 0) {
        const quoteIds = quotes.map(q => q.id);
        await client.from('quote_items').delete().in('quote_id', quoteIds);
      }
      const { count: quotesCount } = await client
        .from('quotes')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['quotes'] = quotesCount || 0;

      // Sales order items then sales orders
      const { data: salesOrders } = await client
        .from('sales_orders')
        .select('id')
        .eq('organization_id', organizationId);
      if (salesOrders && salesOrders.length > 0) {
        const orderIds = salesOrders.map(o => o.id);
        await client.from('sales_order_items').delete().in('sales_order_id', orderIds);
      }
      const { count: salesOrdersCount } = await client
        .from('sales_orders')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['sales_orders'] = salesOrdersCount || 0;

      // Purchase order items then purchase orders
      const { data: purchaseOrders } = await client
        .from('purchase_orders')
        .select('id')
        .eq('organization_id', organizationId);
      if (purchaseOrders && purchaseOrders.length > 0) {
        const poIds = purchaseOrders.map(po => po.id);
        await client.from('purchase_order_items').delete().in('purchase_order_id', poIds);
      }
      const { count: purchaseOrdersCount } = await client
        .from('purchase_orders')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['purchase_orders'] = purchaseOrdersCount || 0;

      // Customers and suppliers
      const { count: customersCount } = await client
        .from('customers')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['customers'] = customersCount || 0;

      const { count: suppliersCount } = await client
        .from('suppliers')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['suppliers'] = suppliersCount || 0;

      // Stock entry items and stock entries
      const { data: stockEntries } = await client
        .from('stock_entries')
        .select('id')
        .eq('organization_id', organizationId);
      if (stockEntries && stockEntries.length > 0) {
        const entryIds = stockEntries.map(e => e.id);
        await client.from('stock_entry_items').delete().in('stock_entry_id', entryIds);
      }
      const { count: stockEntriesCount } = await client
        .from('stock_entries')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['stock_entries'] = stockEntriesCount || 0;

      // Items and item groups
      const { count: itemsCount } = await client
        .from('items')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['items'] = itemsCount || 0;

      const { count: itemGroupsCount } = await client
        .from('item_groups')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['item_groups'] = itemGroupsCount || 0;

      // Warehouses
      const { count: warehousesCount } = await client
        .from('warehouses')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['warehouses'] = warehousesCount || 0;

      // Structures
      const { count: structuresCount } = await client
        .from('structures')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['structures'] = structuresCount || 0;

      // Tasks
      const { count: tasksCount } = await client
        .from('tasks')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['tasks'] = tasksCount || 0;

      // Cost centers
      const { count: costCentersCount } = await client
        .from('cost_centers')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['cost_centers'] = costCentersCount || 0;

      // Workers
      const { count: workersCount } = await client
        .from('workers')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['workers'] = workersCount || 0;

      // Parcels
      const { count: parcelsCount } = await client
        .from('parcels')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['parcels'] = parcelsCount || 0;

      // Farms
      const { count: farmsCount } = await client
        .from('farms')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId);
      deletedCounts['farms'] = farmsCount || 0;

      this.logger.log(`✅ Demo data cleared for organization ${organizationId}`);
      return { deletedCounts };
    } catch (error) {
      this.logger.error(`❌ Error clearing demo data: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get data statistics for an organization
   */
  async getDataStats(organizationId: string): Promise<Record<string, number>> {
    const client = this.databaseService.getAdminClient();
    const stats: Record<string, number> = {};

    const tables = [
      'farms', 'parcels', 'workers', 'tasks', 'harvest_records',
      'reception_batches', 'warehouses', 'items', 'item_groups',
      'customers', 'suppliers', 'quotes', 'sales_orders', 'purchase_orders', 'invoices',
      'costs', 'revenues', 'structures', 'cost_centers', 'stock_entries'
    ];

    for (const table of tables) {
      try {
        const { count } = await client
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
        stats[table] = count || 0;
      } catch {
        stats[table] = 0;
      }
    }

    return stats;
  }

  /**
   * Create demo items and warehouses
   */
  private async createDemoItems(
    organizationId: string,
    farmId: string,
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    // First, create a warehouse
    const { data: warehouse, error: warehouseError } = await client
      .from('warehouses')
      .insert({
        organization_id: organizationId,
        farm_id: farmId,
        name: 'Entrepôt Principal',
        description: 'Entrepôt principal pour stockage des intrants agricoles',
        location: 'Zone de stockage principale',
        is_active: true,
      })
      .select()
      .single();

    if (warehouseError) {
      this.logger.error(`Failed to create demo warehouse: ${warehouseError.message}`);
      return;
    }

    // Get default accounts for item groups
    const { data: expenseAccount } = await client
      .from('accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('account_type', 'Expense')
      .limit(1)
      .single();

    // Create item groups
    const itemGroups = [
      {
        organization_id: organizationId,
        name: 'Engrais',
        code: 'GRP-ENG',
        description: 'Engrais et fertilisants',
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: 'Semences',
        code: 'GRP-SEM',
        description: 'Semences et plants',
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: 'Produits Phytosanitaires',
        code: 'GRP-PHY',
        description: 'Pesticides et produits de traitement',
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: 'Équipements',
        code: 'GRP-EQP',
        description: 'Équipements et outils agricoles',
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdGroups, error: groupsError } = await client
      .from('item_groups')
      .insert(itemGroups)
      .select();

    if (groupsError) {
      this.logger.error(`Failed to create demo item groups: ${groupsError.message}`);
      return;
    }

    // Create items
    const items = [
      {
        organization_id: organizationId,
        item_code: 'ENG-NPK-15-15-15',
        item_name: 'Engrais NPK 15-15-15',
        description: 'Engrais complet NPK pour arbres fruitiers',
        item_group_id: createdGroups[0].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: 'kg',
        stock_uom: 'kg',
        standard_rate: 12.5,
        minimum_stock_level: 500,
        valuation_method: 'Moving Average',
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: 'ENG-ORG-50KG',
        item_name: 'Engrais Organique 50kg',
        description: 'Engrais organique en sac de 50kg',
        item_group_id: createdGroups[0].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: 'sac',
        stock_uom: 'sac',
        standard_rate: 85,
        minimum_stock_level: 20,
        valuation_method: 'Moving Average',
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: 'SEM-TOM-MARM',
        item_name: 'Semences Tomates Marmande',
        description: 'Semences de tomates variété Marmande',
        item_group_id: createdGroups[1].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: 'paquet',
        stock_uom: 'paquet',
        standard_rate: 25,
        minimum_stock_level: 10,
        has_expiry_date: true,
        valuation_method: 'Moving Average',
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: 'SEM-CIT-CLEM',
        item_name: 'Plants Clémentiniers',
        description: 'Plants de clémentiniers certifiés',
        item_group_id: createdGroups[1].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: 'unité',
        stock_uom: 'unité',
        standard_rate: 15,
        minimum_stock_level: 50,
        valuation_method: 'Moving Average',
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: 'PHY-FONG-1L',
        item_name: 'Fongicide Systémique 1L',
        description: 'Fongicide systémique pour traitement préventif',
        item_group_id: createdGroups[2].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: 'litre',
        stock_uom: 'litre',
        standard_rate: 120,
        minimum_stock_level: 5,
        has_expiry_date: true,
        valuation_method: 'Moving Average',
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: 'PHY-INS-500ML',
        item_name: 'Insecticide 500ml',
        description: 'Insecticide pour traitement des parasites',
        item_group_id: createdGroups[2].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: 'bouteille',
        stock_uom: 'bouteille',
        standard_rate: 95,
        minimum_stock_level: 8,
        has_expiry_date: true,
        valuation_method: 'Moving Average',
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: 'EQP-SEC-AC',
        item_name: 'Sécateur Professionnel',
        description: 'Sécateur professionnel pour taille',
        item_group_id: createdGroups[3].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: 'unité',
        stock_uom: 'unité',
        standard_rate: 180,
        minimum_stock_level: 3,
        valuation_method: 'Moving Average',
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: 'EQP-PULV-20L',
        item_name: 'Pulvérisateur 20L',
        description: 'Pulvérisateur à dos 20 litres',
        item_group_id: createdGroups[3].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: 'unité',
        stock_uom: 'unité',
        standard_rate: 450,
        minimum_stock_level: 2,
        valuation_method: 'Moving Average',
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdItems, error: itemsError } = await client
      .from('items')
      .insert(items)
      .select();

    if (itemsError) {
      this.logger.error(`Failed to create demo items: ${itemsError.message}`);
      // Don't throw - items are optional
      return { warehouse, items: [] };
    }

    return { warehouse, items: createdItems || [] };
  }

  /**
   * Create demo stock entries
   */
  private async createDemoStockEntries(
    organizationId: string,
    warehouse: any,
    items: any[],
    userId: string,
  ) {
    if (!warehouse || !items || items.length === 0) {
      this.logger.warn('Cannot create stock entries: missing warehouse or items');
      return;
    }

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Create stock entries with various types
    const stockEntries = [
      // Material Receipt - Initial stock (1 month ago)
      {
        organization_id: organizationId,
        entry_number: 'SE-2024-001',
        entry_type: 'Material Receipt',
        entry_date: lastMonth.toISOString().split('T')[0],
        to_warehouse_id: warehouse.id,
        reference_type: 'Purchase Order',
        reference_number: 'PO-2024-001',
        status: 'Posted',
        purpose: 'Approvisionnement initial en engrais',
        notes: 'Stock initial pour la saison',
        posted_at: lastMonth.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // Material Receipt - Additional stock (2 weeks ago)
      {
        organization_id: organizationId,
        entry_number: 'SE-2024-002',
        entry_type: 'Material Receipt',
        entry_date: twoWeeksAgo.toISOString().split('T')[0],
        to_warehouse_id: warehouse.id,
        reference_type: 'Purchase Order',
        reference_number: 'PO-2024-002',
        status: 'Posted',
        purpose: 'Réapprovisionnement produits phytosanitaires',
        notes: 'Commande urgente suite à épuisement',
        posted_at: twoWeeksAgo.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // Material Issue - Usage for tasks (1 week ago)
      {
        organization_id: organizationId,
        entry_number: 'SE-2024-003',
        entry_type: 'Material Issue',
        entry_date: oneWeekAgo.toISOString().split('T')[0],
        from_warehouse_id: warehouse.id,
        reference_type: 'Task',
        reference_number: 'TSK-2024-001',
        status: 'Posted',
        purpose: 'Sortie pour traitement phytosanitaire',
        notes: 'Utilisé pour traitement préventif parcelle olives',
        posted_at: oneWeekAgo.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // Material Issue - Another usage (3 days ago)
      {
        organization_id: organizationId,
        entry_number: 'SE-2024-004',
        entry_type: 'Material Issue',
        entry_date: threeDaysAgo.toISOString().split('T')[0],
        from_warehouse_id: warehouse.id,
        reference_type: 'Task',
        reference_number: 'TSK-2024-002',
        status: 'Posted',
        purpose: 'Sortie pour fertilisation',
        notes: 'Application engrais parcelle agrumes',
        posted_at: threeDaysAgo.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // Stock Reconciliation (yesterday)
      {
        organization_id: organizationId,
        entry_number: 'SE-2024-005',
        entry_type: 'Stock Reconciliation',
        entry_date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to_warehouse_id: warehouse.id,
        status: 'Posted',
        purpose: 'Inventaire mensuel',
        notes: 'Réconciliation après comptage physique',
        posted_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // Draft entry (today)
      {
        organization_id: organizationId,
        entry_number: 'SE-2024-006',
        entry_type: 'Material Receipt',
        entry_date: now.toISOString().split('T')[0],
        to_warehouse_id: warehouse.id,
        reference_type: 'Purchase Order',
        reference_number: 'PO-2024-003',
        status: 'Draft',
        purpose: 'Nouvelle livraison en attente',
        notes: 'En attente de vérification',
        created_by: userId,
      },
    ];

    const { data: createdEntries, error: entriesError } = await client
      .from('stock_entries')
      .insert(stockEntries)
      .select();

    if (entriesError) {
      this.logger.error(`Failed to create demo stock entries: ${entriesError.message}`);
      return;
    }

    if (!createdEntries || createdEntries.length === 0) {
      return;
    }

    // Create stock entry items for each entry
    const stockEntryItems: any[] = [];

    // Entry 1: Material Receipt - Initial stock
    if (items[0]) { // NPK
      stockEntryItems.push({
        stock_entry_id: createdEntries[0].id,
        line_number: 1,
        item_id: items[0].id,
        item_name: items[0].item_name,
        quantity: 500,
        unit: 'kg',
        target_warehouse_id: warehouse.id,
        cost_per_unit: 12.5,
        total_cost: 6250,
        notes: 'Lot initial NPK',
      });
    }
    if (items[1]) { // Engrais Organique
      stockEntryItems.push({
        stock_entry_id: createdEntries[0].id,
        line_number: 2,
        item_id: items[1].id,
        item_name: items[1].item_name,
        quantity: 30,
        unit: 'sac',
        target_warehouse_id: warehouse.id,
        cost_per_unit: 85,
        total_cost: 2550,
        notes: 'Lot initial engrais organique',
      });
    }

    // Entry 2: Material Receipt - Phytosanitary products
    if (items[4]) { // Fongicide
      stockEntryItems.push({
        stock_entry_id: createdEntries[1].id,
        line_number: 1,
        item_id: items[4].id,
        item_name: items[4].item_name,
        quantity: 20,
        unit: 'litre',
        target_warehouse_id: warehouse.id,
        batch_number: 'LOT-FONG-2024-001',
        expiry_date: new Date(now.getFullYear() + 2, now.getMonth(), 1).toISOString().split('T')[0],
        cost_per_unit: 120,
        total_cost: 2400,
        notes: 'Fongicide avec date d\'expiration',
      });
    }
    if (items[5]) { // Insecticide
      stockEntryItems.push({
        stock_entry_id: createdEntries[1].id,
        line_number: 2,
        item_id: items[5].id,
        item_name: items[5].item_name,
        quantity: 15,
        unit: 'bouteille',
        target_warehouse_id: warehouse.id,
        batch_number: 'LOT-INS-2024-001',
        expiry_date: new Date(now.getFullYear() + 1, now.getMonth() + 6, 1).toISOString().split('T')[0],
        cost_per_unit: 95,
        total_cost: 1425,
        notes: 'Insecticide avec numéro de lot',
      });
    }

    // Entry 3: Material Issue - Phytosanitary treatment
    if (items[4]) { // Fongicide
      stockEntryItems.push({
        stock_entry_id: createdEntries[2].id,
        line_number: 1,
        item_id: items[4].id,
        item_name: items[4].item_name,
        quantity: 5,
        unit: 'litre',
        source_warehouse_id: warehouse.id,
        batch_number: 'LOT-FONG-2024-001',
        cost_per_unit: 120,
        total_cost: 600,
        notes: 'Utilisé pour traitement préventif',
      });
    }

    // Entry 4: Material Issue - Fertilization
    if (items[0]) { // NPK
      stockEntryItems.push({
        stock_entry_id: createdEntries[3].id,
        line_number: 1,
        item_id: items[0].id,
        item_name: items[0].item_name,
        quantity: 100,
        unit: 'kg',
        source_warehouse_id: warehouse.id,
        cost_per_unit: 12.5,
        total_cost: 1250,
        notes: 'Application engrais NPK',
      });
    }

    // Entry 5: Stock Reconciliation
    if (items[0]) { // NPK
      stockEntryItems.push({
        stock_entry_id: createdEntries[4].id,
        line_number: 1,
        item_id: items[0].id,
        item_name: items[0].item_name,
        quantity: 395, // Adjusted quantity
        unit: 'kg',
        target_warehouse_id: warehouse.id,
        system_quantity: 400, // What system showed
        physical_quantity: 395, // What was counted
        variance: -5, // Small loss
        notes: 'Légère perte due à manipulation',
      });
    }

    // Entry 6: Draft entry items
    if (items[2]) { // Semences Tomates
      stockEntryItems.push({
        stock_entry_id: createdEntries[5].id,
        line_number: 1,
        item_id: items[2].id,
        item_name: items[2].item_name,
        quantity: 50,
        unit: 'paquet',
        target_warehouse_id: warehouse.id,
        cost_per_unit: 25,
        total_cost: 1250,
        notes: 'Nouvelle commande semences',
      });
    }

    const { error: itemsError } = await client
      .from('stock_entry_items')
      .insert(stockEntryItems);

    if (itemsError) {
      this.logger.error(`Failed to create demo stock entry items: ${itemsError.message}`);
    }
  }

  /**
   * Export all organization data as JSON
   */
  async exportOrganizationData(organizationId: string): Promise<any> {
    this.logger.log(`Exporting data for organization ${organizationId}`);
    const client = this.databaseService.getAdminClient();

    const exportData: Record<string, any[]> = {
      metadata: [{
        exportDate: new Date().toISOString(),
        organizationId,
        version: '1.0',
      }],
    };

    // Tables to export in order (respecting dependencies for import)
    const tables = [
      'farms',
      'parcels',
      'workers',
      'cost_centers',
      'structures',
      'warehouses',
      'item_groups',
      'items',
      'customers',
      'suppliers',
      'tasks',
      'task_assignments',
      'harvest_records',
      'reception_batches',
      'stock_entries',
      'stock_entry_items',
      'quotes',
      'quote_items',
      'sales_orders',
      'sales_order_items',
      'purchase_orders',
      'purchase_order_items',
      'invoices',
      'invoice_items',
      'costs',
      'revenues',
    ];

    for (const table of tables) {
      try {
        const { data, error } = await client
          .from(table)
          .select('*')
          .eq('organization_id', organizationId);

        if (error) {
          this.logger.warn(`Failed to export ${table}: ${error.message}`);
          exportData[table] = [];
        } else {
          exportData[table] = data || [];
        }
      } catch (err) {
        this.logger.warn(`Error exporting ${table}: ${err}`);
        exportData[table] = [];
      }
    }

    // Export related items (no organization_id column)
    // Stock entry items - get via stock_entries
    if (exportData.stock_entries && exportData.stock_entries.length > 0) {
      const entryIds = exportData.stock_entries.map((e: any) => e.id);
      const { data: stockEntryItems } = await client
        .from('stock_entry_items')
        .select('*')
        .in('stock_entry_id', entryIds);
      exportData.stock_entry_items = stockEntryItems || [];
    }

    // Quote items - get via quotes
    if (exportData.quotes && exportData.quotes.length > 0) {
      const quoteIds = exportData.quotes.map((q: any) => q.id);
      const { data: quoteItems } = await client
        .from('quote_items')
        .select('*')
        .in('quote_id', quoteIds);
      exportData.quote_items = quoteItems || [];
    }

    // Sales order items - get via sales_orders
    if (exportData.sales_orders && exportData.sales_orders.length > 0) {
      const orderIds = exportData.sales_orders.map((o: any) => o.id);
      const { data: salesOrderItems } = await client
        .from('sales_order_items')
        .select('*')
        .in('sales_order_id', orderIds);
      exportData.sales_order_items = salesOrderItems || [];
    }

    // Purchase order items - get via purchase_orders
    if (exportData.purchase_orders && exportData.purchase_orders.length > 0) {
      const poIds = exportData.purchase_orders.map((po: any) => po.id);
      const { data: purchaseOrderItems } = await client
        .from('purchase_order_items')
        .select('*')
        .in('purchase_order_id', poIds);
      exportData.purchase_order_items = purchaseOrderItems || [];
    }

    // Invoice items - get via invoices
    if (exportData.invoices && exportData.invoices.length > 0) {
      const invoiceIds = exportData.invoices.map((i: any) => i.id);
      const { data: invoiceItems } = await client
        .from('invoice_items')
        .select('*')
        .in('invoice_id', invoiceIds);
      exportData.invoice_items = invoiceItems || [];
    }

    this.logger.log(`Export completed for organization ${organizationId}`);
    return exportData;
  }

  /**
   * Import organization data from JSON
   */
  async importOrganizationData(
    organizationId: string,
    userId: string,
    importData: any,
  ): Promise<{ importedCounts: Record<string, number> }> {
    this.logger.log(`Importing data for organization ${organizationId}`);
    const client = this.databaseService.getAdminClient();
    const importedCounts: Record<string, number> = {};

    // Map old IDs to new IDs for reference updates
    const idMaps: Record<string, Map<string, string>> = {};

    // Tables to import in order (respecting dependencies)
    const importOrder = [
      'farms',
      'parcels',
      'workers',
      'cost_centers',
      'structures',
      'warehouses',
      'item_groups',
      'items',
      'customers',
      'suppliers',
      'tasks',
      'task_assignments',
      'harvest_records',
      'reception_batches',
      'stock_entries',
      'quotes',
      'sales_orders',
      'purchase_orders',
      'invoices',
      'costs',
      'revenues',
    ];

    for (const table of importOrder) {
      const records = importData[table];
      if (!records || !Array.isArray(records) || records.length === 0) {
        importedCounts[table] = 0;
        continue;
      }

      idMaps[table] = new Map();

      try {
        const processedRecords = records.map((record: any) => {
          const oldId = record.id;
          const newRecord = { ...record };

          // Remove fields that will be auto-generated
          delete newRecord.id;
          delete newRecord.created_at;
          delete newRecord.updated_at;

          // Update organization_id to current organization
          newRecord.organization_id = organizationId;

          // Update foreign key references using ID maps
          this.updateForeignKeys(newRecord, table, idMaps);

          // Update created_by/updated_by if present
          if (newRecord.created_by) newRecord.created_by = userId;
          if (newRecord.updated_by) newRecord.updated_by = userId;

          return { oldId, newRecord };
        });

        // Insert records one by one to track ID mapping
        for (const { oldId, newRecord } of processedRecords) {
          const { data: inserted, error } = await client
            .from(table)
            .insert(newRecord)
            .select('id')
            .single();

          if (error) {
            this.logger.warn(`Failed to import record to ${table}: ${error.message}`);
          } else if (inserted) {
            idMaps[table].set(oldId, inserted.id);
          }
        }

        importedCounts[table] = idMaps[table].size;
        this.logger.log(`Imported ${importedCounts[table]} records to ${table}`);
      } catch (err) {
        this.logger.error(`Error importing ${table}: ${err}`);
        importedCounts[table] = 0;
      }
    }

    // Import child tables (items without organization_id)
    await this.importChildRecords(client, importData, idMaps, importedCounts);

    this.logger.log(`Import completed for organization ${organizationId}`);
    return { importedCounts };
  }

  /**
   * Update foreign key references in a record based on ID mappings
   */
  private updateForeignKeys(
    record: any,
    table: string,
    idMaps: Record<string, Map<string, string>>,
  ): void {
    const foreignKeyMappings: Record<string, Record<string, string>> = {
      parcels: { farm_id: 'farms' },
      workers: { farm_id: 'farms' },
      cost_centers: { parcel_id: 'parcels' },
      structures: { farm_id: 'farms' },
      warehouses: { farm_id: 'farms' },
      items: {
        item_group_id: 'item_groups',
        default_warehouse_id: 'warehouses',
      },
      tasks: {
        farm_id: 'farms',
        parcel_id: 'parcels',
        assigned_to: 'workers',
      },
      task_assignments: {
        task_id: 'tasks',
        worker_id: 'workers',
      },
      harvest_records: {
        farm_id: 'farms',
        parcel_id: 'parcels',
        harvest_task_id: 'tasks',
        warehouse_id: 'warehouses',
      },
      reception_batches: {
        warehouse_id: 'warehouses',
        parcel_id: 'parcels',
        harvest_id: 'harvest_records',
        destination_warehouse_id: 'warehouses',
        received_by: 'workers',
        quality_checked_by: 'workers',
      },
      stock_entries: {
        from_warehouse_id: 'warehouses',
        to_warehouse_id: 'warehouses',
      },
      sales_orders: {
        customer_id: 'customers',
      },
      invoices: {
        party_id: 'customers', // or suppliers depending on type
      },
      costs: {
        parcel_id: 'parcels',
      },
      revenues: {
        parcel_id: 'parcels',
      },
    };

    const mappings = foreignKeyMappings[table];
    if (!mappings) return;

    for (const [fkField, refTable] of Object.entries(mappings)) {
      if (record[fkField] && idMaps[refTable]) {
        const newId = idMaps[refTable].get(record[fkField]);
        if (newId) {
          record[fkField] = newId;
        } else {
          // Referenced record not found, set to null
          record[fkField] = null;
        }
      }
    }
  }

  /**
   * Import child records (tables without organization_id)
   */
  private async importChildRecords(
    client: any,
    importData: any,
    idMaps: Record<string, Map<string, string>>,
    importedCounts: Record<string, number>,
  ): Promise<void> {
    // Stock entry items
    const stockEntryItems = importData.stock_entry_items;
    if (stockEntryItems && Array.isArray(stockEntryItems) && stockEntryItems.length > 0) {
      let count = 0;
      for (const item of stockEntryItems) {
        const newItem = { ...item };
        delete newItem.id;
        delete newItem.created_at;
        delete newItem.updated_at;

        // Update foreign keys
        if (newItem.stock_entry_id && idMaps.stock_entries) {
          const newId = idMaps.stock_entries.get(newItem.stock_entry_id);
          if (newId) newItem.stock_entry_id = newId;
          else continue; // Skip if parent not found
        }
        if (newItem.item_id && idMaps.items) {
          const newId = idMaps.items.get(newItem.item_id);
          if (newId) newItem.item_id = newId;
        }
        if (newItem.source_warehouse_id && idMaps.warehouses) {
          const newId = idMaps.warehouses.get(newItem.source_warehouse_id);
          if (newId) newItem.source_warehouse_id = newId;
        }
        if (newItem.target_warehouse_id && idMaps.warehouses) {
          const newId = idMaps.warehouses.get(newItem.target_warehouse_id);
          if (newId) newItem.target_warehouse_id = newId;
        }

        const { error } = await client.from('stock_entry_items').insert(newItem);
        if (!error) count++;
      }
      importedCounts.stock_entry_items = count;
    }

    // Quote items
    const quoteItems = importData.quote_items;
    if (quoteItems && Array.isArray(quoteItems) && quoteItems.length > 0) {
      let count = 0;
      for (const item of quoteItems) {
        const newItem = { ...item };
        delete newItem.id;
        delete newItem.created_at;
        delete newItem.updated_at;

        if (newItem.quote_id && idMaps.quotes) {
          const newId = idMaps.quotes.get(newItem.quote_id);
          if (newId) newItem.quote_id = newId;
          else continue;
        }
        if (newItem.item_id && idMaps.items) {
          const newId = idMaps.items.get(newItem.item_id);
          if (newId) newItem.item_id = newId;
        }

        const { error } = await client.from('quote_items').insert(newItem);
        if (!error) count++;
      }
      importedCounts.quote_items = count;
    }

    // Sales order items
    const salesOrderItems = importData.sales_order_items;
    if (salesOrderItems && Array.isArray(salesOrderItems) && salesOrderItems.length > 0) {
      let count = 0;
      for (const item of salesOrderItems) {
        const newItem = { ...item };
        delete newItem.id;
        delete newItem.created_at;
        delete newItem.updated_at;

        if (newItem.sales_order_id && idMaps.sales_orders) {
          const newId = idMaps.sales_orders.get(newItem.sales_order_id);
          if (newId) newItem.sales_order_id = newId;
          else continue;
        }
        if (newItem.item_id && idMaps.items) {
          const newId = idMaps.items.get(newItem.item_id);
          if (newId) newItem.item_id = newId;
        }

        const { error } = await client.from('sales_order_items').insert(newItem);
        if (!error) count++;
      }
      importedCounts.sales_order_items = count;
    }

    // Purchase order items
    const purchaseOrderItems = importData.purchase_order_items;
    if (purchaseOrderItems && Array.isArray(purchaseOrderItems) && purchaseOrderItems.length > 0) {
      let count = 0;
      for (const item of purchaseOrderItems) {
        const newItem = { ...item };
        delete newItem.id;
        delete newItem.created_at;
        delete newItem.updated_at;

        if (newItem.purchase_order_id && idMaps.purchase_orders) {
          const newId = idMaps.purchase_orders.get(newItem.purchase_order_id);
          if (newId) newItem.purchase_order_id = newId;
          else continue;
        }
        if (newItem.item_id && idMaps.items) {
          const newId = idMaps.items.get(newItem.item_id);
          if (newId) newItem.item_id = newId;
        }

        const { error } = await client.from('purchase_order_items').insert(newItem);
        if (!error) count++;
      }
      importedCounts.purchase_order_items = count;
    }

    // Invoice items
    const invoiceItems = importData.invoice_items;
    if (invoiceItems && Array.isArray(invoiceItems) && invoiceItems.length > 0) {
      let count = 0;
      for (const item of invoiceItems) {
        const newItem = { ...item };
        delete newItem.id;
        delete newItem.created_at;
        delete newItem.updated_at;

        if (newItem.invoice_id && idMaps.invoices) {
          const newId = idMaps.invoices.get(newItem.invoice_id);
          if (newId) newItem.invoice_id = newId;
          else continue;
        }
        if (newItem.item_id && idMaps.items) {
          const newId = idMaps.items.get(newItem.item_id);
          if (newId) newItem.item_id = newId;
        }

        const { error } = await client.from('invoice_items').insert(newItem);
        if (!error) count++;
      }
      importedCounts.invoice_items = count;
    }
  }
}
