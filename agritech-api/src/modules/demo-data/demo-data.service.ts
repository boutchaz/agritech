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
      this.logger.log(`✅ Created demo tasks`);

      // 6. Seed Customers/Suppliers
      const customers = await this.createDemoParties(organizationId, userId);
      this.logger.log(`✅ Created demo customers/suppliers`);

      // 7. Seed Sales Orders
      const salesOrders = await this.createDemoSalesOrders(organizationId, customers, userId);
      this.logger.log(`✅ Created ${salesOrders.length} demo sales orders`);

      // 8. Seed Invoices
      await this.createDemoInvoices(organizationId, parcels, customers, userId);
      this.logger.log(`✅ Created demo invoices`);

      // 9. Seed Harvest Records (linked to harvest tasks)
      await this.createDemoHarvests(organizationId, farm.id, parcels, workers, tasks, userId);
      this.logger.log(`✅ Created demo harvest records`);

      // 10. Seed Sample Costs/Revenues
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
  private async createDemoParcels(organizationId: string, farmId: string) {
    const client = this.databaseService.getAdminClient();

    const parcels = [
      {
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
        is_active: true,
      },
      {
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
        is_active: true,
      },
      {
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
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

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
  private async createDemoParties(organizationId: string, userId: string) {
    const client = this.databaseService.getAdminClient();

    const customers = [
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
    ];

    const { data: createdCustomers, error } = await client
      .from('customers')
      .insert(customers)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo customers: ${error.message}`);
      throw error;
    }

    // Also create a supplier
    const suppliers = [
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
    ];

    await client.from('suppliers').insert(suppliers);

    return createdCustomers || [];
  }

  /**
   * Create demo sales orders
   */
  private async createDemoSalesOrders(
    organizationId: string,
    customers: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const salesOrders = [
      {
        organization_id: organizationId,
        order_number: 'SO-2024-001',
        order_date: lastMonth.toISOString().split('T')[0],
        customer_id: customers[0].id,
        customer_name: customers[0].customer_name,
        status: 'delivered',
        subtotal: 15000,
        tax_amount: 2700,
        total_amount: 17700,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: 'SO-2024-002',
        order_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        customer_id: customers[1].id,
        customer_name: customers[1].customer_name,
        status: 'confirmed',
        subtotal: 8500,
        tax_amount: 1530,
        total_amount: 10030,
        created_by: userId,
      },
    ];

    const { data: createdOrders, error } = await client
      .from('sales_orders')
      .insert(salesOrders)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo sales orders: ${error.message}`);
      // Don't throw - sales orders are optional
      return [];
    }

    // Create sales order items for each order
    if (createdOrders && createdOrders.length > 0) {
      const orderItems = [
        {
          sales_order_id: createdOrders[0].id,
          line_number: 1,
          item_name: 'Huile d\'Olive Extra Vierge',
          description: 'Huile d\'olive de qualité supérieure',
          quantity: 500,
          unit_of_measure: 'kg',
          unit_price: 30,
          amount: 15000,
          tax_rate: 18,
          tax_amount: 2700,
          line_total: 17700,
        },
        {
          sales_order_id: createdOrders[1].id,
          line_number: 1,
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
      ];

      await client.from('sales_order_items').insert(orderItems);
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

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

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
        created_by: userId,
      },
    ];

    const { error } = await client.from('harvest_records').insert(harvests);

    if (error) {
      this.logger.error(`Failed to create demo harvests: ${error.message}`);
      // Don't throw - harvests are optional
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
}
