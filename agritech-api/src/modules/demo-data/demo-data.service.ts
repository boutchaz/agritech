import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class DemoDataService {
  private readonly logger = new Logger(DemoDataService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Seed demo data for a new organization
   * Creates minimal but representative data across key modules
   */
  async seedDemoData(organizationId: string, userId: string): Promise<void> {
    this.logger.log(
      `Starting demo data seeding for organization ${organizationId}`,
    );

    try {
      // Clear existing data first to avoid conflicts on re-seeding
      this.logger.log("Clearing existing data before seeding...");
      await this.clearDemoData(organizationId);
      this.logger.log("✅ Existing data cleared");

      // 1. Seed Farm
      const farm = await this.createDemoFarm(organizationId, userId);
      this.logger.log(`✅ Created demo farm: ${farm.name}`);

      // 2. Seed Parcels (linked to farm)
      const parcels = await this.createDemoParcels(organizationId, farm.id);
      this.logger.log(`✅ Created ${parcels.length} demo parcels`);

      // 3. Seed Workers
      const workers = await this.createDemoWorkers(
        organizationId,
        farm.id,
        userId,
      );
      this.logger.log(`✅ Created ${workers.length} demo workers`);

      // 4. Seed Cost Centers (one per parcel)
      await this.createDemoCostCenters(organizationId, parcels);
      this.logger.log(`✅ Created demo cost centers`);

      // 4b. Seed Chart of Accounts (needed before journal entries)
      const accounts = await this.createDemoChartOfAccounts(
        organizationId,
        userId,
      );
      this.logger.log(`✅ Created ${accounts.length} demo accounts`);

      // 5. Seed Tasks (linked to parcels and workers) - returns tasks including harvest task
      const tasks = await this.createDemoTasks(
        organizationId,
        farm.id,
        parcels,
        workers,
        userId,
      );
      this.logger.log(`✅ Created ${tasks.length} demo tasks`);

      // 6. Seed Infrastructure (structures)
      await this.createDemoStructures(organizationId, farm.id, userId);
      this.logger.log(`✅ Created demo infrastructure`);

      // 7. Seed Warehouses and Items
      const { warehouse, finishedGoodsWarehouse, items } =
        await this.createDemoItems(organizationId, farm.id, userId);
      this.logger.log(`✅ Created demo items and warehouses`);

      // 7b. Seed Stock Entries (inputs + harvest outputs)
      await this.createDemoStockEntries(
        organizationId,
        warehouse,
        finishedGoodsWarehouse,
        items,
        userId,
      );
      this.logger.log(`✅ Created demo stock entries`);

      // 8. Seed Customers/Suppliers
      const { customers, suppliers } = await this.createDemoParties(
        organizationId,
        userId,
      );
      this.logger.log(`✅ Created demo customers/suppliers`);

      // 9. Seed Quotes
      const quotes = await this.createDemoQuotes(
        organizationId,
        customers,
        items,
        userId,
      );
      this.logger.log(`✅ Created ${quotes.length} demo quotes`);

      // 10. Seed Sales Orders
      const salesOrders = await this.createDemoSalesOrders(
        organizationId,
        customers,
        items,
        userId,
      );
      this.logger.log(`✅ Created ${salesOrders.length} demo sales orders`);

      // 10b. Link accepted quote to its sales order
      await this.linkQuotesToSalesOrders(organizationId, quotes, salesOrders);
      this.logger.log(`✅ Linked quotes to sales orders`);

      // 11. Seed Purchase Orders
      const purchaseOrders = await this.createDemoPurchaseOrders(
        organizationId,
        suppliers,
        items,
        userId,
      );
      this.logger.log(
        `✅ Created ${purchaseOrders.length} demo purchase orders`,
      );

      // 12. Seed Invoices (linked to items and orders)
      const invoices = await this.createDemoInvoices(
        organizationId,
        parcels,
        customers,
        suppliers,
        items,
        salesOrders,
        purchaseOrders,
        userId,
      );
      this.logger.log(`✅ Created ${invoices.length} demo invoices`);

      // 12b. Seed Bank Accounts (needed before payments)
      const bankAccounts = await this.createDemoBankAccounts(
        organizationId,
        userId,
      );
      this.logger.log(`✅ Created ${bankAccounts.length} demo bank accounts`);

      // 13. Seed Payments (linked to bank accounts)
      const payments = await this.createDemoPayments(
        organizationId,
        customers,
        suppliers,
        invoices,
        bankAccounts,
        userId,
      );
      this.logger.log(`✅ Created ${payments.length} demo payments`);

      // 14. Seed Journal Entries
      const journalEntries = await this.createDemoJournalEntries(
        organizationId,
        parcels,
        userId,
      );
      this.logger.log(
        `✅ Created ${journalEntries.length} demo journal entries`,
      );

      // 15. Seed Harvest Records (linked to harvest tasks)
      const harvests = await this.createDemoHarvests(
        organizationId,
        farm.id,
        parcels,
        workers,
        tasks,
        userId,
      );
      this.logger.log(`✅ Created ${harvests.length} demo harvest records`);

      // 12. Seed Reception Batches with Quality Control
      await this.createDemoReceptionBatches(
        organizationId,
        farm.id,
        parcels,
        workers,
        harvests,
        userId,
      );
      this.logger.log(`✅ Created demo reception batches`);

      // 13. Seed Sample Costs/Revenues (linked to farm and harvests)
      await this.createDemoFinancialData(
        organizationId,
        farm.id,
        parcels,
        harvests,
        userId,
      );
      this.logger.log(`✅ Created demo financial data`);

      // 16. Seed Utilities (fixed costs: electricity, water, diesel, etc.)
      const utilities = await this.createDemoUtilities(
        organizationId,
        farm.id,
        parcels,
      );
      this.logger.log(`✅ Created ${utilities.length} demo utilities`);

      // 17. Bank Accounts already created in step 12b

      // 18. Seed Fiscal Years and Periods
      await this.createDemoFiscalYears(organizationId, userId);
      this.logger.log(`✅ Created demo fiscal years and periods`);

      // 19. Seed Taxes
      const taxes = await this.createDemoTaxes(organizationId, userId);
      this.logger.log(`✅ Created ${taxes.length} demo taxes`);

      // 20. Seed Task Assignments
      await this.createDemoTaskAssignments(organizationId, tasks, workers);
      this.logger.log(`✅ Created demo task assignments`);

      // 21. Seed Deliveries (linked to harvests)
      await this.createDemoDeliveries(
        organizationId,
        farm.id,
        customers,
        workers,
        harvests,
        userId,
      );
      this.logger.log(`✅ Created demo deliveries`);

      // 22. Seed Product Applications (linked to items and tasks)
      const applications = await this.createDemoProductApplications(
        organizationId,
        farm.id,
        parcels,
        items,
        tasks,
        userId,
      );
      this.logger.log(
        `✅ Created ${applications.length} demo product applications`,
      );

      // 23. Seed Soil Analyses
      const soilAnalyses = await this.createDemoSoilAnalyses(
        organizationId,
        parcels,
        userId,
      );
      this.logger.log(`✅ Created ${soilAnalyses.length} demo soil analyses`);

      // 24. Seed Work Records
      const workRecords = await this.createDemoWorkRecords(
        organizationId,
        farm.id,
        workers,
        tasks,
        userId,
      );
      this.logger.log(`✅ Created ${workRecords.length} demo work records`);

      // 25. Seed Agricultural Campaigns
      const campaigns = await this.createDemoCampaigns(
        organizationId,
        farm.id,
        parcels,
        userId,
      );
      this.logger.log(`✅ Created ${campaigns.length} demo campaigns`);

      // 26. Seed Biological Assets (Trees)
      await this.createDemoBiologicalAssets(
        organizationId,
        farm.id,
        parcels,
        userId,
      );
      this.logger.log(`✅ Created demo biological assets`);

      // 27. Seed Notifications
      await this.createDemoNotifications(organizationId, userId);
      this.logger.log(`✅ Created demo notifications`);

      // 28. Seed Analyses (soil, plant, water)
      const analyses = await this.createDemoAnalyses(organizationId, parcels);
      this.logger.log(`✅ Created ${analyses.length} demo analyses`);

      // 29. Seed Analysis Recommendations
      const analysisRecommendations =
        await this.createDemoAnalysisRecommendations(analyses);
      this.logger.log(
        `✅ Created ${analysisRecommendations.length} demo analysis recommendations`,
      );

      // 30. Seed Certifications
      const certifications = await this.createDemoCertifications(
        organizationId,
        userId,
      );
      this.logger.log(
        `✅ Created ${certifications.length} demo certifications`,
      );

      // 31. Seed Compliance Checks (linked to certifications)
      const complianceChecks = await this.createDemoComplianceChecks(
        organizationId,
        certifications,
        userId,
      );
      this.logger.log(
        `✅ Created ${complianceChecks.length} demo compliance checks`,
      );

      // 32. Seed Crop Cycles (linked to campaigns)
      const cropCycles = await this.createDemoCropCycles(
        organizationId,
        farm.id,
        parcels,
        campaigns,
        userId,
      );
      this.logger.log(`✅ Created ${cropCycles.length} demo crop cycles`);

      // 33. Seed Quality Inspections (linked to farm, parcels, crop cycles)
      await this.createDemoQualityInspections(
        organizationId,
        farm.id,
        parcels,
        cropCycles,
        userId,
      );
      this.logger.log(`✅ Created demo quality inspections`);

      // 34. Seed Task Categories and Time Logs
      await this.createDemoTaskExtras(
        organizationId,
        tasks,
        workers,
      );
      this.logger.log(`✅ Created demo task categories and time logs`);

      // 35. Seed Worker Payment Records
      await this.createDemoPaymentRecords(
        organizationId,
        farm.id,
        workers,
        userId,
      );
      this.logger.log(`✅ Created demo payment records`);

      // 36. Seed Harvest Forecasts
      await this.createDemoHarvestForecasts(
        organizationId,
        farm.id,
        parcels,
        userId,
      );
      this.logger.log(`✅ Created demo harvest forecasts`);

      // 37. Seed Cost Center Budgets
      await this.createDemoCostCenterBudgets(organizationId);
      this.logger.log(`✅ Created demo cost center budgets`);

      this.logger.log(
        `✅ Demo data seeding completed successfully for organization ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error seeding demo data: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow organization creation to succeed even if demo data fails
    }
  }

  /**
   * Create demo farm
   */
  private async createDemoFarm(organizationId: string, userId: string) {
    const client = this.databaseService.getAdminClient();

    const { data: farm, error } = await client
      .from("farms")
      .insert({
        organization_id: organizationId,
        name: "Ferme Démo - Domaine Agricole",
        location: "Berkane, Maroc",
        city: "Berkane",
        state: "Oriental",
        country: "Maroc",
        size: 25,
        size_unit: "hectare",
        description:
          "Ferme de démonstration pour explorer les fonctionnalités de la plateforme",
        manager_name: "Gestionnaire Démo",
        manager_email: "demo@example.com",
        status: "active",
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
  private async createDemoParcels(
    organizationId: string,
    farmId: string,
  ): Promise<any[]> {
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
        name: "Parcelle Olives",
        description: "Parcelle principale d'oliviers",
        area: 10,
        area_unit: "hectares",
        crop_type: "Olives",
        crop_category: "fruit_trees",
        variety: "Picholine",
        planting_year: 2020,
        planting_date: "2020-03-15",
        soil_type: "Argileux",
        irrigation_type: "Goutte à goutte",
        boundary: olivesBoundary,
        calculated_area: 10,
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: "Parcelle Agrumes",
        description: "Parcelle d'agrumes variés",
        area: 8,
        area_unit: "hectares",
        crop_type: "Agrumes",
        crop_category: "fruit_trees",
        variety: "Clémentine",
        planting_year: 2021,
        planting_date: "2021-04-10",
        soil_type: "Sableux",
        irrigation_type: "Aspersion",
        boundary: agrumesBoundary,
        calculated_area: 8,
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: "Parcelle Légumes",
        description: "Parcelle de légumes de saison",
        area: 7,
        area_unit: "hectares",
        crop_type: "Tomates",
        crop_category: "vegetables",
        variety: "Marmande",
        planting_year: 2023,
        planting_date: "2023-05-01",
        soil_type: "Limoneux",
        irrigation_type: "Goutte à goutte",
        boundary: legumesBoundary,
        calculated_area: 7,
        is_active: true,
      },
    ];

    const { data: createdParcels, error } = await client
      .from("parcels")
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
  private async createDemoWorkers(
    organizationId: string,
    farmId: string,
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const workers = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        first_name: "Ahmed",
        last_name: "Benali",
        worker_type: "fixed_salary",
        position: "Gestionnaire de Ferme",
        hire_date: "2022-01-15",
        is_cnss_declared: true,
        monthly_salary: 8000,
        payment_method: "bank_transfer",
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        first_name: "Fatima",
        last_name: "Alami",
        worker_type: "daily_worker",
        position: "Ouvrière Agricole",
        hire_date: "2023-03-01",
        is_cnss_declared: false,
        daily_rate: 150,
        payment_method: "cash",
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        first_name: "Mohamed",
        last_name: "Tazi",
        worker_type: "daily_worker",
        position: "Spécialiste Récolte",
        hire_date: "2023-06-01",
        is_cnss_declared: false,
        daily_rate: 180,
        payment_method: "cash",
        specialties: ["harvesting", "pruning"],
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdWorkers, error } = await client
      .from("workers")
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
      code: `CC-${String(index + 1).padStart(3, "0")}`,
      name: `Centre de Coût - ${parcel.name}`,
      description: `Centre de coût pour ${parcel.name}`,
      parcel_id: parcel.id,
      is_active: true,
    }));

    const { error } = await client.from("cost_centers").insert(costCenters);

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
        title: "Irrigation Parcelle Olives",
        description: "Irrigation complète de la parcelle d'oliviers",
        task_type: "irrigation",
        priority: "high",
        status: "completed",
        assigned_to: workers[0].id,
        scheduled_start: twoDaysAgo.toISOString(),
        actual_start: twoDaysAgo.toISOString(),
        actual_end: new Date(
          twoDaysAgo.getTime() + 4 * 60 * 60 * 1000,
        ).toISOString(),
        completed_date: twoDaysAgo.toISOString().split("T")[0],
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
        title: "Taille des arbres fruitiers",
        description: "Taille de formation et d'entretien des agrumes",
        task_type: "pruning",
        priority: "medium",
        status: "in_progress",
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
        title: "Récolte Agrumes",
        description: "Récolte de la parcelle d'agrumes",
        task_type: "harvesting",
        priority: "high",
        status: "completed",
        assigned_to: workers[2].id,
        scheduled_start: lastMonth.toISOString(),
        actual_start: lastMonth.toISOString(),
        actual_end: new Date(
          lastMonth.getTime() + 8 * 60 * 60 * 1000,
        ).toISOString(),
        completed_date: lastMonth.toISOString().split("T")[0],
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
        title: "Plantation Tomates",
        description: "Plantation de nouvelles variétés de tomates",
        task_type: "planting",
        priority: "medium",
        status: "assigned",
        assigned_to: workers[1].id,
        scheduled_start: new Date(
          now.getTime() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        estimated_duration: 6,
        weather_dependency: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        title: "Fertilisation Organique",
        description:
          "Application d'engrais organique sur la parcelle d'oliviers",
        task_type: "fertilization",
        priority: "medium",
        status: "pending",
        scheduled_start: new Date(
          now.getTime() + 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        estimated_duration: 3,
        weather_dependency: false,
        created_by: userId,
      },
      // Additional tasks
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        title: "Traitement Phytosanitaire",
        description: "Traitement préventif contre les maladies des oliviers",
        task_type: "pest_control",
        priority: "high",
        status: "completed",
        assigned_to: workers[0].id,
        scheduled_start: lastWeek.toISOString(),
        actual_start: lastWeek.toISOString(),
        actual_end: new Date(
          lastWeek.getTime() + 3 * 60 * 60 * 1000,
        ).toISOString(),
        completed_date: lastWeek.toISOString().split("T")[0],
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
        title: "Irrigation Complémentaire",
        description: "Irrigation d'appoint pour les agrumes",
        task_type: "irrigation",
        priority: "medium",
        status: "in_progress",
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
        title: "Désherbage Manuel",
        description: "Désherbage manuel de la parcelle de légumes",
        task_type: "maintenance",
        priority: "low",
        status: "assigned",
        assigned_to: workers[1].id,
        scheduled_start: new Date(
          now.getTime() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        estimated_duration: 4,
        weather_dependency: false,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        title: "Récolte Olives",
        description: "Récolte annuelle des olives",
        task_type: "harvesting",
        priority: "high",
        status: "pending",
        assigned_to: workers[2].id,
        scheduled_start: nextMonth.toISOString(),
        due_date: nextMonth.toISOString().split("T")[0],
        estimated_duration: 20,
        weather_dependency: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id,
        title: "Application Engrais NPK",
        description: "Application d'engrais NPK pour les agrumes",
        task_type: "fertilization",
        priority: "medium",
        status: "pending",
        scheduled_start: new Date(
          now.getTime() + 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        estimated_duration: 4,
        weather_dependency: false,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2].id,
        title: "Récolte Tomates",
        description: "Première récolte de tomates de saison",
        task_type: "harvesting",
        priority: "high",
        status: "assigned",
        assigned_to: workers[1].id,
        scheduled_start: new Date(
          now.getTime() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        estimated_duration: 8,
        weather_dependency: true,
        created_by: userId,
      },
    ];

    const { data: createdTasks, error } = await client
      .from("tasks")
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
  private async createDemoParties(
    organizationId: string,
    userId: string,
  ): Promise<{ customers: any[]; suppliers: any[] }> {
    const client = this.databaseService.getAdminClient();

    // Note: DB schema uses 'name' not 'customer_name', and customer_type must be one of: individual, business, government, other
    const customersData = [
      {
        organization_id: organizationId,
        customer_code: "CUST-001",
        name: "Marché Central de Casablanca",
        customer_type: "business",
        email: "contact@marche-casa.ma",
        phone: "+212522123456",
        address: "Boulevard Zerktouni, Casablanca",
        city: "Casablanca",
        country: "Maroc",
        tax_id: "123456789",
        payment_terms: "Net 30",
        credit_limit: 50000,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        customer_code: "CUST-002",
        name: "Coopérative Agricole Berkane",
        customer_type: "business", // Changed from 'cooperative' to valid value
        email: "info@coop-berkane.ma",
        phone: "+212536789012",
        address: "Route de Nador, Berkane",
        city: "Berkane",
        country: "Maroc",
        tax_id: "987654321",
        payment_terms: "Net 15",
        credit_limit: 30000,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        customer_code: "CUST-003",
        name: "Restaurant Le Jardin",
        customer_type: "business",
        email: "commandes@lejardin.ma",
        phone: "+212537456789",
        address: "Avenue Mohammed V, Fès",
        city: "Fès",
        country: "Maroc",
        tax_id: "555666777",
        payment_terms: "Net 15",
        credit_limit: 20000,
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdCustomers, error } = await client
      .from("customers")
      .insert(customersData)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo customers: ${error.message}`);
      throw error;
    }

    // Create suppliers - Note: DB schema uses 'name' not 'supplier_name'
    const suppliersData = [
      {
        organization_id: organizationId,
        supplier_code: "SUP-001",
        name: "AgriSupply Maroc",
        supplier_type: "wholesaler",
        email: "contact@agrisupply.ma",
        phone: "+212522654321",
        address: "Zone Industrielle, Rabat",
        city: "Rabat",
        country: "Maroc",
        tax_id: "456789123",
        payment_terms: "Net 30",
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        supplier_code: "SUP-002",
        name: "Engrais & Semences du Maroc",
        supplier_type: "manufacturer",
        email: "ventes@esmaroc.ma",
        phone: "+212528987654",
        address: "Parc Industriel, Agadir",
        city: "Agadir",
        country: "Maroc",
        tax_id: "789123456",
        payment_terms: "Net 45",
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdSuppliers, error: supplierError } = await client
      .from("suppliers")
      .insert(suppliersData)
      .select();

    if (supplierError) {
      this.logger.error(
        `Failed to create demo suppliers: ${supplierError.message}`,
      );
      throw supplierError;
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

    // Find output/sales items by item_code
    const oliveOilItem =
      items.find((i) => i.item_code === "REC-HUILE-EV") || items[0];
    const citrusItem =
      items.find((i) => i.item_code === "REC-CLEM-BIO") || items[1];

    const quotes = [
      {
        organization_id: organizationId,
        quote_number: "DEV-2024-001",
        quote_date: lastWeek.toISOString().split("T")[0],
        valid_until: nextMonth.toISOString().split("T")[0],
        customer_id: customers[0]?.id,
        customer_name: customers[0]?.name || "Client Demo",
        status: "submitted",
        subtotal: 25000,
        tax_total: 4500,
        grand_total: 29500,
        payment_terms: "Net 30",
        delivery_terms: "Livraison sur site",
        notes: "Devis pour commande régulière mensuelle",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        quote_number: "DEV-2024-002",
        quote_date: twoWeeksAgo.toISOString().split("T")[0],
        valid_until: inTwoWeeks.toISOString().split("T")[0],
        customer_id: customers[1]?.id,
        customer_name: customers[1]?.name || "Client Demo 2",
        status: "accepted",
        subtotal: 12000,
        tax_total: 2160,
        grand_total: 14160,
        payment_terms: "Net 15",
        delivery_terms: "Retrait en ferme",
        notes: "Devis accepté - convertir en commande",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        quote_number: "DEV-2024-003",
        quote_date: now.toISOString().split("T")[0],
        valid_until: nextMonth.toISOString().split("T")[0],
        customer_id: customers[2]?.id || customers[0]?.id,
        customer_name:
          customers[2]?.name || customers[0]?.name || "Client Demo",
        status: "draft",
        subtotal: 8500,
        tax_total: 1530,
        grand_total: 10030,
        payment_terms: "Net 15",
        delivery_terms: "Livraison express",
        notes: "En attente de confirmation des quantités",
        created_by: userId,
      },
    ];

    const { data: createdQuotes, error } = await client
      .from("quotes")
      .insert(quotes)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo quotes: ${error.message}`);
      return [];
    }

    // Create quote items
    if (createdQuotes && createdQuotes.length > 0) {
      // Also find orange item for quotes
      const orangeItemForQuote =
        items.find((i) => i.item_code === "REC-ORA-NAV") || items[2];

      const quoteItems = [
        // Quote 1 items - Olive Oil + Clementines
        {
          quote_id: createdQuotes[0].id,
          line_number: 1,
          item_id: oliveOilItem?.id,
          item_name: oliveOilItem?.item_name || "Huile d'Olive Extra Vierge",
          description: "Huile d'olive pressée à froid, qualité premium",
          quantity: 500,
          unit_of_measure: "L",
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
          item_name: citrusItem?.item_name || "Clémentines Bio",
          description: "Clémentines de saison, agriculture biologique",
          quantity: 200,
          unit_of_measure: "kg",
          unit_price: 25,
          discount_percent: 0,
          tax_rate: 18,
          amount: 5000,
          tax_amount: 900,
          line_total: 5900,
        },
        // Quote 2 items - Olive Oil
        {
          quote_id: createdQuotes[1].id,
          line_number: 1,
          item_id: oliveOilItem?.id,
          item_name: oliveOilItem?.item_name || "Huile d'Olive Extra Vierge",
          description: "Huile d'olive pressée à froid",
          quantity: 300,
          unit_of_measure: "L",
          unit_price: 40,
          discount_percent: 0,
          tax_rate: 18,
          amount: 12000,
          tax_amount: 2160,
          line_total: 14160,
        },
        // Quote 3 items - Oranges
        {
          quote_id: createdQuotes[2].id,
          line_number: 1,
          item_id: orangeItemForQuote?.id,
          item_name: orangeItemForQuote?.item_name || "Oranges Navel",
          description: "Oranges fraîches pour jus",
          quantity: 500,
          unit_of_measure: "kg",
          unit_price: 17,
          discount_percent: 0,
          tax_rate: 18,
          amount: 8500,
          tax_amount: 1530,
          line_total: 10030,
        },
      ];

      await client.from("quote_items").insert(quoteItems);
    }

    return createdQuotes || [];
  }

  private async linkQuotesToSalesOrders(
    organizationId: string,
    quotes: any[],
    salesOrders: any[],
  ) {
    const client = this.databaseService.getAdminClient();

    const acceptedQuote = quotes.find((q) => q.quote_number === 'DEV-2024-002');
    const matchingSO = salesOrders.find((so) => so.order_number === 'SO-2024-002');

    if (!acceptedQuote || !matchingSO) {
      this.logger.warn('Could not link quote to sales order: missing entities');
      return;
    }

    const { error } = await client
      .from('quotes')
      .update({
        sales_order_id: matchingSO.id,
        status: 'converted',
        converted_at: new Date().toISOString(),
      })
      .eq('id', acceptedQuote.id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to link quote to sales order: ${error.message}`);
    }
  }

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

    // Find output/sales items by item_code
    const oliveOilItem =
      items.find((i) => i.item_code === "REC-HUILE-EV") || items[0];
    const citrusItem =
      items.find((i) => i.item_code === "REC-CLEM-BIO") || items[1];
    const orangeItem =
      items.find((i) => i.item_code === "REC-ORA-NAV") || items[2];

    const salesOrders = [
      {
        organization_id: organizationId,
        order_number: "SO-2024-001",
        order_date: lastMonth.toISOString().split("T")[0],
        expected_delivery_date: new Date(
          lastMonth.getTime() + 7 * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split("T")[0],
        customer_id: customers[0]?.id,
        customer_name: customers[0]?.name || "Client Demo",
        customer_address: customers[0]?.address,
        status: "delivered",
        subtotal: 15000,
        tax_amount: 2700,
        total_amount: 17700,
        stock_issued: true,
        notes: "Commande livrée avec succès",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: "SO-2024-002",
        order_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        expected_delivery_date: nextWeek.toISOString().split("T")[0],
        customer_id: customers[1]?.id,
        customer_name: customers[1]?.name || "Client Demo 2",
        customer_address: customers[1]?.address,
        status: "confirmed",
        subtotal: 12000,
        tax_amount: 2160,
        total_amount: 14160,
        stock_issued: false,
        notes: "Converti depuis devis DEV-2024-002",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: "SO-2024-003",
        order_date: now.toISOString().split("T")[0],
        expected_delivery_date: inTwoWeeks.toISOString().split("T")[0],
        customer_id: customers[2]?.id || customers[0]?.id,
        customer_name:
          customers[2]?.name || customers[0]?.name || "Client Demo",
        customer_address: customers[2]?.address || customers[0]?.address,
        status: "draft",
        subtotal: 20000,
        tax_amount: 3600,
        total_amount: 23600,
        stock_issued: false,
        notes: "Nouvelle commande en attente de validation",
        created_by: userId,
      },
    ];

    const { data: createdOrders, error } = await client
      .from("sales_orders")
      .insert(salesOrders)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo sales orders: ${error.message}`);
      return [];
    }

    // Create sales order items for each order
    if (createdOrders && createdOrders.length > 0) {
      const orderItems = [
        // SO-2024-001: Olive Oil 500L @ 30 → matches FAC-2024-001
        {
          sales_order_id: createdOrders[0].id,
          line_number: 1,
          item_id: oliveOilItem?.id,
          item_name: oliveOilItem?.item_name || "Huile d'Olive Extra Vierge",
          description: "Huile d'olive pressée à froid, qualité premium",
          quantity: 500,
          unit_of_measure: "L",
          unit_price: 30,
          amount: 15000,
          tax_rate: 18,
          tax_amount: 2700,
          line_total: 17700,
        },
        // SO-2024-002: Olive Oil 300L @ 40 → converted from DEV-2024-002
        {
          sales_order_id: createdOrders[1].id,
          line_number: 1,
          item_id: oliveOilItem?.id,
          item_name: oliveOilItem?.item_name || "Huile d'Olive Extra Vierge",
          description: "Huile d'olive pressée à froid",
          quantity: 300,
          unit_of_measure: "L",
          unit_price: 40,
          amount: 12000,
          tax_rate: 18,
          tax_amount: 2160,
          line_total: 14160,
        },
        // SO-2024-003: Olive Oil 400L @ 40 + Oranges 200kg @ 20
        {
          sales_order_id: createdOrders[2].id,
          line_number: 1,
          item_id: oliveOilItem?.id,
          item_name: oliveOilItem?.item_name || "Huile d'Olive Extra Vierge",
          description: "Grande commande huile olive",
          quantity: 400,
          unit_of_measure: "L",
          unit_price: 40,
          amount: 16000,
          tax_rate: 18,
          tax_amount: 2880,
          line_total: 18880,
        },
        {
          sales_order_id: createdOrders[2].id,
          line_number: 2,
          item_id: orangeItem?.id,
          item_name: orangeItem?.item_name || "Oranges Navel",
          description: "Oranges fraîches pour jus",
          quantity: 200,
          unit_of_measure: "kg",
          unit_price: 20,
          amount: 4000,
          tax_rate: 18,
          tax_amount: 720,
          line_total: 4720,
        },
      ];

      await client.from("sales_order_items").insert(orderItems);
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

    // Find input items by item_code
    const fertilizerItem =
      items.find((i) => i.item_code === "ENG-NPK-15-15-15") || items[0];
    const seedItem =
      items.find((i) => i.item_code === "SEM-TOM-MARM") || items[1];

    const purchaseOrders = [
      {
        organization_id: organizationId,
        order_number: "PO-2024-001",
        order_date: lastMonth.toISOString().split("T")[0],
        expected_delivery_date: new Date(
          lastMonth.getTime() + 14 * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split("T")[0],
        supplier_id: suppliers[0]?.id,
        supplier_name: suppliers[0]?.name || "Fournisseur Demo",
        supplier_contact: suppliers[0]?.email,
        status: "received",
        subtotal: 12500,
        tax_amount: 2250,
        total_amount: 14750,
        stock_received: true,
        stock_received_date: new Date(
          lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split("T")[0],
        notes: "Commande reçue et contrôlée",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: "PO-2024-002",
        order_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        expected_delivery_date: nextWeek.toISOString().split("T")[0],
        supplier_id: suppliers[1]?.id || suppliers[0]?.id,
        supplier_name:
          suppliers[1]?.name || suppliers[0]?.name || "Fournisseur Demo",
        supplier_contact: suppliers[1]?.email || suppliers[0]?.email,
        status: "confirmed",
        subtotal: 8000,
        tax_amount: 1440,
        total_amount: 9440,
        stock_received: false,
        notes: "En cours de livraison",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: "PO-2024-003",
        order_date: now.toISOString().split("T")[0],
        expected_delivery_date: inThreeWeeks.toISOString().split("T")[0],
        supplier_id: suppliers[0]?.id,
        supplier_name: suppliers[0]?.name || "Fournisseur Demo",
        supplier_contact: suppliers[0]?.email,
        status: "draft",
        subtotal: 15000,
        tax_amount: 2700,
        total_amount: 17700,
        stock_received: false,
        notes: "Commande en préparation pour la saison",
        created_by: userId,
      },
    ];

    const { data: createdOrders, error } = await client
      .from("purchase_orders")
      .insert(purchaseOrders)
      .select();

    if (error) {
      this.logger.error(
        `Failed to create demo purchase orders: ${error.message}`,
      );
      return [];
    }

    // Create purchase order items linked to actual inventory items
    if (createdOrders && createdOrders.length > 0) {
      const orderItems = [
        // PO-2024-001: Fertilizer 500kg @ 25 → matches FACF-2024-001 and SE-2024-001
        {
          purchase_order_id: createdOrders[0].id,
          line_number: 1,
          inventory_item_id: fertilizerItem?.id,
          item_name: fertilizerItem?.item_name || "Engrais NPK 15-15-15",
          description: "Engrais complet NPK pour arbres fruitiers",
          quantity: 500,
          unit_of_measure: "kg",
          unit_price: 25,
          amount: 12500,
          tax_rate: 18,
          tax_amount: 2250,
          line_total: 14750,
        },
        // PO-2024-002: Seeds 50kg @ 120 + Fertilizer 100kg @ 20 → matches FACF-2024-002 and SE-2024-002
        {
          purchase_order_id: createdOrders[1].id,
          line_number: 1,
          inventory_item_id: seedItem?.id,
          item_name: seedItem?.item_name || "Semences Tomates Marmande",
          description: "Semences certifiées biologiques",
          quantity: 50,
          unit_of_measure: "kg",
          unit_price: 120,
          amount: 6000,
          tax_rate: 18,
          tax_amount: 1080,
          line_total: 7080,
        },
        {
          purchase_order_id: createdOrders[1].id,
          line_number: 2,
          inventory_item_id: fertilizerItem?.id,
          item_name: "Compost Organique",
          description: "Compost naturel enrichi",
          quantity: 100,
          unit_of_measure: "kg",
          unit_price: 20,
          amount: 2000,
          tax_rate: 18,
          tax_amount: 360,
          line_total: 2360,
        },
        // PO-2024-003: Fertilizer 300kg @ 30 + Plants 50 @ 120
        {
          purchase_order_id: createdOrders[2].id,
          line_number: 1,
          inventory_item_id: fertilizerItem?.id,
          item_name: "Engrais Phosphaté",
          description: "Engrais riche en phosphore pour fruitiers",
          quantity: 300,
          unit_of_measure: "kg",
          unit_price: 30,
          amount: 9000,
          tax_rate: 18,
          tax_amount: 1620,
          line_total: 10620,
        },
        {
          purchase_order_id: createdOrders[2].id,
          line_number: 2,
          inventory_item_id: seedItem?.id,
          item_name: "Plants d'Olivier",
          description: "Jeunes plants d'olivier certifiés",
          quantity: 50,
          unit_of_measure: "unité",
          unit_price: 120,
          amount: 6000,
          tax_rate: 18,
          tax_amount: 1080,
          line_total: 7080,
        },
      ];

      await client.from("purchase_order_items").insert(orderItems);
    }

    return createdOrders || [];
  }

  /**
   * Create demo invoices (sales and purchase)
   */
  private async createDemoInvoices(
    organizationId: string,
    parcels: any[],
    customers: any[],
    suppliers: any[],
    items: any[],
    salesOrders: any[],
    purchaseOrders: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 15);
    const dueDateNextMonth = new Date(now);
    dueDateNextMonth.setMonth(dueDateNextMonth.getMonth() + 1);

    // Find output items (sales items) - indices 8, 9, 10 (Olive Oil, Clementines, Oranges)
    const oliveOilItem = items.find(
      (i) => i.item_code === "REC-HUILE-EV",
    );
    const clementineItem = items.find(
      (i) => i.item_code === "REC-CLEM-BIO",
    );
    const orangeItem = items.find(
      (i) => i.item_code === "REC-ORA-NAV",
    );

    // Find input items (purchase items)
    const fertilizerItem = items.find(
      (i) => i.item_code === "ENG-NPK-15-15-15",
    );
    const seedItem = items.find(
      (i) => i.item_code === "SEM-TOM-MARM",
    );

    // Match invoices to existing orders
    const deliveredSO = salesOrders.find(
      (o) => o.order_number === "SO-2024-001",
    );
    const confirmedSO = salesOrders.find(
      (o) => o.order_number === "SO-2024-002",
    );
    const receivedPO = purchaseOrders.find(
      (o) => o.order_number === "PO-2024-001",
    );
    const confirmedPO = purchaseOrders.find(
      (o) => o.order_number === "PO-2024-002",
    );

    const invoices = [
      // === Sales Invoices ===
      // FAC-001: Matches SO-2024-001 (delivered) - Olive Oil 500L @ 30
      {
        organization_id: organizationId,
        invoice_number: "FAC-2024-001",
        invoice_date: lastMonth.toISOString().split("T")[0],
        invoice_type: "sales",
        party_id: customers[0]?.id,
        party_name: customers[0]?.name || "Client Demo",
        party_type: "customer",
        subtotal: 15000,
        tax_total: 2700,
        grand_total: 17700,
        paid_amount: 17700,
        outstanding_amount: 0,
        currency_code: "MAD",
        status: "paid",
        due_date: lastMonth.toISOString().split("T")[0],
        sales_order_id: deliveredSO?.id || null,
        notes: "Facture payée - Vente huile olive (SO-2024-001)",
        created_by: userId,
      },
      // FAC-002: Matches SO-2024-002 (confirmed) - Olive Oil 300L @ 40 (from DEV-2024-002)
      {
        organization_id: organizationId,
        invoice_number: "FAC-2024-002",
        invoice_date: twoWeeksAgo.toISOString().split("T")[0],
        invoice_type: "sales",
        party_id: customers[1]?.id || customers[0]?.id,
        party_name:
          customers[1]?.name || customers[0]?.name || "Client Demo",
        party_type: "customer",
        subtotal: 12000,
        tax_total: 2160,
        grand_total: 14160,
        paid_amount: 5000,
        outstanding_amount: 9160,
        currency_code: "MAD",
        status: "submitted",
        due_date: dueDate.toISOString().split("T")[0],
        sales_order_id: confirmedSO?.id || null,
        notes: "Facture partiellement payée - Huile olive (SO-2024-002 / DEV-2024-002)",
        created_by: userId,
      },
      // FAC-003: Olive Oil 300L @ 40 (new order, no SO link)
      {
        organization_id: organizationId,
        invoice_number: "FAC-2024-003",
        invoice_date: now.toISOString().split("T")[0],
        invoice_type: "sales",
        party_id: customers[1]?.id,
        party_name: customers[1]?.name || "Client Demo 2",
        party_type: "customer",
        subtotal: 12000,
        tax_total: 2160,
        grand_total: 14160,
        paid_amount: 0,
        outstanding_amount: 14160,
        currency_code: "MAD",
        status: "submitted",
        due_date: dueDateNextMonth.toISOString().split("T")[0],
        notes: "Facture en attente de paiement - Huile olive premium",
        created_by: userId,
      },
      // FAC-004: Oranges 250kg @ 26 (draft)
      {
        organization_id: organizationId,
        invoice_number: "FAC-2024-004",
        invoice_date: now.toISOString().split("T")[0],
        invoice_type: "sales",
        party_id: customers[2]?.id || customers[0]?.id,
        party_name:
          customers[2]?.name || customers[0]?.name || "Client Demo",
        party_type: "customer",
        subtotal: 6500,
        tax_total: 1170,
        grand_total: 7670,
        paid_amount: 0,
        outstanding_amount: 7670,
        currency_code: "MAD",
        status: "draft",
        notes: "Brouillon de facture - Oranges Navel",
        created_by: userId,
      },
      // === Purchase Invoices ===
      // FACF-001: Matches PO-2024-001 (received) - Fertilizer 500kg @ 25
      {
        organization_id: organizationId,
        invoice_number: "FACF-2024-001",
        invoice_date: lastMonth.toISOString().split("T")[0],
        invoice_type: "purchase",
        party_id: suppliers[0]?.id,
        party_name: suppliers[0]?.name || "Fournisseur Demo",
        party_type: "supplier",
        subtotal: 12500,
        tax_total: 2250,
        grand_total: 14750,
        paid_amount: 14750,
        outstanding_amount: 0,
        currency_code: "MAD",
        status: "paid",
        due_date: lastMonth.toISOString().split("T")[0],
        purchase_order_id: receivedPO?.id || null,
        notes: "Facture fournisseur payée - Engrais NPK (PO-2024-001)",
        created_by: userId,
      },
      // FACF-002: Matches PO-2024-002 (confirmed) - Seeds 50kg @ 160
      {
        organization_id: organizationId,
        invoice_number: "FACF-2024-002",
        invoice_date: twoWeeksAgo.toISOString().split("T")[0],
        invoice_type: "purchase",
        party_id: suppliers[1]?.id || suppliers[0]?.id,
        party_name:
          suppliers[1]?.name || suppliers[0]?.name || "Fournisseur Demo",
        party_type: "supplier",
        subtotal: 8000,
        tax_total: 1440,
        grand_total: 9440,
        paid_amount: 0,
        outstanding_amount: 9440,
        currency_code: "MAD",
        status: "submitted",
        due_date: dueDate.toISOString().split("T")[0],
        purchase_order_id: confirmedPO?.id || null,
        notes: "Facture fournisseur en attente - Semences (PO-2024-002)",
        created_by: userId,
      },
    ];

    const { data: createdInvoices, error } = await client
      .from("invoices")
      .insert(invoices)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo invoices: ${error.message}`);
      return [];
    }

    // Create invoice items linked to actual inventory items
    if (createdInvoices && createdInvoices.length > 0) {
      const invoiceItems = [
        // FAC-2024-001: Olive Oil 500L @ 30 (matches SO-2024-001)
        {
          invoice_id: createdInvoices[0].id,
          line_number: 1,
          item_id: oliveOilItem?.id || null,
          item_name: "Huile d'Olive Extra Vierge",
          description: "Huile olive pressée à froid",
          quantity: 500,
          unit_of_measure: "L",
          unit_price: 30,
          amount: 15000,
          tax_rate: 18,
          tax_amount: 2700,
          line_total: 17700,
        },
        // FAC-2024-002: Olive Oil 300L @ 40 (matches SO-2024-002 / DEV-2024-002)
        {
          invoice_id: createdInvoices[1].id,
          line_number: 1,
          item_id: oliveOilItem?.id || null,
          item_name: "Huile d'Olive Extra Vierge",
          description: "Huile d'olive pressée à froid",
          quantity: 300,
          unit_of_measure: "L",
          unit_price: 40,
          amount: 12000,
          tax_rate: 18,
          tax_amount: 2160,
          line_total: 14160,
        },
        // FAC-2024-003: Olive Oil 300L @ 40
        {
          invoice_id: createdInvoices[2].id,
          line_number: 1,
          item_id: oliveOilItem?.id || null,
          item_name: "Huile d'Olive Extra Vierge",
          description: "Huile olive premium",
          quantity: 300,
          unit_of_measure: "L",
          unit_price: 40,
          amount: 12000,
          tax_rate: 18,
          tax_amount: 2160,
          line_total: 14160,
        },
        // FAC-2024-004: Oranges 250kg @ 26
        {
          invoice_id: createdInvoices[3].id,
          line_number: 1,
          item_id: orangeItem?.id || null,
          item_name: "Oranges Navel",
          description: "Oranges fraîches pour jus",
          quantity: 250,
          unit_of_measure: "kg",
          unit_price: 26,
          amount: 6500,
          tax_rate: 18,
          tax_amount: 1170,
          line_total: 7670,
        },
        // FACF-2024-001: Fertilizer 500kg @ 25 (matches PO-2024-001)
        {
          invoice_id: createdInvoices[4].id,
          line_number: 1,
          item_id: fertilizerItem?.id || null,
          item_name: "Engrais NPK 15-15-15",
          description: "Engrais complet NPK pour arbres fruitiers",
          quantity: 500,
          unit_of_measure: "kg",
          unit_price: 25,
          amount: 12500,
          tax_rate: 18,
          tax_amount: 2250,
          line_total: 14750,
        },
        // FACF-2024-002: Seeds 50kg @ 160 (matches PO-2024-002)
        {
          invoice_id: createdInvoices[5].id,
          line_number: 1,
          item_id: seedItem?.id || null,
          item_name: "Semences Tomates Marmande",
          description: "Semences certifiées biologiques",
          quantity: 50,
          unit_of_measure: "kg",
          unit_price: 160,
          amount: 8000,
          tax_rate: 18,
          tax_amount: 1440,
          line_total: 9440,
        },
      ];

      await client.from("invoice_items").insert(invoiceItems);
    }

    return createdInvoices || [];
  }

  /**
   * Create demo payments
   */
  private async createDemoPayments(
    organizationId: string,
    customers: any[],
    suppliers: any[],
    invoices: any[],
    bankAccounts: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const bankAccountId = bankAccounts?.[0]?.id || null;

    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const fourMonthsAgo = new Date(now);
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const salesInvoices = invoices.filter((i) => i.invoice_type === "sales");
    const purchaseInvoices = invoices.filter(
      (i) => i.invoice_type === "purchase",
    );

    const payments = [
      // PAY-001: Advance payment from customer[0] — no invoice allocation (standalone advance)
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-001",
        payment_type: "receive",
        payment_method: "bank_transfer",
        payment_date: fourMonthsAgo.toISOString().split("T")[0],
        amount: 25000,
        party_id: customers[0]?.id,
        party_name: customers[0]?.name || "Marché Central de Casablanca",
        party_type: "customer",
        reference_number: "VIR-78901",
        currency_code: "MAD",
        status: "submitted",
        remarks: "Acompte commande agrumes - Q1 (non rapproché)",
        created_by: userId,
      },
      // PAY-002: Advance payment from customer[0] — no invoice allocation
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-002",
        payment_type: "receive",
        payment_method: "bank_transfer",
        payment_date: threeMonthsAgo.toISOString().split("T")[0],
        amount: 45000,
        party_id: customers[0]?.id,
        party_name: customers[0]?.name || "Marché Central de Casablanca",
        party_type: "customer",
        reference_number: "VIR-89012",
        currency_code: "MAD",
        status: "submitted",
        remarks: "Acompte huile olive premium - en attente de rapprochement",
        created_by: userId,
      },
      // PAY-003: Payment from customer[1] — no invoice allocation (advance)
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-003",
        payment_type: "receive",
        payment_method: "check",
        payment_date: twoMonthsAgo.toISOString().split("T")[0],
        amount: 18500,
        party_id: customers[1]?.id,
        party_name: customers[1]?.name || "Coopérative Agricole Berkane",
        party_type: "customer",
        reference_number: "CHQ-456789",
        currency_code: "MAD",
        status: "submitted",
        remarks: "Acompte livraison clémentines - en attente de rapprochement",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-004",
        payment_type: "receive",
        payment_method: "bank_transfer",
        payment_date: lastMonth.toISOString().split("T")[0],
        amount: 17700,
        party_id: customers[0]?.id,
        party_name: customers[0]?.name || "Marché Central de Casablanca",
        party_type: "customer",
        reference_number: "VIR-12345",
        currency_code: "MAD",
        status: "reconciled",
        remarks: "Paiement intégral facture FAC-2024-001",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-005",
        payment_type: "receive",
        payment_method: "check",
        payment_date: oneWeekAgo.toISOString().split("T")[0],
        amount: 5000,
        party_id: customers[1]?.id,
        party_name: customers[1]?.name || "Coopérative Agricole Berkane",
        party_type: "customer",
        reference_number: "CHQ-789456",
        currency_code: "MAD",
        status: "reconciled",
        remarks: "Acompte facture FAC-2024-002",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-006",
        payment_type: "receive",
        payment_method: "cash",
        payment_date: threeDaysAgo.toISOString().split("T")[0],
        amount: 8500,
        party_id: customers[2]?.id || customers[1]?.id,
        party_name: customers[2]?.name || "Restaurant Le Jardin",
        party_type: "customer",
        currency_code: "MAD",
        status: "submitted",
        remarks: "Paiement comptant livraison légumes frais",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-007",
        payment_type: "receive",
        payment_method: "bank_transfer",
        payment_date: now.toISOString().split("T")[0],
        amount: 12000,
        party_id: customers[1]?.id,
        party_name: customers[1]?.name || "Coopérative Agricole Berkane",
        party_type: "customer",
        reference_number: "VIR-34567",
        currency_code: "MAD",
        status: "draft",
        remarks: "Virement reçu - en attente de réconciliation",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-008",
        payment_type: "receive",
        payment_method: "cash",
        payment_date: now.toISOString().split("T")[0],
        amount: 3000,
        party_id: customers[1]?.id,
        party_name: customers[1]?.name || "Coopérative Agricole Berkane",
        party_type: "customer",
        currency_code: "MAD",
        status: "draft",
        remarks: "Paiement en espèces - en attente de validation",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-009",
        payment_type: "pay",
        payment_method: "bank_transfer",
        payment_date: fourMonthsAgo.toISOString().split("T")[0],
        amount: 35000,
        party_id: suppliers[0]?.id,
        party_name: suppliers[0]?.name || "AgriSupply Maroc",
        party_type: "supplier",
        reference_number: "VIR-OUT-001",
        currency_code: "MAD",
        status: "reconciled",
        remarks: "Paiement commande engrais saison printemps",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-010",
        payment_type: "pay",
        payment_method: "check",
        payment_date: threeMonthsAgo.toISOString().split("T")[0],
        amount: 12500,
        party_id: suppliers[1]?.id || suppliers[0]?.id,
        party_name: suppliers[1]?.name || "Engrais & Semences du Maroc",
        party_type: "supplier",
        reference_number: "CHQ-OUT-234",
        currency_code: "MAD",
        status: "reconciled",
        remarks: "Règlement semences certifiées bio",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-011",
        payment_type: "pay",
        payment_method: "bank_transfer",
        payment_date: twoMonthsAgo.toISOString().split("T")[0],
        amount: 8750,
        party_id: suppliers[0]?.id,
        party_name: suppliers[0]?.name || "AgriSupply Maroc",
        party_type: "supplier",
        reference_number: "VIR-OUT-345",
        currency_code: "MAD",
        status: "reconciled",
        remarks: "Paiement produits phytosanitaires",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-012",
        payment_type: "pay",
        payment_method: "bank_transfer",
        payment_date: lastMonth.toISOString().split("T")[0],
        amount: 14750,
        party_id: suppliers[0]?.id,
        party_name: suppliers[0]?.name || "AgriSupply Maroc",
        party_type: "supplier",
        reference_number: "VIR-OUT-456",
        currency_code: "MAD",
        status: "reconciled",
        remarks: "Paiement fournisseur engrais NPK",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-013",
        payment_type: "pay",
        payment_method: "check",
        payment_date: twoWeeksAgo.toISOString().split("T")[0],
        amount: 5000,
        party_id: suppliers[1]?.id || suppliers[0]?.id,
        party_name: suppliers[1]?.name || "Engrais & Semences du Maroc",
        party_type: "supplier",
        reference_number: "CHQ-OUT-567",
        currency_code: "MAD",
        status: "submitted",
        remarks: "Acompte commande semences tomates",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-014",
        payment_type: "pay",
        payment_method: "bank_transfer",
        payment_date: oneWeekAgo.toISOString().split("T")[0],
        amount: 22000,
        party_id: suppliers[0]?.id,
        party_name: suppliers[0]?.name || "AgriSupply Maroc",
        party_type: "supplier",
        reference_number: "VIR-OUT-678",
        currency_code: "MAD",
        status: "submitted",
        remarks: "Paiement équipement irrigation goutte-à-goutte",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-015",
        payment_type: "pay",
        payment_method: "cash",
        payment_date: threeDaysAgo.toISOString().split("T")[0],
        amount: 1500,
        party_id: suppliers[1]?.id || suppliers[0]?.id,
        party_name: "Fournisseur Local - Outils",
        party_type: "supplier",
        currency_code: "MAD",
        status: "submitted",
        remarks: "Achat outils agricoles - paiement comptant",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        payment_number: "PAY-2024-016",
        payment_type: "pay",
        payment_method: "bank_transfer",
        payment_date: now.toISOString().split("T")[0],
        amount: 9500,
        party_id: suppliers[0]?.id,
        party_name: suppliers[0]?.name || "AgriSupply Maroc",
        party_type: "supplier",
        reference_number: "VIR-OUT-789",
        currency_code: "MAD",
        status: "draft",
        remarks: "Ordre de virement en préparation - engrais foliaires",
        created_by: userId,
      },
    ];

    // Add bank_account_id to bank_transfer payments
    const paymentsWithBank = payments.map((p) => ({
      ...p,
      bank_account_id:
        p.payment_method === "bank_transfer" ? bankAccountId : null,
    }));

    const { data: createdPayments, error } = await client
      .from("accounting_payments")
      .insert(paymentsWithBank)
      .select();

    if (error) {
      this.logger.error(
        `Failed to create demo payments (batch): ${error.message} | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`,
      );
      // Retry one by one to insert as many as possible
      const inserted = [];
      for (const payment of paymentsWithBank) {
        const { data: single, error: singleError } = await client
          .from("accounting_payments")
          .insert(payment)
          .select()
          .single();
        if (singleError) {
          this.logger.error(
            `Failed payment ${payment.payment_number}: ${singleError.message} | code: ${singleError.code} | hint: ${singleError.hint}`,
          );
        } else if (single) {
          inserted.push(single);
        }
      }
      if (inserted.length > 0) {
        return inserted;
      }
      return [];
    }

    if (
      createdPayments &&
      createdPayments.length > 0 &&
      (salesInvoices.length > 0 || purchaseInvoices.length > 0)
    ) {
      const allocations = [];

      const findPayment = (num: string) =>
        createdPayments.find((p) => p.payment_number === num);
      const findSalesInvoice = (num: string) =>
        salesInvoices.find((i) => i.invoice_number === num);
      const findPurchaseInvoice = (num: string) =>
        purchaseInvoices.find((i) => i.invoice_number === num);

      const pay004 = findPayment("PAY-2024-004");
      const fac001 = findSalesInvoice("FAC-2024-001");
      if (pay004 && fac001) {
        allocations.push({
          payment_id: pay004.id,
          invoice_id: fac001.id,
          amount: 17700,
        });
      }

      const pay005 = findPayment("PAY-2024-005");
      const fac002 = findSalesInvoice("FAC-2024-002");
      if (pay005 && fac002) {
        allocations.push({
          payment_id: pay005.id,
          invoice_id: fac002.id,
          amount: 5000,
        });
      }

      const pay012 = findPayment("PAY-2024-012");
      const facf001 = findPurchaseInvoice("FACF-2024-001");
      if (pay012 && facf001) {
        allocations.push({
          payment_id: pay012.id,
          invoice_id: facf001.id,
          amount: 14750,
        });
      }

      if (allocations.length > 0) {
        await client.from("payment_allocations").insert(allocations);
      }
    }

    return createdPayments || [];
  }

  /**
   * Create demo journal entries
   */
  private async createDemoJournalEntries(
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

    // Get accounts for journal entries
    const { data: accounts } = await client
      .from("accounts")
      .select("id, code, name, account_type")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      this.logger.warn("No accounts found for journal entries");
      return [];
    }

    // Find relevant accounts
    const cashAccount = accounts.find(
      (a) =>
        a.code?.startsWith("514") || a.name?.toLowerCase().includes("caisse"),
    );
    const bankAccount = accounts.find(
      (a) =>
        a.code?.startsWith("511") || a.name?.toLowerCase().includes("banque"),
    );
    const salesAccount = accounts.find(
      (a) => a.code?.startsWith("711") || a.account_type === "Income",
    );
    const expenseAccount = accounts.find(
      (a) => a.code?.startsWith("61") || a.account_type === "Expense",
    );
    const supplierAccount = accounts.find(
      (a) =>
        a.code?.startsWith("441") ||
        a.name?.toLowerCase().includes("fournisseur"),
    );
    const customerAccount = accounts.find(
      (a) =>
        a.code?.startsWith("342") || a.name?.toLowerCase().includes("client"),
    );

    // Use first available accounts if specific ones not found
    const defaultAsset =
      accounts.find((a) => a.account_type === "Asset") || accounts[0];
    const defaultLiability =
      accounts.find((a) => a.account_type === "Liability") || accounts[1];
    const defaultIncome =
      salesAccount ||
      accounts.find((a) => a.account_type === "Income") ||
      accounts[2];
    const defaultExpense =
      expenseAccount ||
      accounts.find((a) => a.account_type === "Expense") ||
      accounts[3];

    const journalEntries = [
      {
        organization_id: organizationId,
        entry_number: "JE-2024-001",
        entry_date: twoMonthsAgo.toISOString().split("T")[0],
        entry_type: "revenue",
        description: "Vente de produits agricoles - Huile d'olive",
        total_debit: 17700,
        total_credit: 17700,
        status: "posted",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        entry_number: "JE-2024-002",
        entry_date: lastMonth.toISOString().split("T")[0],
        entry_type: "expense",
        description: "Achat d'engrais et intrants agricoles",
        total_debit: 14750,
        total_credit: 14750,
        status: "posted",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        entry_number: "JE-2024-003",
        entry_date: lastMonth.toISOString().split("T")[0],
        entry_type: "expense",
        description: "Charges de main d'œuvre - Récolte",
        total_debit: 8500,
        total_credit: 8500,
        status: "posted",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        entry_number: "JE-2024-004",
        entry_date: now.toISOString().split("T")[0],
        entry_type: "transfer",
        description: "Virement interne caisse vers banque",
        total_debit: 5000,
        total_credit: 5000,
        status: "draft",
        created_by: userId,
      },
    ];

    const { data: createdEntries, error } = await client
      .from("journal_entries")
      .insert(journalEntries)
      .select();

    if (error) {
      this.logger.error(
        `Failed to create demo journal entries: ${error.message}`,
      );
      return [];
    }

    // Create journal items for each entry
    if (createdEntries && createdEntries.length > 0) {
      const journalItems = [];

      // JE-2024-001: Revenue entry (Debit: Bank/Cash, Credit: Sales)
      if (createdEntries[0]) {
        journalItems.push(
          {
            journal_entry_id: createdEntries[0].id,
            account_id: bankAccount?.id || defaultAsset?.id,
            debit: 17700,
            credit: 0,
            description: "Encaissement vente huile olive",
          },
          {
            journal_entry_id: createdEntries[0].id,
            account_id: defaultIncome?.id,
            debit: 0,
            credit: 17700,
            description: "Vente huile olive",
          },
        );
      }

      // JE-2024-002: Expense entry (Debit: Expense, Credit: Bank/Supplier)
      if (createdEntries[1]) {
        journalItems.push(
          {
            journal_entry_id: createdEntries[1].id,
            account_id: defaultExpense?.id,
            debit: 14750,
            credit: 0,
            description: "Achat engrais",
          },
          {
            journal_entry_id: createdEntries[1].id,
            account_id: bankAccount?.id || defaultAsset?.id,
            debit: 0,
            credit: 14750,
            description: "Paiement fournisseur",
          },
        );
      }

      // JE-2024-003: Labor expense
      if (createdEntries[2]) {
        journalItems.push(
          {
            journal_entry_id: createdEntries[2].id,
            account_id: defaultExpense?.id,
            debit: 8500,
            credit: 0,
            description: "Charges personnel récolte",
            parcel_id: parcels[0]?.id,
          },
          {
            journal_entry_id: createdEntries[2].id,
            account_id: cashAccount?.id || defaultAsset?.id,
            debit: 0,
            credit: 8500,
            description: "Paiement main d'œuvre",
          },
        );
      }

      // JE-2024-004: Internal transfer
      if (createdEntries[3] && cashAccount && bankAccount) {
        journalItems.push(
          {
            journal_entry_id: createdEntries[3].id,
            account_id: bankAccount.id,
            debit: 5000,
            credit: 0,
            description: "Versement en banque",
          },
          {
            journal_entry_id: createdEntries[3].id,
            account_id: cashAccount.id,
            debit: 0,
            credit: 5000,
            description: "Retrait caisse",
          },
        );
      }

      if (journalItems.length > 0) {
        await client.from("journal_items").insert(journalItems);
      }
    }

    return createdEntries || [];
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
      (t) => t.task_type === "harvesting" && t.status === "completed",
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
      .from("warehouses")
      .select("id")
      .eq("organization_id", organizationId)
      .limit(1)
      .single();

    const harvests = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id, // Agrumes parcel
        harvest_date: lastMonth.toISOString().split("T")[0],
        quantity: 5000,
        unit: "kg",
        quality_grade: "A",
        quality_score: 8,
        quality_notes: "Excellent qualité, récolte abondante",
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
        status: "sold",
        intended_for: "market",
        expected_price_per_unit: 12,
        warehouse_id: warehouse?.id || null,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id, // Olives parcel
        harvest_date: twoMonthsAgo.toISOString().split("T")[0],
        quantity: 3000,
        unit: "kg",
        quality_grade: "Extra",
        quality_score: 9,
        quality_notes: "Qualité exceptionnelle, olives de première qualité",
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
        status: "stored",
        intended_for: "processing",
        expected_price_per_unit: 15,
        warehouse_id: warehouse?.id || null,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2].id, // Légumes parcel
        harvest_date: lastWeek.toISOString().split("T")[0],
        quantity: 1200,
        unit: "kg",
        quality_grade: "A",
        quality_score: 7,
        quality_notes: "Tomates fraîches, bonne qualité générale",
        workers: [
          {
            worker_id: workers[1].id,
            hours_worked: 6,
            quantity_picked: 800,
          },
        ],
        status: "in_delivery",
        intended_for: "market",
        expected_price_per_unit: 8,
        warehouse_id: warehouse?.id || null,
        created_by: userId,
      },
    ];

    const { data: createdHarvests, error } = await client
      .from("harvest_records")
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
      .from("warehouses")
      .select("id")
      .eq("organization_id", organizationId)
      .limit(1)
      .single();

    if (!warehouse) {
      this.logger.error("No warehouse found for reception batches");
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
        batch_code: "RB-2024-001",
        reception_date: lastMonth.toISOString().split("T")[0],
        reception_time: "14:30:00",
        weight: 5000,
        weight_unit: "kg",
        quantity: 5000,
        quantity_unit: "kg",
        quality_grade: "A",
        quality_score: 8,
        quality_notes: "Qualité excellente, fruits mûrs et sans défauts",
        humidity_percentage: 75,
        maturity_level: "optimal",
        temperature: 18,
        moisture_content: 12.5,
        received_by: workers[2].id,
        quality_checked_by: workers[0].id,
        decision: "direct_sale",
        status: "processed",
        notes: "Lot approuvé pour vente directe",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        warehouse_id: warehouse.id,
        harvest_id: harvests[1]?.id || null, // Olives harvest
        parcel_id: parcels[0].id, // Olives parcel
        batch_code: "RB-2024-002",
        reception_date: twoDaysAgo.toISOString().split("T")[0],
        reception_time: "10:15:00",
        weight: 3000,
        weight_unit: "kg",
        quantity: 3000,
        quantity_unit: "kg",
        quality_grade: "Extra",
        quality_score: 9,
        quality_notes: "Qualité exceptionnelle, olives de première qualité",
        humidity_percentage: 60,
        maturity_level: "optimal",
        temperature: 20,
        moisture_content: 8.2,
        received_by: workers[1].id,
        quality_checked_by: workers[0].id,
        decision: "storage",
        destination_warehouse_id: warehouse.id,
        status: "decision_made",
        notes: "Lot destiné au stockage pour transformation",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        warehouse_id: warehouse.id,
        harvest_id: harvests[2]?.id || null, // Tomates harvest
        parcel_id: parcels[2].id, // Légumes parcel
        batch_code: "RB-2024-003",
        reception_date: lastWeek.toISOString().split("T")[0],
        reception_time: "16:45:00",
        weight: 1200,
        weight_unit: "kg",
        quantity: 1200,
        quantity_unit: "kg",
        quality_grade: "A",
        quality_score: 7,
        quality_notes: "Tomates fraîches, quelques défauts mineurs",
        humidity_percentage: 85,
        maturity_level: "good",
        temperature: 22,
        moisture_content: 15.3,
        received_by: workers[1].id,
        quality_checked_by: workers[0].id,
        decision: "direct_sale",
        status: "quality_checked",
        notes: "En attente de décision finale",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        warehouse_id: warehouse.id,
        parcel_id: parcels[1].id, // Agrumes parcel
        batch_code: "RB-2024-004",
        reception_date: now.toISOString().split("T")[0],
        reception_time: "09:00:00",
        weight: 2500,
        weight_unit: "kg",
        quantity: 2500,
        quantity_unit: "kg",
        quality_grade: null,
        quality_score: null,
        quality_notes: null,
        humidity_percentage: null,
        maturity_level: null,
        temperature: null,
        moisture_content: null,
        received_by: workers[2].id,
        quality_checked_by: null,
        decision: "pending",
        status: "received",
        notes: "Lot reçu, contrôle qualité en attente",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        warehouse_id: warehouse.id,
        parcel_id: parcels[0].id, // Olives parcel
        batch_code: "RB-2024-005",
        reception_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        reception_time: "11:30:00",
        weight: 1500,
        weight_unit: "kg",
        quantity: 1500,
        quantity_unit: "kg",
        quality_grade: "B",
        quality_score: 6,
        quality_notes: "Qualité acceptable mais quelques défauts observés",
        humidity_percentage: 70,
        maturity_level: "good",
        temperature: 19,
        moisture_content: 10.8,
        received_by: workers[1].id,
        quality_checked_by: workers[0].id,
        decision: "transformation",
        status: "decision_made",
        notes: "Lot destiné à la transformation (huile)",
        created_by: userId,
      },
    ];

    const { error } = await client
      .from("reception_batches")
      .insert(receptionBatches);

    if (error) {
      this.logger.error(
        `Failed to create demo reception batches: ${error.message}`,
      );
      // Don't throw - reception batches are optional
    }
  }

  /**
   * Create demo financial data (costs and revenues)
   */
  private async createDemoFinancialData(
    organizationId: string,
    farmId: string,
    parcels: any[],
    harvests: any[],
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // Create cost categories first
    const costCategories = [
      { organization_id: organizationId, name: "Engrais et Amendements", type: "materials" },
      { organization_id: organizationId, name: "Main d'œuvre agricole", type: "labor" },
      { organization_id: organizationId, name: "Irrigation et Eau", type: "utilities" },
      { organization_id: organizationId, name: "Produits Phytosanitaires", type: "materials" },
      { organization_id: organizationId, name: "Équipement et Matériel", type: "equipment" },
    ];

    const { data: createdCategories } = await client
      .from("cost_categories")
      .insert(costCategories)
      .select();

    const materialsCat = createdCategories?.find((c) => c.name.includes("Engrais"));
    const laborCat = createdCategories?.find((c) => c.type === "labor");
    const utilitiesCat = createdCategories?.find((c) => c.type === "utilities");

    // Create costs with farm_id and category_id
    const costs = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        category_id: materialsCat?.id || null,
        cost_type: "materials",
        amount: 2500,
        currency: "MAD",
        date: lastMonth.toISOString().split("T")[0],
        description: "Achat engrais organique pour parcelle olives",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id,
        category_id: laborCat?.id || null,
        cost_type: "labor",
        amount: 1800,
        currency: "MAD",
        date: lastMonth.toISOString().split("T")[0],
        description: "Main d'œuvre pour taille agrumes",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2]?.id || parcels[0].id,
        category_id: utilitiesCat?.id || null,
        cost_type: "utilities",
        amount: 1200,
        currency: "MAD",
        date: twoMonthsAgo.toISOString().split("T")[0],
        description: "Coût irrigation parcelle légumes",
        created_by: userId,
      },
    ];

    await client.from("costs").insert(costs);

    // Create revenues linked to harvests
    const revenues = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id,
        revenue_type: "harvest",
        amount: 60000,
        currency: "MAD",
        date: lastMonth.toISOString().split("T")[0],
        crop_type: "Agrumes",
        quantity: 5000,
        unit: "kg",
        price_per_unit: 12,
        harvest_record_id: harvests[0]?.id || null,
        description: "Vente récolte agrumes",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        revenue_type: "harvest",
        amount: 45000,
        currency: "MAD",
        date: twoMonthsAgo.toISOString().split("T")[0],
        crop_type: "Olives",
        quantity: 3000,
        unit: "kg",
        price_per_unit: 15,
        harvest_record_id: harvests[1]?.id || null,
        description: "Vente récolte olives",
        created_by: userId,
      },
    ];

    await client.from("revenues").insert(revenues);
  }

  /**
   * Create demo utilities (fixed costs: electricity, water, diesel, etc.)
   */
  private async createDemoUtilities(
    organizationId: string,
    farmId: string,
    parcels: any[],
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const currentMonth = now.toISOString().split("T")[0];
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const fourMonthsAgo = new Date(now);
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    const fiveMonthsAgo = new Date(now);
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Create diverse utilities across 6 months with various types and statuses
    const utilities = [
      // ===== ELECTRICITY (6 months history) =====
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "electricity",
        provider: "ONEE (Office National de l'Électricité)",
        account_number: "ELEC-2024-001234",
        amount: 1450.0,
        consumption_value: 380,
        consumption_unit: "kWh",
        billing_date: sixMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(sixMonthsAgo.getTime() + 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Facture électricité - Période hivernale basse consommation",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "electricity",
        provider: "ONEE (Office National de l'Électricité)",
        account_number: "ELEC-2024-001234",
        amount: 1680.25,
        consumption_value: 420,
        consumption_unit: "kWh",
        billing_date: fiveMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(fiveMonthsAgo.getTime() + 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Facture électricité - Début saison irrigation",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "electricity",
        provider: "ONEE (Office National de l'Électricité)",
        account_number: "ELEC-2024-001234",
        amount: 1920.5,
        consumption_value: 480,
        consumption_unit: "kWh",
        billing_date: fourMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(fourMonthsAgo.getTime() + 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Facture électricité - Pleine saison",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "electricity",
        provider: "ONEE (Office National de l'Électricité)",
        account_number: "ELEC-2024-001234",
        amount: 2100.0,
        consumption_value: 520,
        consumption_unit: "kWh",
        billing_date: threeMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(threeMonthsAgo.getTime() + 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Facture électricité - Pic de consommation estival",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "electricity",
        provider: "ONEE (Office National de l'Électricité)",
        account_number: "ELEC-2024-001234",
        amount: 2350.75,
        consumption_value: 580,
        consumption_unit: "kWh",
        billing_date: twoMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(twoMonthsAgo.getTime() + 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Facture électricité - Haute saison irrigation + chambre froide",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "electricity",
        provider: "ONEE (Office National de l'Électricité)",
        account_number: "ELEC-2024-001234",
        amount: 1850.5,
        consumption_value: 450,
        consumption_unit: "kWh",
        billing_date: lastMonth.toISOString().split("T")[0],
        due_date: new Date(lastMonth.getTime() + 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Facture électricité - Pompage irrigation et éclairage",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "electricity",
        provider: "ONEE (Office National de l'Électricité)",
        account_number: "ELEC-2024-001234",
        amount: 1650.75,
        consumption_value: 410,
        consumption_unit: "kWh",
        billing_date: currentMonth,
        due_date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "pending",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Facture électricité en attente de paiement",
      },

      // ===== WATER (6 months history with parcel allocation) =====
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0]?.id,
        type: "water",
        provider: "ONEP (Office National de l'Eau Potable)",
        account_number: "EAU-2024-005678",
        amount: 2400.0,
        consumption_value: 650,
        consumption_unit: "m³",
        billing_date: sixMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(sixMonthsAgo.getTime() + 20 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Irrigation parcelle olives - Hiver",
        cost_per_parcel: 2400.0,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0]?.id,
        type: "water",
        provider: "ONEP (Office National de l'Eau Potable)",
        account_number: "EAU-2024-005678",
        amount: 2800.0,
        consumption_value: 750,
        consumption_unit: "m³",
        billing_date: fourMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(fourMonthsAgo.getTime() + 20 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Irrigation parcelle olives - Printemps",
        cost_per_parcel: 2800.0,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0]?.id,
        type: "water",
        provider: "ONEP (Office National de l'Eau Potable)",
        account_number: "EAU-2024-005678",
        amount: 3200.0,
        consumption_value: 850,
        consumption_unit: "m³",
        billing_date: lastMonth.toISOString().split("T")[0],
        due_date: new Date(lastMonth.getTime() + 20 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Irrigation parcelle olives - Été",
        cost_per_parcel: 3200.0,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1]?.id,
        type: "water",
        provider: "ONEP (Office National de l'Eau Potable)",
        account_number: "EAU-2024-005679",
        amount: 2100.0,
        consumption_value: 560,
        consumption_unit: "m³",
        billing_date: fiveMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(fiveMonthsAgo.getTime() + 20 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Irrigation parcelle agrumes - Printemps",
        cost_per_parcel: 2100.0,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1]?.id,
        type: "water",
        provider: "ONEP (Office National de l'Eau Potable)",
        account_number: "EAU-2024-005679",
        amount: 2800.5,
        consumption_value: 720,
        consumption_unit: "m³",
        billing_date: lastMonth.toISOString().split("T")[0],
        due_date: new Date(lastMonth.getTime() + 20 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Irrigation parcelle agrumes - Été",
        cost_per_parcel: 2800.5,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2]?.id,
        type: "water",
        provider: "ONEP (Office National de l'Eau Potable)",
        account_number: "EAU-2024-005680",
        amount: 1800.0,
        consumption_value: 480,
        consumption_unit: "m³",
        billing_date: threeMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(threeMonthsAgo.getTime() + 20 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Irrigation parcelle légumes - Saison tomates",
        cost_per_parcel: 1800.0,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "water",
        provider: "ONEP (Office National de l'Eau Potable)",
        account_number: "EAU-2024-005678",
        amount: 3500.0,
        consumption_value: 920,
        consumption_unit: "m³",
        billing_date: currentMonth,
        due_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "pending",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Facture eau - période de forte irrigation",
      },

      // ===== DIESEL (Multiple purchases throughout the year) =====
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "diesel",
        provider: "Total Energies Maroc",
        amount: 3200.0,
        consumption_value: 200,
        consumption_unit: "L",
        billing_date: sixMonthsAgo.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: false,
        notes: "Carburant pour préparation du sol - Labourage",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "diesel",
        provider: "Afriquia Gaz",
        amount: 4800.0,
        consumption_value: 320,
        consumption_unit: "L",
        billing_date: fourMonthsAgo.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: false,
        notes: "Carburant pour plantation et semis",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "diesel",
        provider: "Shell Maroc",
        amount: 3800.0,
        consumption_value: 250,
        consumption_unit: "L",
        billing_date: twoMonthsAgo.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: false,
        notes: "Carburant pour récolte et transport",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "diesel",
        provider: "Afriquia Gaz",
        amount: 4500.0,
        consumption_value: 300,
        consumption_unit: "L",
        billing_date: lastMonth.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: false,
        notes: "Carburant pour tracteurs - travaux de sol",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "diesel",
        provider: "Total Energies Maroc",
        amount: 2400.0,
        consumption_value: 150,
        consumption_unit: "L",
        billing_date: currentMonth,
        due_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "pending",
        is_recurring: false,
        notes: "Carburant pour transport récolte - Facture en cours",
      },

      // ===== INTERNET (Monthly recurring) =====
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "internet",
        provider: "Maroc Telecom",
        account_number: "INT-2024-009876",
        amount: 499.0,
        consumption_value: 100,
        consumption_unit: "GB",
        billing_date: threeMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(threeMonthsAgo.getTime() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Forfait internet Fibre 100 Mbps",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "internet",
        provider: "Maroc Telecom",
        account_number: "INT-2024-009876",
        amount: 499.0,
        consumption_value: 100,
        consumption_unit: "GB",
        billing_date: twoMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(twoMonthsAgo.getTime() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Forfait internet bureau ferme",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "internet",
        provider: "Maroc Telecom",
        account_number: "INT-2024-009876",
        amount: 499.0,
        consumption_value: 100,
        consumption_unit: "GB",
        billing_date: lastMonth.toISOString().split("T")[0],
        due_date: new Date(lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Forfait internet bureau ferme + surveillance caméras",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "internet",
        provider: "Maroc Telecom",
        account_number: "INT-2024-009876",
        amount: 499.0,
        consumption_value: 100,
        consumption_unit: "GB",
        billing_date: currentMonth,
        due_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "pending",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Forfait internet - facture en cours",
      },

      // ===== PHONE (Multiple lines) =====
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "phone",
        provider: "Orange Maroc",
        account_number: "TEL-2024-112233",
        amount: 299.0,
        billing_date: threeMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(threeMonthsAgo.getTime() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Forfait téléphone gestionnaire ferme",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "phone",
        provider: "Orange Maroc",
        account_number: "TEL-2024-112233",
        amount: 299.0,
        billing_date: twoMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(twoMonthsAgo.getTime() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Forfait téléphone gestionnaire ferme",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "phone",
        provider: "Orange Maroc",
        account_number: "TEL-2024-112233",
        amount: 299.0,
        billing_date: lastMonth.toISOString().split("T")[0],
        due_date: new Date(lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Forfait téléphone gestionnaire ferme",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "phone",
        provider: "Inwi",
        account_number: "TEL-2024-445566",
        amount: 199.0,
        billing_date: lastMonth.toISOString().split("T")[0],
        due_date: new Date(lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Forfait téléphone ouvriers agricoles",
      },

      // ===== GAS (Propane for equipment) =====
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "gas",
        provider: "Afriquia Gaz",
        amount: 850.0,
        consumption_value: 50,
        consumption_unit: "kg",
        billing_date: sixMonthsAgo.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: false,
        notes: "Bouteilles de gaz pour local technique - Hiver",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "gas",
        provider: "Afriquia Gaz",
        amount: 1200.0,
        consumption_value: 70,
        consumption_unit: "kg",
        billing_date: threeMonthsAgo.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: false,
        notes: "Gaz pour désherbage thermique",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "gas",
        provider: "Ziz Gaz",
        amount: 680.0,
        consumption_value: 40,
        consumption_unit: "kg",
        billing_date: lastMonth.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: false,
        notes: "Bouteilles de gaz pour cuisine et chauffage",
      },

      // ===== OTHER UTILITIES (Insurance, Maintenance, Security, etc.) =====
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Wafa Assurance",
        account_number: "ASS-2024-789012",
        amount: 12000.0,
        billing_date: sixMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(sixMonthsAgo.getTime() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "yearly",
        notes: "Assurance multirisque agricole - Couverture annuelle",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Maintenance Agri-Service",
        amount: 2500.0,
        billing_date: fiveMonthsAgo.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Contrat maintenance équipements irrigation - T1",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Maintenance Agri-Service",
        amount: 2500.0,
        billing_date: twoMonthsAgo.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Contrat maintenance équipements irrigation - T2",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Sécurité Atlas",
        amount: 1500.0,
        billing_date: threeMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(threeMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Service gardiennage et surveillance - 24h/24",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Sécurité Atlas",
        amount: 1500.0,
        billing_date: twoMonthsAgo.toISOString().split("T")[0],
        due_date: new Date(twoMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Service gardiennage et surveillance",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Sécurité Atlas",
        amount: 1500.0,
        billing_date: lastMonth.toISOString().split("T")[0],
        due_date: new Date(lastMonth.getTime() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "overdue",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Service gardiennage et surveillance - paiement en retard",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Techno-Agri Maroc",
        amount: 3500.0,
        billing_date: fourMonthsAgo.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: false,
        notes: "Maintenance système irrigation goutte-à-goutte",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Pest Control Pro",
        amount: 2800.0,
        billing_date: threeMonthsAgo.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Service dératisation et désinsectisation des entrepôts",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Comptabilité Agri-Expert",
        amount: 1800.0,
        billing_date: lastMonth.toISOString().split("T")[0],
        due_date: new Date(lastMonth.getTime() + 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "paid",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Honoraires comptables mensuels",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Analyse Labo Agri",
        amount: 4500.0,
        billing_date: twoMonthsAgo.toISOString().split("T")[0],
        payment_status: "paid",
        is_recurring: false,
        notes: "Analyses de sol et eau - Rapport complet",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: "other",
        provider: "Sécurité Atlas",
        amount: 1500.0,
        billing_date: currentMonth,
        due_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        payment_status: "pending",
        is_recurring: true,
        recurring_frequency: "monthly",
        notes: "Service gardiennage - Facture du mois en cours",
      },
    ];

    const { data: createdUtilities, error } = await client
      .from("utilities")
      .insert(utilities)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo utilities: ${error.message}`);
      return [];
    }

    return createdUtilities || [];
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
        name: "Siège Administratif",
        type: "technical_room",
        location: { lat: baseLat + 0.005, lng: baseLon + 0.005 },
        installation_date: "2018-06-15",
        condition: "excellent",
        usage: "Bureau administratif et salle de réunion",
        structure_details: {
          width: 12,
          length: 15,
          height: 3.5,
          construction_type: "concrete",
          equipment: [
            "Climatisation",
            "Réseau informatique",
            "Salle de réunion",
            "Archives",
          ],
        },
        notes:
          "Siège principal de l'organisation avec bureaux et salle de conférence",
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: null,
        name: "Entrepôt Central",
        type: "stable",
        location: { lat: baseLat + 0.006, lng: baseLon + 0.004 },
        installation_date: "2019-03-20",
        condition: "good",
        usage: "Stockage centralisé des intrants et équipements",
        structure_details: {
          width: 20,
          length: 30,
          height: 6,
          construction_type: "metal",
        },
        notes:
          "Entrepôt métallique pour stockage des engrais, semences et équipements partagés",
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: null,
        name: "Station de Pompage Centrale",
        type: "well",
        location: { lat: baseLat + 0.004, lng: baseLon + 0.006 },
        installation_date: "2017-09-10",
        condition: "good",
        usage: "Alimentation en eau principale pour toutes les fermes",
        structure_details: {
          depth: 80,
          pump_type: "submersible",
          pump_power: 15,
          condition: "good",
        },
        notes:
          "Forage profond avec pompe haute capacité, dessert plusieurs fermes",
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: null,
        name: "Bassin de Rétention Principal",
        type: "basin",
        location: { lat: baseLat + 0.003, lng: baseLon + 0.007 },
        installation_date: "2018-11-25",
        condition: "excellent",
        usage: "Réserve d'eau pour irrigation en période de pointe",
        structure_details: {
          shape: "rectangular",
          dimensions: { width: 25, length: 40, height: 4 },
          volume: 4000,
        },
        notes:
          "Grand bassin de stockage avec système de filtration, capacité 4000 m³",
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: null,
        name: "Laboratoire Qualité",
        type: "technical_room",
        location: { lat: baseLat + 0.007, lng: baseLon + 0.003 },
        installation_date: "2020-02-15",
        condition: "excellent",
        usage: "Analyses qualité des récoltes et contrôle phytosanitaire",
        structure_details: {
          width: 8,
          length: 10,
          height: 3,
          construction_type: "concrete",
          equipment: [
            "Spectromètre",
            "Balance de précision",
            "Réfrigérateur échantillons",
            "Microscope",
          ],
        },
        notes:
          "Laboratoire équipé pour analyses de qualité et certification des produits",
        is_active: true,
      },
    ];

    // Farm-level structures (specific to the demo farm)
    const farmStructures = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: "Puits Principal",
        type: "well",
        location: { lat: baseLat + 0.001, lng: baseLon + 0.001 },
        installation_date: "2020-01-15",
        condition: "good",
        usage: "Irrigation principale pour toutes les parcelles",
        structure_details: {
          depth: 45,
          pump_type: "submersible",
          pump_power: 7.5,
          condition: "good",
        },
        notes:
          "Puits principal avec pompe submersible, maintenance annuelle requise",
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: "Bassin de Stockage Est",
        type: "basin",
        location: { lat: baseLat + 0.002, lng: baseLon + 0.002 },
        installation_date: "2020-03-20",
        condition: "excellent",
        usage: "Stockage d'eau pour irrigation des parcelles Est",
        structure_details: {
          shape: "rectangular",
          dimensions: { width: 10, length: 20, height: 2.5 },
          volume: 500,
        },
        notes: "Bassin en béton de 500m³, nettoyage trimestriel",
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: "Local Technique Ferme",
        type: "technical_room",
        location: { lat: baseLat, lng: baseLon },
        installation_date: "2019-11-10",
        condition: "good",
        usage: "Stockage équipements et outils agricoles",
        structure_details: {
          width: 5,
          length: 10,
          height: 3,
          construction_type: "mixed",
          equipment: [
            "Outils manuels",
            "Petit matériel irrigation",
            "Produits phytosanitaires",
          ],
        },
        notes: "Local technique équipé avec électricité et eau",
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: "Bassin de Stockage Ouest",
        type: "basin",
        location: { lat: baseLat - 0.001, lng: baseLon - 0.001 },
        installation_date: "2021-05-10",
        condition: "good",
        usage: "Stockage d'eau pour irrigation des parcelles Ouest",
        structure_details: {
          shape: "circular",
          dimensions: { radius: 5.5, height: 3 },
          volume: 285,
        },
        notes: "Bassin secondaire pour irrigation complémentaire",
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: "Puits Secondaire",
        type: "well",
        location: { lat: baseLat - 0.002, lng: baseLon + 0.001 },
        installation_date: "2022-08-15",
        condition: "fair",
        usage: "Puits de secours et irrigation complémentaire",
        structure_details: {
          depth: 35,
          pump_type: "surface",
          pump_power: 4,
          condition: "fair",
        },
        notes: "Puits secondaire, nécessite maintenance préventive",
        is_active: true,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        name: "Écurie",
        type: "stable",
        location: { lat: baseLat - 0.001, lng: baseLon + 0.002 },
        installation_date: "2019-06-01",
        condition: "good",
        usage: "Abri pour animaux de travail et stockage fourrage",
        structure_details: {
          width: 8,
          length: 12,
          height: 4,
          construction_type: "wood",
        },
        notes: "Écurie en bois avec 4 box et zone de stockage fourrage",
        is_active: true,
      },
    ];

    // Insert organization-level structures
    const { error: orgError } = await client
      .from("structures")
      .insert(organizationStructures);
    if (orgError) {
      this.logger.error(
        `Failed to create organization structures: ${orgError.message}`,
      );
    }

    // Insert farm-level structures
    const { error: farmError } = await client
      .from("structures")
      .insert(farmStructures);
    if (farmError) {
      this.logger.error(
        `Failed to create farm structures: ${farmError.message}`,
      );
    }
  }

  /**
   * Create demo quality inspections (linked to farm, parcels, crop cycles)
   */
  private async createDemoQualityInspections(
    organizationId: string,
    farmId: string,
    parcels: any[],
    cropCycles: any[],
    userId: string,
  ): Promise<void> {
    if (!parcels?.length) return;

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const inspections = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        crop_cycle_id: cropCycles[0]?.id || null,
        type: "pre_harvest",
        inspection_date: oneMonthAgo.toISOString().split("T")[0],
        inspector_id: userId,
        results: {
          fruit_size: "Calibre 2-3",
          color: "Vert-jaune",
          firmness: "Bonne",
          sugar_content: "12.5 Brix",
          pest_damage: "Aucun",
        },
        status: "completed",
        overall_score: 92,
        notes: "Inspection pré-récolte oliviers - qualité excellente",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1]?.id || parcels[0].id,
        crop_cycle_id: cropCycles[1]?.id || null,
        type: "post_harvest",
        inspection_date: twoWeeksAgo.toISOString().split("T")[0],
        inspector_id: userId,
        results: {
          appearance: "Excellente coloration orange",
          caliber: "Catégorie I (58-69mm)",
          juice_content: "45%",
          acidity: "0.9%",
          defects: "< 2%",
        },
        status: "completed",
        overall_score: 88,
        notes: "Contrôle post-récolte clémentines - bon lot",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        type: "storage",
        inspection_date: now.toISOString().split("T")[0],
        inspector_id: userId,
        results: {
          temperature: "18°C",
          humidity: "65%",
          ventilation: "Adéquate",
          pest_presence: "Aucune",
        },
        status: "in_progress",
        overall_score: 85,
        notes: "Inspection stockage huile olive en cours",
        created_by: userId,
      },
    ];

    const { error } = await client
      .from("quality_inspections")
      .insert(inspections);
    if (error) {
      this.logger.error(
        `Failed to create demo quality inspections: ${error.message}`,
      );
    }
  }

  /**
   * Create demo task categories and time logs
   */
  private async createDemoTaskExtras(
    organizationId: string,
    tasks: any[],
    workers: any[],
  ): Promise<void> {
    if (!tasks?.length || !workers?.length) return;

    const client = this.databaseService.getAdminClient();

    // Create task categories
    const categories = [
      {
        organization_id: organizationId,
        name: "Récolte",
        description: "Tâches liées à la récolte des cultures",
        color: "#4CAF50",
        icon: "harvest",
        default_duration: 480,
      },
      {
        organization_id: organizationId,
        name: "Traitement",
        description: "Application de produits phytosanitaires",
        color: "#FF9800",
        icon: "spray",
        default_duration: 240,
      },
      {
        organization_id: organizationId,
        name: "Irrigation",
        description: "Gestion de l'irrigation",
        color: "#2196F3",
        icon: "water",
        default_duration: 120,
      },
      {
        organization_id: organizationId,
        name: "Taille",
        description: "Taille des arbres et entretien",
        color: "#795548",
        icon: "cut",
        default_duration: 360,
      },
      {
        organization_id: organizationId,
        name: "Maintenance",
        description: "Entretien général et réparations",
        color: "#607D8B",
        icon: "tools",
        default_duration: 180,
      },
    ];

    await client.from("task_categories").insert(categories);

    // Create task time logs for recent tasks
    const now = new Date();
    const timeLogs = [];

    for (let i = 0; i < Math.min(tasks.length, 5); i++) {
      const task = tasks[i];
      const worker = workers[i % workers.length];
      const dayOffset = i + 1;
      const workDate = new Date(
        now.getTime() - dayOffset * 24 * 60 * 60 * 1000,
      );

      if (workDate.getDay() === 0) continue;

      timeLogs.push({
        task_id: task.id,
        worker_id: worker.id,
        start_time: new Date(
          workDate.getFullYear(),
          workDate.getMonth(),
          workDate.getDate(),
          8,
          0,
        ).toISOString(),
        end_time: new Date(
          workDate.getFullYear(),
          workDate.getMonth(),
          workDate.getDate(),
          12,
          0,
        ).toISOString(),
        break_duration: 0,
        notes: `Session matin - ${task.title || "Travail agricole"}`,
      });

      timeLogs.push({
        task_id: task.id,
        worker_id: worker.id,
        start_time: new Date(
          workDate.getFullYear(),
          workDate.getMonth(),
          workDate.getDate(),
          13,
          0,
        ).toISOString(),
        end_time: new Date(
          workDate.getFullYear(),
          workDate.getMonth(),
          workDate.getDate(),
          17,
          0,
        ).toISOString(),
        break_duration: 0,
        notes: `Session après-midi - ${task.title || "Travail agricole"}`,
      });
    }

    if (timeLogs.length > 0) {
      const { error } = await client.from("task_time_logs").insert(timeLogs);
      if (error) {
        this.logger.error(
          `Failed to create demo task time logs: ${error.message}`,
        );
      }
    }
  }

  /**
   * Create demo worker payment records
   */
  private async createDemoPaymentRecords(
    organizationId: string,
    farmId: string,
    workers: any[],
    userId: string,
  ): Promise<void> {
    if (!workers?.length) return;

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const twoMonthsAgoStart = new Date(
      now.getFullYear(),
      now.getMonth() - 2,
      1,
    );
    const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);

    const records = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        worker_id: workers[0].id,
        payment_type: "daily_wage",
        period_start: twoMonthsAgoStart.toISOString().split("T")[0],
        period_end: twoMonthsAgoEnd.toISOString().split("T")[0],
        base_amount: 3750,
        bonuses: 200,
        deductions: 0,
        overtime_amount: 300,
        advance_deduction: 0,
        days_worked: 25,
        hours_worked: 200,
        status: "paid",
        payment_method: "bank_transfer",
        payment_date: new Date(now.getFullYear(), now.getMonth() - 1, 5)
          .toISOString()
          .split("T")[0],
        calculated_by: userId,
        approved_by: userId,
        notes: "Paiement mensuel - travaux généraux",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        worker_id: workers[0].id,
        payment_type: "daily_wage",
        period_start: lastMonthStart.toISOString().split("T")[0],
        period_end: lastMonthEnd.toISOString().split("T")[0],
        base_amount: 3900,
        bonuses: 0,
        deductions: 150,
        overtime_amount: 450,
        advance_deduction: 500,
        days_worked: 26,
        hours_worked: 208,
        status: "approved",
        calculated_by: userId,
        approved_by: userId,
        notes: "Paiement mensuel avec heures supplémentaires",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        worker_id: workers[1]?.id || workers[0].id,
        payment_type: "daily_wage",
        period_start: lastMonthStart.toISOString().split("T")[0],
        period_end: lastMonthEnd.toISOString().split("T")[0],
        base_amount: 3600,
        bonuses: 500,
        deductions: 0,
        overtime_amount: 0,
        advance_deduction: 0,
        days_worked: 24,
        hours_worked: 192,
        status: "paid",
        payment_method: "cash",
        payment_date: new Date(now.getFullYear(), now.getMonth(), 3)
          .toISOString()
          .split("T")[0],
        calculated_by: userId,
        notes: "Paiement mensuel avec bonus récolte",
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        worker_id: workers[2]?.id || workers[0].id,
        payment_type: "monthly_salary",
        period_start: lastMonthStart.toISOString().split("T")[0],
        period_end: lastMonthEnd.toISOString().split("T")[0],
        base_amount: 5000,
        bonuses: 0,
        deductions: 500,
        overtime_amount: 0,
        advance_deduction: 0,
        days_worked: 22,
        hours_worked: 176,
        status: "pending",
        calculated_by: userId,
        notes: "Salaire mensuel chef d'équipe",
      },
    ];

    const { error } = await client.from("payment_records").insert(records);
    if (error) {
      this.logger.error(
        `Failed to create demo payment records: ${error.message}`,
      );
    }
  }

  /**
   * Create demo harvest forecasts
   */
  private async createDemoHarvestForecasts(
    organizationId: string,
    farmId: string,
    parcels: any[],
    userId: string,
  ): Promise<void> {
    if (!parcels?.length) return;

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const inTwoMonths = new Date(now);
    inTwoMonths.setMonth(inTwoMonths.getMonth() + 2);
    const inThreeMonths = new Date(now);
    inThreeMonths.setMonth(inThreeMonths.getMonth() + 3);

    const forecasts = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        crop_type: "Olives",
        variety: "Picholine Marocaine",
        forecast_harvest_date_start: nextMonth.toISOString().split("T")[0],
        forecast_harvest_date_end: inTwoMonths.toISOString().split("T")[0],
        forecast_season: "Automne",
        confidence_level: "high",
        predicted_yield_quantity: 8000,
        predicted_yield_per_hectare: 1600,
        unit_of_measure: "kg",
        predicted_quality_grade: "Extra Vierge",
        predicted_price_per_unit: 15,
        predicted_revenue: 120000,
        cost_estimate: 35000,
        profit_estimate: 85000,
        weather_factors: { rainfall: "adequate", temperature: "optimal" },
        historical_basis: { avg_3yr: 7500, trend: "increasing" },
        status: "active",
        notes: "Prévision basée sur la floraison et les conditions actuelles",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1]?.id || parcels[0].id,
        crop_type: "Agrumes",
        variety: "Clémentine Nules",
        forecast_harvest_date_start: inTwoMonths.toISOString().split("T")[0],
        forecast_harvest_date_end: inThreeMonths.toISOString().split("T")[0],
        forecast_season: "Hiver",
        confidence_level: "medium",
        predicted_yield_quantity: 15000,
        predicted_yield_per_hectare: 2500,
        unit_of_measure: "kg",
        predicted_quality_grade: "Catégorie I",
        predicted_price_per_unit: 12,
        predicted_revenue: 180000,
        cost_estimate: 45000,
        profit_estimate: 135000,
        weather_factors: { frost_risk: "low", irrigation: "sufficient" },
        status: "active",
        notes: "Bonne formation des fruits, calibre prometteur",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2]?.id || parcels[0].id,
        crop_type: "Tomates",
        variety: "Marmande",
        forecast_harvest_date_start: now.toISOString().split("T")[0],
        forecast_harvest_date_end: nextMonth.toISOString().split("T")[0],
        confidence_level: "low",
        predicted_yield_quantity: 5000,
        predicted_yield_per_hectare: 3000,
        unit_of_measure: "kg",
        predicted_price_per_unit: 8,
        predicted_revenue: 40000,
        cost_estimate: 15000,
        profit_estimate: 25000,
        status: "draft",
        notes: "Prévision préliminaire - encore en maturation",
        created_by: userId,
      },
    ];

    const { error } = await client.from("harvest_forecasts").insert(forecasts);
    if (error) {
      this.logger.error(
        `Failed to create demo harvest forecasts: ${error.message}`,
      );
    }
  }

  /**
   * Create demo cost center budgets
   */
  private async createDemoCostCenterBudgets(
    organizationId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();

    const { data: costCenters } = await client
      .from("cost_centers")
      .select("id, name")
      .eq("organization_id", organizationId);

    if (!costCenters?.length) return;

    const currentYear = new Date().getFullYear();
    const budgets = costCenters.map((cc) => ({
      cost_center_id: cc.id,
      fiscal_year: currentYear,
      budget_amount: cc.name?.includes("Olive") ? 50000 : 35000,
      actual_amount: cc.name?.includes("Olive") ? 32000 : 21000,
    }));

    const { error } = await client
      .from("cost_center_budgets")
      .insert(budgets);
    if (error) {
      this.logger.error(
        `Failed to create demo cost center budgets: ${error.message}`,
      );
    }
  }

  /**
   * Clear all demo data for an organization
   * This deletes data that was created via demo seeding
   */
  async clearDemoData(
    organizationId: string,
  ): Promise<{ deletedCounts: Record<string, number> }> {
    this.logger.log(`Clearing demo data for organization ${organizationId}`);
    const client = this.databaseService.getAdminClient();
    const deletedCounts: Record<string, number> = {};

    try {
      // Delete in reverse order of dependencies

      // Crop cycles (references campaigns, fiscal_years)
      const { count: cropCyclesCount } = await client
        .from("crop_cycles")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["crop_cycles"] = cropCyclesCount || 0;

      // Compliance checks (references certifications)
      const { count: complianceChecksCount } = await client
        .from("compliance_checks")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["compliance_checks"] = complianceChecksCount || 0;

      // Certifications
      const { count: certificationsCount } = await client
        .from("certifications")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["certifications"] = certificationsCount || 0;

      // Notifications
      const { count: notificationsCount } = await client
        .from("notifications")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["notifications"] = notificationsCount || 0;

      // Trees, tree categories, then biological assets
      await client
        .from("trees")
        .delete()
        .eq("organization_id", organizationId);
      await client
        .from("tree_categories")
        .delete()
        .eq("organization_id", organizationId);
      const { count: bioAssetsCount } = await client
        .from("biological_assets")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["biological_assets"] = bioAssetsCount || 0;

      // Agricultural campaigns
      const { count: campaignsCount } = await client
        .from("agricultural_campaigns")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["agricultural_campaigns"] = campaignsCount || 0;

      // Payment records (worker payments)
      await client
        .from("payment_records")
        .delete()
        .eq("organization_id", organizationId);

      // Task time logs, task categories
      const { data: orgTasks } = await client
        .from("tasks")
        .select("id")
        .eq("organization_id", organizationId);
      if (orgTasks && orgTasks.length > 0) {
        const orgTaskIds = orgTasks.map((t) => t.id);
        await client.from("task_time_logs").delete().in("task_id", orgTaskIds);
      }
      await client
        .from("task_categories")
        .delete()
        .eq("organization_id", organizationId);

      // Harvest forecasts
      await client
        .from("harvest_forecasts")
        .delete()
        .eq("organization_id", organizationId);

      // Work records
      const { count: workRecordsCount } = await client
        .from("work_records")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["work_records"] = workRecordsCount || 0;

      // Soil analyses
      const { count: soilAnalysesCount } = await client
        .from("soil_analyses")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["soil_analyses"] = soilAnalysesCount || 0;

      // Analysis recommendations then analyses (generic analyses table)
      const { data: analysesData } = await client
        .from("analyses")
        .select("id")
        .eq("organization_id", organizationId);
      if (analysesData && analysesData.length > 0) {
        const analysisIds = analysesData.map((a) => a.id);
        await client
          .from("analysis_recommendations")
          .delete()
          .in("analysis_id", analysisIds);
      }
      const { count: analysesCount } = await client
        .from("analyses")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["analyses"] = analysesCount || 0;

      // Quality inspections
      await client
        .from("quality_inspections")
        .delete()
        .eq("organization_id", organizationId);

      // Product applications
      const { count: applicationsCount } = await client
        .from("product_applications")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["product_applications"] = applicationsCount || 0;

      // Delivery items then deliveries
      const { data: deliveries } = await client
        .from("deliveries")
        .select("id")
        .eq("organization_id", organizationId);
      if (deliveries && deliveries.length > 0) {
        const deliveryIds = deliveries.map((d) => d.id);
        await client
          .from("delivery_items")
          .delete()
          .in("delivery_id", deliveryIds);
      }
      const { count: deliveriesCount } = await client
        .from("deliveries")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["deliveries"] = deliveriesCount || 0;

      // Task assignments (delete via tasks)
      const { data: tasks } = await client
        .from("tasks")
        .select("id")
        .eq("organization_id", organizationId);
      if (tasks && tasks.length > 0) {
        const taskIds = tasks.map((t) => t.id);
        await client.from("task_assignments").delete().in("task_id", taskIds);
      }

      // Taxes
      const { count: taxesCount } = await client
        .from("taxes")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["taxes"] = taxesCount || 0;

      // Fiscal periods then fiscal years
      const { data: fiscalYears } = await client
        .from("fiscal_years")
        .select("id")
        .eq("organization_id", organizationId);
      if (fiscalYears && fiscalYears.length > 0) {
        const yearIds = fiscalYears.map((y) => y.id);
        await client
          .from("fiscal_periods")
          .delete()
          .in("fiscal_year_id", yearIds);
      }
      const { count: fiscalYearsCount } = await client
        .from("fiscal_years")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["fiscal_years"] = fiscalYearsCount || 0;

      // Bank accounts
      const { count: bankAccountsCount } = await client
        .from("bank_accounts")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["bank_accounts"] = bankAccountsCount || 0;

      // Cost center budgets
      await client
        .from("cost_center_budgets")
        .delete()
        .in(
          "cost_center_id",
          (await client
            .from("cost_centers")
            .select("id")
            .eq("organization_id", organizationId)
          ).data?.map((cc) => cc.id) || [],
        );

      // Financial data
      const { count: costsCount } = await client
        .from("costs")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["costs"] = costsCount || 0;

      const { count: revenuesCount } = await client
        .from("revenues")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["revenues"] = revenuesCount || 0;

      // Cost categories
      await client
        .from("cost_categories")
        .delete()
        .eq("organization_id", organizationId);

      // Utilities (fixed costs)
      const { count: utilitiesCount } = await client
        .from("utilities")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["utilities"] = utilitiesCount || 0;

      // Reception batches
      const { count: receptionBatchesCount } = await client
        .from("reception_batches")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["reception_batches"] = receptionBatchesCount || 0;

      // Harvests
      const { count: harvestsCount } = await client
        .from("harvest_records")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["harvest_records"] = harvestsCount || 0;

      // Journal items then journal entries
      const { data: journalEntries } = await client
        .from("journal_entries")
        .select("id")
        .eq("organization_id", organizationId);
      if (journalEntries && journalEntries.length > 0) {
        const journalEntryIds = journalEntries.map((je) => je.id);
        await client
          .from("journal_items")
          .delete()
          .in("journal_entry_id", journalEntryIds);
      }
      const { count: journalEntriesCount } = await client
        .from("journal_entries")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["journal_entries"] = journalEntriesCount || 0;

      // Payment allocations then payments (payments reference invoices, so delete first)
      const { data: payments } = await client
        .from("accounting_payments")
        .select("id")
        .eq("organization_id", organizationId);
      if (payments && payments.length > 0) {
        const paymentIds = payments.map((p) => p.id);
        await client
          .from("payment_allocations")
          .delete()
          .in("payment_id", paymentIds);
      }
      const { count: paymentsCount } = await client
        .from("accounting_payments")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["accounting_payments"] = paymentsCount || 0;

      // Invoice items then invoices
      const { data: invoices } = await client
        .from("invoices")
        .select("id")
        .eq("organization_id", organizationId);
      if (invoices && invoices.length > 0) {
        const invoiceIds = invoices.map((i) => i.id);
        await client
          .from("invoice_items")
          .delete()
          .in("invoice_id", invoiceIds);
      }
      const { count: invoicesCount } = await client
        .from("invoices")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["invoices"] = invoicesCount || 0;

      // Quote items then quotes
      const { data: quotes } = await client
        .from("quotes")
        .select("id")
        .eq("organization_id", organizationId);
      if (quotes && quotes.length > 0) {
        const quoteIds = quotes.map((q) => q.id);
        await client.from("quote_items").delete().in("quote_id", quoteIds);
      }
      const { count: quotesCount } = await client
        .from("quotes")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["quotes"] = quotesCount || 0;

      // Sales order items then sales orders
      const { data: salesOrders } = await client
        .from("sales_orders")
        .select("id")
        .eq("organization_id", organizationId);
      if (salesOrders && salesOrders.length > 0) {
        const orderIds = salesOrders.map((o) => o.id);
        await client
          .from("sales_order_items")
          .delete()
          .in("sales_order_id", orderIds);
      }
      const { count: salesOrdersCount } = await client
        .from("sales_orders")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["sales_orders"] = salesOrdersCount || 0;

      // Purchase order items then purchase orders
      const { data: purchaseOrders } = await client
        .from("purchase_orders")
        .select("id")
        .eq("organization_id", organizationId);
      if (purchaseOrders && purchaseOrders.length > 0) {
        const poIds = purchaseOrders.map((po) => po.id);
        await client
          .from("purchase_order_items")
          .delete()
          .in("purchase_order_id", poIds);
      }
      const { count: purchaseOrdersCount } = await client
        .from("purchase_orders")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["purchase_orders"] = purchaseOrdersCount || 0;

      // Customers and suppliers
      const { count: customersCount } = await client
        .from("customers")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["customers"] = customersCount || 0;

      const { count: suppliersCount } = await client
        .from("suppliers")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["suppliers"] = suppliersCount || 0;

      // Stock entry items and stock entries
      const { data: stockEntries } = await client
        .from("stock_entries")
        .select("id")
        .eq("organization_id", organizationId);
      if (stockEntries && stockEntries.length > 0) {
        const entryIds = stockEntries.map((e) => e.id);
        await client
          .from("stock_entry_items")
          .delete()
          .in("stock_entry_id", entryIds);
      }
      const { count: stockEntriesCount } = await client
        .from("stock_entries")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["stock_entries"] = stockEntriesCount || 0;

      // Items and item groups
      const { count: itemsCount } = await client
        .from("items")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["items"] = itemsCount || 0;

      const { count: itemGroupsCount } = await client
        .from("item_groups")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["item_groups"] = itemGroupsCount || 0;

      // Warehouses
      const { count: warehousesCount } = await client
        .from("warehouses")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["warehouses"] = warehousesCount || 0;

      // Structures
      const { count: structuresCount } = await client
        .from("structures")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["structures"] = structuresCount || 0;

      // Tasks
      const { count: tasksCount } = await client
        .from("tasks")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["tasks"] = tasksCount || 0;

      // Accounts (chart of accounts seeded by demo data)
      await client
        .from("accounts")
        .delete()
        .eq("organization_id", organizationId);

      // Cost centers
      const { count: costCentersCount } = await client
        .from("cost_centers")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["cost_centers"] = costCentersCount || 0;

      // Workers
      const { count: workersCount } = await client
        .from("workers")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["workers"] = workersCount || 0;

      // Parcels
      const { count: parcelsCount } = await client
        .from("parcels")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["parcels"] = parcelsCount || 0;

      // Farms
      const { count: farmsCount } = await client
        .from("farms")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId);
      deletedCounts["farms"] = farmsCount || 0;

      this.logger.log(
        `✅ Demo data cleared for organization ${organizationId}`,
      );
      return { deletedCounts };
    } catch (error) {
      this.logger.error(
        `❌ Error clearing demo data: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async clearDemoDataOnly(
    organizationId: string,
  ): Promise<{ deletedCounts: Record<string, number> }> {
    this.logger.log(
      `Clearing demo-only data for organization ${organizationId}`,
    );
    const client = this.databaseService.getAdminClient();
    const deletedCounts: Record<string, number> = {};

    const demoParcelNames = [
      "Parcelle Olives",
      "Parcelle Agrumes",
      "Parcelle Légumes",
    ];
    const demoTaskTitles = [
      "Irrigation Parcelle Olives",
      "Taille des arbres fruitiers",
      "Récolte Agrumes",
      "Plantation Tomates",
      "Fertilisation Organique",
      "Traitement Phytosanitaire",
      "Irrigation Complémentaire",
      "Désherbage Manuel",
      "Récolte Olives",
      "Application Engrais NPK",
      "Récolte Tomates",
    ];
    const demoQuoteNumbers = ["DEV-2024-001", "DEV-2024-002", "DEV-2024-003"];
    const demoSalesOrderNumbers = ["SO-2024-001", "SO-2024-002", "SO-2024-003"];
    const demoPurchaseOrderNumbers = ["PO-2024-001", "PO-2024-002", "PO-2024-003"];
    const demoInvoiceNumbers = [
      "FAC-2024-001",
      "FAC-2024-002",
      "FAC-2024-003",
      "FAC-2024-004",
      "FACF-2024-001",
      "FACF-2024-002",
    ];
    const demoItemGroupCodes = [
      "GRP-ENG",
      "GRP-SEM",
      "GRP-PHY",
      "GRP-EQP",
      "GRP-REC",
    ];
    const demoItemCodes = [
      "ENG-NPK-15-15-15",
      "ENG-ORG-50KG",
      "SEM-TOM-MARM",
      "SEM-CIT-CLEM",
      "PHY-FONG-1L",
      "PHY-INS-500ML",
      "EQP-SEC-AC",
      "EQP-PULV-20L",
      "REC-HUILE-EV",
      "REC-CLEM-BIO",
      "REC-ORA-NAV",
    ];

    try {
      const { data: demoFarms } = await client
        .from("farms")
        .select("id")
        .eq("organization_id", organizationId)
        .or(
          "name.ilike.%Démo%,manager_name.ilike.%Démo%,manager_email.eq.demo@example.com",
        );
      const farmIds = [...new Set((demoFarms || []).map((row) => row.id))];

      const { data: demoParcelsByName } = await client
        .from("parcels")
        .select("id")
        .eq("organization_id", organizationId)
        .in("name", demoParcelNames);
      const parcelIdsFromName = (demoParcelsByName || []).map((row) => row.id);

      let parcelIdsFromFarm: string[] = [];
      if (farmIds.length > 0) {
        const { data: demoParcelsByFarm } = await client
          .from("parcels")
          .select("id")
          .eq("organization_id", organizationId)
          .in("farm_id", farmIds);
        parcelIdsFromFarm = (demoParcelsByFarm || []).map((row) => row.id);
      }
      const parcelIds = [...new Set([...parcelIdsFromName, ...parcelIdsFromFarm])];

      const { data: demoWorkersRaw } = await client
        .from("workers")
        .select("id, first_name, last_name")
        .eq("organization_id", organizationId)
        .in("first_name", ["Ahmed", "Fatima", "Mohamed"])
        .in("last_name", ["Benali", "Alami", "Tazi"]);
      const workerIds = [...new Set((demoWorkersRaw || []).map((row) => row.id))];

      const { data: demoTasksByTitle } = await client
        .from("tasks")
        .select("id")
        .eq("organization_id", organizationId)
        .in("title", demoTaskTitles);
      const taskIdsByTitle = (demoTasksByTitle || []).map((row) => row.id);

      let taskIdsByFarm: string[] = [];
      if (farmIds.length > 0) {
        const { data: demoTasksByFarm } = await client
          .from("tasks")
          .select("id")
          .eq("organization_id", organizationId)
          .in("farm_id", farmIds);
        taskIdsByFarm = (demoTasksByFarm || []).map((row) => row.id);
      }

      let taskIdsByParcel: string[] = [];
      if (parcelIds.length > 0) {
        const { data: demoTasksByParcel } = await client
          .from("tasks")
          .select("id")
          .eq("organization_id", organizationId)
          .in("parcel_id", parcelIds);
        taskIdsByParcel = (demoTasksByParcel || []).map((row) => row.id);
      }
      const taskIds = [
        ...new Set([...taskIdsByTitle, ...taskIdsByFarm, ...taskIdsByParcel]),
      ];

      const { data: demoCustomersByCode } = await client
        .from("customers")
        .select("id")
        .eq("organization_id", organizationId)
        .in("customer_code", ["CUST-001", "CUST-002", "CUST-003"]);
      const { data: demoCustomersByName } = await client
        .from("customers")
        .select("id")
        .eq("organization_id", organizationId)
        .in("name", [
          "Marché Central de Casablanca",
          "Coopérative Agricole Berkane",
          "Restaurant Le Jardin",
        ]);
      const customerIds = [
        ...new Set([
          ...(demoCustomersByCode || []).map((row) => row.id),
          ...(demoCustomersByName || []).map((row) => row.id),
        ]),
      ];

      const { data: demoSuppliersByCode } = await client
        .from("suppliers")
        .select("id")
        .eq("organization_id", organizationId)
        .in("supplier_code", ["SUP-001", "SUP-002"]);
      const { data: demoSuppliersByName } = await client
        .from("suppliers")
        .select("id")
        .eq("organization_id", organizationId)
        .in("name", ["AgriSupply Maroc", "Engrais & Semences du Maroc"]);
      const supplierIds = [
        ...new Set([
          ...(demoSuppliersByCode || []).map((row) => row.id),
          ...(demoSuppliersByName || []).map((row) => row.id),
        ]),
      ];

      const { data: demoQuotes } = await client
        .from("quotes")
        .select("id")
        .eq("organization_id", organizationId)
        .in("quote_number", demoQuoteNumbers);
      const quoteIds = [...new Set((demoQuotes || []).map((row) => row.id))];

      const { data: demoSalesOrders } = await client
        .from("sales_orders")
        .select("id")
        .eq("organization_id", organizationId)
        .in("order_number", demoSalesOrderNumbers);
      const salesOrderIds = [
        ...new Set((demoSalesOrders || []).map((row) => row.id)),
      ];

      const { data: demoPurchaseOrders } = await client
        .from("purchase_orders")
        .select("id")
        .eq("organization_id", organizationId)
        .in("order_number", demoPurchaseOrderNumbers);
      const purchaseOrderIds = [
        ...new Set((demoPurchaseOrders || []).map((row) => row.id)),
      ];

      const { data: demoInvoices } = await client
        .from("invoices")
        .select("id")
        .eq("organization_id", organizationId)
        .in("invoice_number", demoInvoiceNumbers);
      const invoiceIds = [...new Set((demoInvoices || []).map((row) => row.id))];

      const { data: demoWarehouses } = await client
        .from("warehouses")
        .select("id")
        .eq("organization_id", organizationId)
        .in("name", ["Entrepôt Principal", "Entrepôt Produits Finis"]);
      const warehouseIds = [
        ...new Set((demoWarehouses || []).map((row) => row.id)),
      ];

      const { data: demoItemGroups } = await client
        .from("item_groups")
        .select("id")
        .eq("organization_id", organizationId)
        .in("code", demoItemGroupCodes);
      const itemGroupIds = [
        ...new Set((demoItemGroups || []).map((row) => row.id)),
      ];

      const { data: demoItems } = await client
        .from("items")
        .select("id")
        .eq("organization_id", organizationId)
        .in("item_code", demoItemCodes);
      const itemIds = [...new Set((demoItems || []).map((row) => row.id))];

      const { data: demoCostCentersByParcel } = parcelIds.length
        ? await client
            .from("cost_centers")
            .select("id")
            .eq("organization_id", organizationId)
            .in("parcel_id", parcelIds)
        : { data: [] };
      const costCenterIds = [
        ...new Set((demoCostCentersByParcel || []).map((row) => row.id)),
      ];

      const { data: demoHarvestsByParcel } = parcelIds.length
        ? await client
            .from("harvest_records")
            .select("id")
            .eq("organization_id", organizationId)
            .in("parcel_id", parcelIds)
        : { data: [] };
      const harvestIds = [
        ...new Set((demoHarvestsByParcel || []).map((row) => row.id)),
      ];

      const { data: demoDeliveriesByFarm } = farmIds.length
        ? await client
            .from("deliveries")
            .select("id")
            .eq("organization_id", organizationId)
            .in("farm_id", farmIds)
        : { data: [] };
      const deliveryIds = [
        ...new Set((demoDeliveriesByFarm || []).map((row) => row.id)),
      ];

      const { data: demoStockEntries } = await client
        .from("stock_entries")
        .select("id")
        .eq("organization_id", organizationId)
        .or(
          "reference_number.eq.PO-2024-001,reference_number.eq.PO-2024-002,reference_number.eq.PO-2024-003,reference_number.eq.SO-2024-001,reference_number.eq.SO-2024-002,reference_number.eq.TSK-2024-001,reference_number.eq.TSK-2024-002,reference_number.eq.REC-PROD-001",
        );
      const stockEntryIds = [
        ...new Set((demoStockEntries || []).map((row) => row.id)),
      ];

      const { data: demoAccountingPayments } = await client
        .from("accounting_payments")
        .select("id")
        .eq("organization_id", organizationId)
        .or(
          "reference_number.eq.VIR-12345,reference_number.eq.VIR-78901,reference_number.eq.VIR-89012,reference_number.eq.CHQ-456789,reference_number.eq.CHQ-789456,reference_number.eq.VIR-34567,reference_number.eq.VIR-OUT-001,reference_number.eq.CHQ-OUT-234,reference_number.eq.VIR-OUT-345,reference_number.eq.VIR-OUT-456,reference_number.eq.CHQ-OUT-567,reference_number.eq.VIR-OUT-678,reference_number.eq.VIR-OUT-789",
        );
      const accountingPaymentIds = [
        ...new Set((demoAccountingPayments || []).map((row) => row.id)),
      ];

      const { data: demoJournalEntriesByFarm } = farmIds.length
        ? await client
            .from("journal_entries")
            .select("id")
            .eq("organization_id", organizationId)
            .in("farm_id", farmIds)
        : { data: [] };
      const journalEntryIds = [
        ...new Set((demoJournalEntriesByFarm || []).map((row) => row.id)),
      ];

      const { data: demoAnalysesByParcel } = parcelIds.length
        ? await client
            .from("analyses")
            .select("id")
            .eq("organization_id", organizationId)
            .in("parcel_id", parcelIds)
        : { data: [] };
      const analysisIds = [
        ...new Set((demoAnalysesByParcel || []).map((row) => row.id)),
      ];

      if (analysisIds.length > 0) {
        await client
          .from("analysis_recommendations")
          .delete()
          .in("analysis_id", analysisIds);
      }

      if (deliveryIds.length > 0) {
        await client
          .from("delivery_items")
          .delete()
          .in("delivery_id", deliveryIds);
      }

      if (taskIds.length > 0) {
        await client.from("task_assignments").delete().in("task_id", taskIds);
        await client.from("task_time_logs").delete().in("task_id", taskIds);
      }

      if (accountingPaymentIds.length > 0) {
        await client
          .from("payment_allocations")
          .delete()
          .in("payment_id", accountingPaymentIds);
      }

      if (invoiceIds.length > 0) {
        await client.from("invoice_items").delete().in("invoice_id", invoiceIds);
      }

      if (quoteIds.length > 0) {
        await client.from("quote_items").delete().in("quote_id", quoteIds);
      }

      if (salesOrderIds.length > 0) {
        await client
          .from("sales_order_items")
          .delete()
          .in("sales_order_id", salesOrderIds);
      }

      if (purchaseOrderIds.length > 0) {
        await client
          .from("purchase_order_items")
          .delete()
          .in("purchase_order_id", purchaseOrderIds);
      }

      if (stockEntryIds.length > 0) {
        await client
          .from("stock_entry_items")
          .delete()
          .in("stock_entry_id", stockEntryIds);
      }

      if (costCenterIds.length > 0) {
        await client
          .from("cost_center_budgets")
          .delete()
          .in("cost_center_id", costCenterIds);
      }

      const { count: notificationsCount } = await client
        .from("notifications")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId)
        .in("title", [
          "Bienvenue sur Agriprofy!",
          "Rappel: Irrigation programmée",
          "Stock faible: Engrais NPK",
          "Facture en retard",
          "Analyse satellite disponible",
        ]);
      deletedCounts["notifications"] = notificationsCount || 0;

      if (farmIds.length > 0) {
        await client.from("trees").delete().eq("organization_id", organizationId).in("farm_id", farmIds);
      }

      const { count: bioAssetsCount } = farmIds.length
        ? await client
            .from("biological_assets")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("farm_id", farmIds)
        : { count: 0 };
      deletedCounts["biological_assets"] = bioAssetsCount || 0;

      const { count: campaignsCount } = farmIds.length
        ? await client
            .from("agricultural_campaigns")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("farm_id", farmIds)
        : { count: 0 };
      deletedCounts["agricultural_campaigns"] = campaignsCount || 0;

      const { count: workRecordsCount } = farmIds.length
        ? await client
            .from("work_records")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("farm_id", farmIds)
        : { count: 0 };
      deletedCounts["work_records"] = workRecordsCount || 0;

      const { count: soilAnalysesCount } = parcelIds.length
        ? await client
            .from("soil_analyses")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("parcel_id", parcelIds)
        : { count: 0 };
      deletedCounts["soil_analyses"] = soilAnalysesCount || 0;

      const { count: analysesCount } = analysisIds.length
        ? await client
            .from("analyses")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", analysisIds)
        : { count: 0 };
      deletedCounts["analyses"] = analysesCount || 0;

      const { count: applicationsCount } = farmIds.length
        ? await client
            .from("product_applications")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("farm_id", farmIds)
        : { count: 0 };
      deletedCounts["product_applications"] = applicationsCount || 0;

      const { count: deliveriesCount } = deliveryIds.length
        ? await client
            .from("deliveries")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", deliveryIds)
        : { count: 0 };
      deletedCounts["deliveries"] = deliveriesCount || 0;

      const { count: receptionBatchesCount } = await client
        .from("reception_batches")
        .delete({ count: "exact" })
        .eq("organization_id", organizationId)
        .in("batch_code", [
          "RB-2024-001",
          "RB-2024-002",
          "RB-2024-003",
          "RB-2024-004",
          "RB-2024-005",
        ]);
      deletedCounts["reception_batches"] = receptionBatchesCount || 0;

      const { count: harvestsCount } = harvestIds.length
        ? await client
            .from("harvest_records")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", harvestIds)
        : { count: 0 };
      deletedCounts["harvest_records"] = harvestsCount || 0;

      const { count: journalEntriesCount } = journalEntryIds.length
        ? await client
            .from("journal_entries")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", journalEntryIds)
        : { count: 0 };
      deletedCounts["journal_entries"] = journalEntriesCount || 0;

      const { count: accountingPaymentsCount } = accountingPaymentIds.length
        ? await client
            .from("accounting_payments")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", accountingPaymentIds)
        : { count: 0 };
      deletedCounts["accounting_payments"] = accountingPaymentsCount || 0;

      const { count: invoicesCount } = invoiceIds.length
        ? await client
            .from("invoices")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", invoiceIds)
        : { count: 0 };
      deletedCounts["invoices"] = invoicesCount || 0;

      const { count: quotesCount } = quoteIds.length
        ? await client
            .from("quotes")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", quoteIds)
        : { count: 0 };
      deletedCounts["quotes"] = quotesCount || 0;

      const { count: salesOrdersCount } = salesOrderIds.length
        ? await client
            .from("sales_orders")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", salesOrderIds)
        : { count: 0 };
      deletedCounts["sales_orders"] = salesOrdersCount || 0;

      const { count: purchaseOrdersCount } = purchaseOrderIds.length
        ? await client
            .from("purchase_orders")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", purchaseOrderIds)
        : { count: 0 };
      deletedCounts["purchase_orders"] = purchaseOrdersCount || 0;

      const { count: customersCount } = customerIds.length
        ? await client
            .from("customers")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", customerIds)
        : { count: 0 };
      deletedCounts["customers"] = customersCount || 0;

      const { count: suppliersCount } = supplierIds.length
        ? await client
            .from("suppliers")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", supplierIds)
        : { count: 0 };
      deletedCounts["suppliers"] = suppliersCount || 0;

      const { count: stockEntriesCount } = stockEntryIds.length
        ? await client
            .from("stock_entries")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", stockEntryIds)
        : { count: 0 };
      deletedCounts["stock_entries"] = stockEntriesCount || 0;

      const { count: itemsCount } = itemIds.length
        ? await client
            .from("items")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", itemIds)
        : { count: 0 };
      deletedCounts["items"] = itemsCount || 0;

      const { count: itemGroupsCount } = itemGroupIds.length
        ? await client
            .from("item_groups")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", itemGroupIds)
        : { count: 0 };
      deletedCounts["item_groups"] = itemGroupsCount || 0;

      const { count: warehousesCount } = warehouseIds.length
        ? await client
            .from("warehouses")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", warehouseIds)
        : { count: 0 };
      deletedCounts["warehouses"] = warehousesCount || 0;

      const { count: structuresCount } = farmIds.length
        ? await client
            .from("structures")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("farm_id", farmIds)
        : { count: 0 };
      deletedCounts["structures"] = structuresCount || 0;

      const { count: tasksCount } = taskIds.length
        ? await client
            .from("tasks")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", taskIds)
        : { count: 0 };
      deletedCounts["tasks"] = tasksCount || 0;

      const { count: costCentersCount } = costCenterIds.length
        ? await client
            .from("cost_centers")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", costCenterIds)
        : { count: 0 };
      deletedCounts["cost_centers"] = costCentersCount || 0;

      const { count: workersCount } = workerIds.length
        ? await client
            .from("workers")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", workerIds)
        : { count: 0 };
      deletedCounts["workers"] = workersCount || 0;

      const { count: parcelsCount } = parcelIds.length
        ? await client
            .from("parcels")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", parcelIds)
        : { count: 0 };
      deletedCounts["parcels"] = parcelsCount || 0;

      const { count: farmsCount } = farmIds.length
        ? await client
            .from("farms")
            .delete({ count: "exact" })
            .eq("organization_id", organizationId)
            .in("id", farmIds)
        : { count: 0 };
      deletedCounts["farms"] = farmsCount || 0;

      this.logger.log(
        `✅ Demo-only data cleared for organization ${organizationId}`,
      );
      return { deletedCounts };
    } catch (error) {
      this.logger.error(
        `❌ Error clearing demo-only data: ${error.message}`,
        error.stack,
      );
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
      "farms",
      "parcels",
      "workers",
      "tasks",
      "harvest_records",
      "reception_batches",
      "warehouses",
      "items",
      "item_groups",
      "customers",
      "suppliers",
      "quotes",
      "sales_orders",
      "purchase_orders",
      "invoices",
      "payments",
      "journal_entries",
      "utilities",
      "costs",
      "revenues",
      "structures",
      "cost_centers",
      "stock_entries",
      "bank_accounts",
      "fiscal_years",
      "fiscal_periods",
      "taxes",
      "task_assignments",
      "deliveries",
      "product_applications",
      "soil_analyses",
      "work_records",
      "agricultural_campaigns",
      "biological_assets",
      "trees",
      "notifications",
      "analyses",
      "analysis_recommendations",
    ];

    for (const table of tables) {
      try {
        const { count } = await client
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId);
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
      .from("warehouses")
      .insert({
        organization_id: organizationId,
        farm_id: farmId,
        name: "Entrepôt Principal",
        description: "Entrepôt principal pour stockage des intrants agricoles",
        location: "Zone de stockage principale",
        is_active: true,
      })
      .select()
      .single();

    if (warehouseError) {
      this.logger.error(
        `Failed to create demo warehouse: ${warehouseError.message}`,
      );
      return;
    }

    // Get default accounts for item groups
    const { data: expenseAccount } = await client
      .from("accounts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("account_type", "Expense")
      .limit(1)
      .single();

    // Create a finished goods warehouse
    const { data: finishedGoodsWarehouse, error: fgWhError } = await client
      .from("warehouses")
      .insert({
        organization_id: organizationId,
        farm_id: farmId,
        name: "Entrepôt Produits Finis",
        description: "Stockage des produits récoltés et transformés",
        location: "Zone de conditionnement",
        is_active: true,
      })
      .select()
      .single();

    if (fgWhError) {
      this.logger.error(
        `Failed to create finished goods warehouse: ${fgWhError.message}`,
      );
    }

    // Get income account for sales items
    const { data: incomeAccount } = await client
      .from("accounts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("account_type", "Income")
      .limit(1)
      .single();

    // Create item groups
    const itemGroups = [
      {
        organization_id: organizationId,
        name: "Engrais",
        code: "GRP-ENG",
        description: "Engrais et fertilisants",
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: "Semences",
        code: "GRP-SEM",
        description: "Semences et plants",
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: "Produits Phytosanitaires",
        code: "GRP-PHY",
        description: "Pesticides et produits de traitement",
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: "Équipements",
        code: "GRP-EQP",
        description: "Équipements et outils agricoles",
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: "Produits Récoltés",
        code: "GRP-REC",
        description: "Produits agricoles récoltés et transformés pour la vente",
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdGroups, error: groupsError } = await client
      .from("item_groups")
      .insert(itemGroups)
      .select();

    if (groupsError) {
      this.logger.error(
        `Failed to create demo item groups: ${groupsError.message}`,
      );
      return;
    }

    // Create items
    const items = [
      {
        organization_id: organizationId,
        item_code: "ENG-NPK-15-15-15",
        item_name: "Engrais NPK 15-15-15",
        description: "Engrais complet NPK pour arbres fruitiers",
        item_group_id: createdGroups[0].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: "kg",
        stock_uom: "kg",
        standard_rate: 12.5,
        minimum_stock_level: 500,
        valuation_method: "Moving Average",
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: "ENG-ORG-50KG",
        item_name: "Engrais Organique 50kg",
        description: "Engrais organique en sac de 50kg",
        item_group_id: createdGroups[0].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: "sac",
        stock_uom: "sac",
        standard_rate: 85,
        minimum_stock_level: 20,
        valuation_method: "Moving Average",
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: "SEM-TOM-MARM",
        item_name: "Semences Tomates Marmande",
        description: "Semences de tomates variété Marmande",
        item_group_id: createdGroups[1].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: "paquet",
        stock_uom: "paquet",
        standard_rate: 25,
        minimum_stock_level: 10,
        has_expiry_date: true,
        valuation_method: "Moving Average",
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: "SEM-CIT-CLEM",
        item_name: "Plants Clémentiniers",
        description: "Plants de clémentiniers certifiés",
        item_group_id: createdGroups[1].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: "unité",
        stock_uom: "unité",
        standard_rate: 15,
        minimum_stock_level: 50,
        valuation_method: "Moving Average",
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: "PHY-FONG-1L",
        item_name: "Fongicide Systémique 1L",
        description: "Fongicide systémique pour traitement préventif",
        item_group_id: createdGroups[2].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: "litre",
        stock_uom: "litre",
        standard_rate: 120,
        minimum_stock_level: 5,
        has_expiry_date: true,
        valuation_method: "Moving Average",
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: "PHY-INS-500ML",
        item_name: "Insecticide 500ml",
        description: "Insecticide pour traitement des parasites",
        item_group_id: createdGroups[2].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: "bouteille",
        stock_uom: "bouteille",
        standard_rate: 95,
        minimum_stock_level: 8,
        has_expiry_date: true,
        valuation_method: "Moving Average",
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: "EQP-SEC-AC",
        item_name: "Sécateur Professionnel",
        description: "Sécateur professionnel pour taille",
        item_group_id: createdGroups[3].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: "unité",
        stock_uom: "unité",
        standard_rate: 180,
        minimum_stock_level: 3,
        valuation_method: "Moving Average",
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: "EQP-PULV-20L",
        item_name: "Pulvérisateur 20L",
        description: "Pulvérisateur à dos 20 litres",
        item_group_id: createdGroups[3].id,
        is_stock_item: true,
        is_purchase_item: true,
        maintain_stock: true,
        default_unit: "unité",
        stock_uom: "unité",
        standard_rate: 450,
        minimum_stock_level: 2,
        valuation_method: "Moving Average",
        default_warehouse_id: warehouse.id,
        default_expense_account_id: expenseAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      // === Output / Sales Items (harvest products) ===
      {
        organization_id: organizationId,
        item_code: "REC-HUILE-EV",
        item_name: "Huile d'Olive Extra Vierge",
        description: "Huile d'olive pressée à froid, qualité premium",
        item_group_id: createdGroups[4].id, // Produits Récoltés
        is_stock_item: true,
        is_sales_item: true,
        is_purchase_item: false,
        maintain_stock: true,
        default_unit: "L",
        stock_uom: "L",
        standard_rate: 40,
        minimum_stock_level: 50,
        valuation_method: "Moving Average",
        default_warehouse_id: finishedGoodsWarehouse?.id || warehouse.id,
        default_sales_account_id: incomeAccount?.id || null,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: "REC-CLEM-BIO",
        item_name: "Clémentines Bio",
        description: "Clémentines de saison, agriculture biologique",
        item_group_id: createdGroups[4].id,
        is_stock_item: true,
        is_sales_item: true,
        is_purchase_item: false,
        maintain_stock: true,
        default_unit: "kg",
        stock_uom: "kg",
        standard_rate: 28,
        minimum_stock_level: 100,
        valuation_method: "Moving Average",
        default_warehouse_id: finishedGoodsWarehouse?.id || warehouse.id,
        default_sales_account_id: incomeAccount?.id || null,
        shelf_life_days: 21,
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        item_code: "REC-ORA-NAV",
        item_name: "Oranges Navel",
        description: "Oranges fraîches variété Navel pour jus et consommation",
        item_group_id: createdGroups[4].id,
        is_stock_item: true,
        is_sales_item: true,
        is_purchase_item: false,
        maintain_stock: true,
        default_unit: "kg",
        stock_uom: "kg",
        standard_rate: 20,
        minimum_stock_level: 100,
        valuation_method: "Moving Average",
        default_warehouse_id: finishedGoodsWarehouse?.id || warehouse.id,
        default_sales_account_id: incomeAccount?.id || null,
        shelf_life_days: 30,
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdItems, error: itemsError } = await client
      .from("items")
      .insert(items)
      .select();

    if (itemsError) {
      this.logger.error(`Failed to create demo items: ${itemsError.message}`);
      // Don't throw - items are optional
      return { warehouse, finishedGoodsWarehouse, items: [] };
    }

    return { warehouse, finishedGoodsWarehouse, items: createdItems || [] };
  }

  /**
   * Create demo stock entries
   */
  private async createDemoStockEntries(
    organizationId: string,
    warehouse: any,
    finishedGoodsWarehouse: any,
    items: any[],
    userId: string,
  ) {
    if (!warehouse || !items || items.length === 0) {
      this.logger.warn(
        "Cannot create stock entries: missing warehouse or items",
      );
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
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

    const fgWarehouseId = finishedGoodsWarehouse?.id || warehouse.id;

    // Create stock entries with various types
    const stockEntries = [
      // === INPUT ITEMS (purchases) ===
      // SE-001: Material Receipt - Initial stock from PO-2024-001 (1 month ago)
      {
        organization_id: organizationId,
        entry_number: "SE-2024-001",
        entry_type: "Material Receipt",
        entry_date: lastMonth.toISOString().split("T")[0],
        to_warehouse_id: warehouse.id,
        reference_type: "Purchase Order",
        reference_number: "PO-2024-001",
        status: "Posted",
        purpose: "Approvisionnement initial en engrais",
        notes: "Réception stock initial - lié à facture FACF-2024-001",
        posted_at: lastMonth.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // SE-002: Material Receipt - Additional stock from PO-2024-002 (2 weeks ago)
      {
        organization_id: organizationId,
        entry_number: "SE-2024-002",
        entry_type: "Material Receipt",
        entry_date: twoWeeksAgo.toISOString().split("T")[0],
        to_warehouse_id: warehouse.id,
        reference_type: "Purchase Order",
        reference_number: "PO-2024-002",
        status: "Posted",
        purpose: "Réapprovisionnement produits phytosanitaires",
        notes: "Réception commande - lié à facture FACF-2024-002",
        posted_at: twoWeeksAgo.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // SE-003: Material Issue - Usage for tasks (1 week ago)
      {
        organization_id: organizationId,
        entry_number: "SE-2024-003",
        entry_type: "Material Issue",
        entry_date: oneWeekAgo.toISOString().split("T")[0],
        from_warehouse_id: warehouse.id,
        reference_type: "Task",
        reference_number: "TSK-2024-001",
        status: "Posted",
        purpose: "Sortie pour traitement phytosanitaire",
        notes: "Utilisé pour traitement préventif parcelle olives",
        posted_at: oneWeekAgo.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // SE-004: Material Issue - Fertilization (3 days ago)
      {
        organization_id: organizationId,
        entry_number: "SE-2024-004",
        entry_type: "Material Issue",
        entry_date: threeDaysAgo.toISOString().split("T")[0],
        from_warehouse_id: warehouse.id,
        reference_type: "Task",
        reference_number: "TSK-2024-002",
        status: "Posted",
        purpose: "Sortie pour fertilisation",
        notes: "Application engrais parcelle agrumes",
        posted_at: threeDaysAgo.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // SE-005: Stock Reconciliation (yesterday)
      {
        organization_id: organizationId,
        entry_number: "SE-2024-005",
        entry_type: "Stock Reconciliation",
        entry_date: new Date(now.getTime() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        to_warehouse_id: warehouse.id,
        status: "Posted",
        purpose: "Inventaire mensuel",
        notes: "Réconciliation après comptage physique",
        posted_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // SE-006: Draft receipt for PO-2024-003
      {
        organization_id: organizationId,
        entry_number: "SE-2024-006",
        entry_type: "Material Receipt",
        entry_date: now.toISOString().split("T")[0],
        to_warehouse_id: warehouse.id,
        reference_type: "Purchase Order",
        reference_number: "PO-2024-003",
        status: "Draft",
        purpose: "Nouvelle livraison en attente",
        notes: "En attente de vérification",
        created_by: userId,
      },
      // === OUTPUT ITEMS (harvest → finished goods) ===
      // SE-007: Material Receipt from production - Olive Oil (3 weeks ago)
      {
        organization_id: organizationId,
        entry_number: "SE-2024-007",
        entry_type: "Material Receipt",
        entry_date: threeWeeksAgo.toISOString().split("T")[0],
        to_warehouse_id: fgWarehouseId,
        reference_type: "Harvest",
        reference_number: "REC-PROD-001",
        status: "Posted",
        purpose: "Réception production - Huile olive et agrumes",
        notes: "Mise en stock des produits récoltés et transformés",
        posted_at: threeWeeksAgo.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // SE-008: Material Issue for sales - SO-2024-001 Olive Oil (last month)
      {
        organization_id: organizationId,
        entry_number: "SE-2024-008",
        entry_type: "Material Issue",
        entry_date: lastMonth.toISOString().split("T")[0],
        from_warehouse_id: fgWarehouseId,
        reference_type: "Sales Order",
        reference_number: "SO-2024-001",
        status: "Posted",
        purpose: "Sortie pour livraison client - Huile olive",
        notes: "Livraison liée à facture FAC-2024-001",
        posted_at: lastMonth.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
      // SE-009: Material Issue for sales - SO-2024-002 Olive Oil (5 days ago)
      {
        organization_id: organizationId,
        entry_number: "SE-2024-009",
        entry_type: "Material Issue",
        entry_date: fiveDaysAgo.toISOString().split("T")[0],
        from_warehouse_id: fgWarehouseId,
        reference_type: "Sales Order",
        reference_number: "SO-2024-002",
        status: "Posted",
        purpose: "Sortie pour livraison client - Huile olive",
        notes: "Livraison liée à facture FAC-2024-002",
        posted_at: fiveDaysAgo.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
    ];

    const { data: createdEntries, error: entriesError } = await client
      .from("stock_entries")
      .insert(stockEntries)
      .select();

    if (entriesError) {
      this.logger.error(
        `Failed to create demo stock entries: ${entriesError.message}`,
      );
      return;
    }

    if (!createdEntries || createdEntries.length === 0) {
      return;
    }

    // Create stock entry items for each entry
    const stockEntryItems: any[] = [];

    // Entry 1: Material Receipt - Initial stock
    if (items[0]) {
      // NPK
      stockEntryItems.push({
        stock_entry_id: createdEntries[0].id,
        line_number: 1,
        item_id: items[0].id,
        item_name: items[0].item_name,
        quantity: 500,
        unit: "kg",
        target_warehouse_id: warehouse.id,
        cost_per_unit: 12.5,
        total_cost: 6250,
        notes: "Lot initial NPK",
      });
    }
    if (items[1]) {
      // Engrais Organique
      stockEntryItems.push({
        stock_entry_id: createdEntries[0].id,
        line_number: 2,
        item_id: items[1].id,
        item_name: items[1].item_name,
        quantity: 30,
        unit: "sac",
        target_warehouse_id: warehouse.id,
        cost_per_unit: 85,
        total_cost: 2550,
        notes: "Lot initial engrais organique",
      });
    }

    // Entry 2: Material Receipt - Phytosanitary products
    if (items[4]) {
      // Fongicide
      stockEntryItems.push({
        stock_entry_id: createdEntries[1].id,
        line_number: 1,
        item_id: items[4].id,
        item_name: items[4].item_name,
        quantity: 20,
        unit: "litre",
        target_warehouse_id: warehouse.id,
        batch_number: "LOT-FONG-2024-001",
        expiry_date: new Date(now.getFullYear() + 2, now.getMonth(), 1)
          .toISOString()
          .split("T")[0],
        cost_per_unit: 120,
        total_cost: 2400,
        notes: "Fongicide avec date d'expiration",
      });
    }
    if (items[5]) {
      // Insecticide
      stockEntryItems.push({
        stock_entry_id: createdEntries[1].id,
        line_number: 2,
        item_id: items[5].id,
        item_name: items[5].item_name,
        quantity: 15,
        unit: "bouteille",
        target_warehouse_id: warehouse.id,
        batch_number: "LOT-INS-2024-001",
        expiry_date: new Date(now.getFullYear() + 1, now.getMonth() + 6, 1)
          .toISOString()
          .split("T")[0],
        cost_per_unit: 95,
        total_cost: 1425,
        notes: "Insecticide avec numéro de lot",
      });
    }

    // Entry 3: Material Issue - Phytosanitary treatment
    if (items[4]) {
      // Fongicide
      stockEntryItems.push({
        stock_entry_id: createdEntries[2].id,
        line_number: 1,
        item_id: items[4].id,
        item_name: items[4].item_name,
        quantity: 5,
        unit: "litre",
        source_warehouse_id: warehouse.id,
        batch_number: "LOT-FONG-2024-001",
        cost_per_unit: 120,
        total_cost: 600,
        notes: "Utilisé pour traitement préventif",
      });
    }

    // Entry 4: Material Issue - Fertilization
    if (items[0]) {
      // NPK
      stockEntryItems.push({
        stock_entry_id: createdEntries[3].id,
        line_number: 1,
        item_id: items[0].id,
        item_name: items[0].item_name,
        quantity: 100,
        unit: "kg",
        source_warehouse_id: warehouse.id,
        cost_per_unit: 12.5,
        total_cost: 1250,
        notes: "Application engrais NPK",
      });
    }

    // Entry 5: Stock Reconciliation
    if (items[0]) {
      // NPK
      stockEntryItems.push({
        stock_entry_id: createdEntries[4].id,
        line_number: 1,
        item_id: items[0].id,
        item_name: items[0].item_name,
        quantity: 395, // Adjusted quantity
        unit: "kg",
        target_warehouse_id: warehouse.id,
        system_quantity: 400, // What system showed
        physical_quantity: 395, // What was counted
        variance: -5, // Small loss
        notes: "Légère perte due à manipulation",
      });
    }

    // Entry 6: Draft entry items
    if (items[2]) {
      // Semences Tomates
      stockEntryItems.push({
        stock_entry_id: createdEntries[5].id,
        line_number: 1,
        item_id: items[2].id,
        item_name: items[2].item_name,
        quantity: 50,
        unit: "paquet",
        target_warehouse_id: warehouse.id,
        cost_per_unit: 25,
        total_cost: 1250,
        notes: "Nouvelle commande semences",
      });
    }

    // === OUTPUT ITEMS - Harvest/Production → Finished Goods ===
    // Find output items by item_code
    const oliveOilItem = items.find((i) => i.item_code === "REC-HUILE-EV");
    const clementineItem = items.find((i) => i.item_code === "REC-CLEM-BIO");
    const orangeItem = items.find((i) => i.item_code === "REC-ORA-NAV");

    // Entry 7: Material Receipt from production - all harvest output
    if (createdEntries[6]) {
      let lineNum = 1;
      if (oliveOilItem) {
        stockEntryItems.push({
          stock_entry_id: createdEntries[6].id,
          line_number: lineNum++,
          item_id: oliveOilItem.id,
          item_name: oliveOilItem.item_name,
          quantity: 1200, // Total production: 1200L olive oil
          unit: "L",
          target_warehouse_id: fgWarehouseId,
          cost_per_unit: 15, // production cost
          total_cost: 18000,
          batch_number: "LOT-HUILE-2024-001",
          notes: "Production huile olive - récolte saison 2024",
        });
      }
      if (clementineItem) {
        stockEntryItems.push({
          stock_entry_id: createdEntries[6].id,
          line_number: lineNum++,
          item_id: clementineItem.id,
          item_name: clementineItem.item_name,
          quantity: 800, // 800 kg clementines
          unit: "kg",
          target_warehouse_id: fgWarehouseId,
          cost_per_unit: 8,
          total_cost: 6400,
          batch_number: "LOT-CLEM-2024-001",
          notes: "Récolte clémentines bio",
        });
      }
      if (orangeItem) {
        stockEntryItems.push({
          stock_entry_id: createdEntries[6].id,
          line_number: lineNum++,
          item_id: orangeItem.id,
          item_name: orangeItem.item_name,
          quantity: 600, // 600 kg oranges
          unit: "kg",
          target_warehouse_id: fgWarehouseId,
          cost_per_unit: 6,
          total_cost: 3600,
          batch_number: "LOT-ORA-2024-001",
          notes: "Récolte oranges Navel",
        });
      }
    }

    // Entry 8: Material Issue - Sales delivery SO-2024-001 (Olive Oil 500L)
    if (createdEntries[7] && oliveOilItem) {
      stockEntryItems.push({
        stock_entry_id: createdEntries[7].id,
        line_number: 1,
        item_id: oliveOilItem.id,
        item_name: oliveOilItem.item_name,
        quantity: 500,
        unit: "L",
        source_warehouse_id: fgWarehouseId,
        cost_per_unit: 15,
        total_cost: 7500,
        batch_number: "LOT-HUILE-2024-001",
        notes: "Livraison client - FAC-2024-001 / SO-2024-001",
      });
    }

    // Entry 9: Material Issue - Sales delivery SO-2024-002 (Olive Oil 300L)
    if (createdEntries[8] && oliveOilItem) {
      stockEntryItems.push({
        stock_entry_id: createdEntries[8].id,
        line_number: 1,
        item_id: oliveOilItem.id,
        item_name: oliveOilItem.item_name,
        quantity: 300,
        unit: "L",
        source_warehouse_id: fgWarehouseId,
        cost_per_unit: 40,
        total_cost: 12000,
        batch_number: "LOT-HUILE-2024-002",
        notes: "Livraison client - FAC-2024-002 / SO-2024-002",
      });
    }

    const { error: itemsError } = await client
      .from("stock_entry_items")
      .insert(stockEntryItems);

    if (itemsError) {
      this.logger.error(
        `Failed to create demo stock entry items: ${itemsError.message}`,
      );
    }
  }

  /**
   * Export all organization data as JSON
   */
  async exportOrganizationData(organizationId: string): Promise<any> {
    this.logger.log(`Exporting data for organization ${organizationId}`);
    const client = this.databaseService.getAdminClient();

    const exportData: Record<string, any[]> = {
      metadata: [
        {
          exportDate: new Date().toISOString(),
          organizationId,
          version: "1.0",
        },
      ],
    };

    // Tables to export in order (respecting dependencies for import)
    const tables = [
      "farms",
      "parcels",
      "workers",
      "cost_centers",
      "structures",
      "warehouses",
      "item_groups",
      "items",
      "customers",
      "suppliers",
      "tasks",
      "task_assignments",
      "harvest_records",
      "reception_batches",
      "stock_entries",
      "stock_entry_items",
      "quotes",
      "quote_items",
      "sales_orders",
      "sales_order_items",
      "purchase_orders",
      "purchase_order_items",
      "invoices",
      "invoice_items",
      "costs",
      "revenues",
    ];

    for (const table of tables) {
      try {
        const { data, error } = await client
          .from(table)
          .select("*")
          .eq("organization_id", organizationId);

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
        .from("stock_entry_items")
        .select("*")
        .in("stock_entry_id", entryIds);
      exportData.stock_entry_items = stockEntryItems || [];
    }

    // Quote items - get via quotes
    if (exportData.quotes && exportData.quotes.length > 0) {
      const quoteIds = exportData.quotes.map((q: any) => q.id);
      const { data: quoteItems } = await client
        .from("quote_items")
        .select("*")
        .in("quote_id", quoteIds);
      exportData.quote_items = quoteItems || [];
    }

    // Sales order items - get via sales_orders
    if (exportData.sales_orders && exportData.sales_orders.length > 0) {
      const orderIds = exportData.sales_orders.map((o: any) => o.id);
      const { data: salesOrderItems } = await client
        .from("sales_order_items")
        .select("*")
        .in("sales_order_id", orderIds);
      exportData.sales_order_items = salesOrderItems || [];
    }

    // Purchase order items - get via purchase_orders
    if (exportData.purchase_orders && exportData.purchase_orders.length > 0) {
      const poIds = exportData.purchase_orders.map((po: any) => po.id);
      const { data: purchaseOrderItems } = await client
        .from("purchase_order_items")
        .select("*")
        .in("purchase_order_id", poIds);
      exportData.purchase_order_items = purchaseOrderItems || [];
    }

    // Invoice items - get via invoices
    if (exportData.invoices && exportData.invoices.length > 0) {
      const invoiceIds = exportData.invoices.map((i: any) => i.id);
      const { data: invoiceItems } = await client
        .from("invoice_items")
        .select("*")
        .in("invoice_id", invoiceIds);
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
      "farms",
      "parcels",
      "workers",
      "cost_centers",
      "structures",
      "warehouses",
      "item_groups",
      "items",
      "customers",
      "suppliers",
      "tasks",
      "task_assignments",
      "harvest_records",
      "reception_batches",
      "stock_entries",
      "quotes",
      "sales_orders",
      "purchase_orders",
      "invoices",
      "costs",
      "revenues",
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
            .select("id")
            .single();

          if (error) {
            this.logger.warn(
              `Failed to import record to ${table}: ${error.message}`,
            );
          } else if (inserted) {
            idMaps[table].set(oldId, inserted.id);
          }
        }

        importedCounts[table] = idMaps[table].size;
        this.logger.log(
          `Imported ${importedCounts[table]} records to ${table}`,
        );
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
      parcels: { farm_id: "farms" },
      workers: { farm_id: "farms" },
      cost_centers: { parcel_id: "parcels" },
      structures: { farm_id: "farms" },
      warehouses: { farm_id: "farms" },
      items: {
        item_group_id: "item_groups",
        default_warehouse_id: "warehouses",
      },
      tasks: {
        farm_id: "farms",
        parcel_id: "parcels",
        assigned_to: "workers",
      },
      task_assignments: {
        task_id: "tasks",
        worker_id: "workers",
      },
      harvest_records: {
        farm_id: "farms",
        parcel_id: "parcels",
        harvest_task_id: "tasks",
        warehouse_id: "warehouses",
      },
      reception_batches: {
        warehouse_id: "warehouses",
        parcel_id: "parcels",
        harvest_id: "harvest_records",
        destination_warehouse_id: "warehouses",
        received_by: "workers",
        quality_checked_by: "workers",
      },
      stock_entries: {
        from_warehouse_id: "warehouses",
        to_warehouse_id: "warehouses",
      },
      sales_orders: {
        customer_id: "customers",
      },
      invoices: {
        party_id: "customers", // or suppliers depending on type
      },
      costs: {
        parcel_id: "parcels",
      },
      revenues: {
        parcel_id: "parcels",
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
    if (
      stockEntryItems &&
      Array.isArray(stockEntryItems) &&
      stockEntryItems.length > 0
    ) {
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

        const { error } = await client
          .from("stock_entry_items")
          .insert(newItem);
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

        const { error } = await client.from("quote_items").insert(newItem);
        if (!error) count++;
      }
      importedCounts.quote_items = count;
    }

    // Sales order items
    const salesOrderItems = importData.sales_order_items;
    if (
      salesOrderItems &&
      Array.isArray(salesOrderItems) &&
      salesOrderItems.length > 0
    ) {
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

        const { error } = await client
          .from("sales_order_items")
          .insert(newItem);
        if (!error) count++;
      }
      importedCounts.sales_order_items = count;
    }

    // Purchase order items
    const purchaseOrderItems = importData.purchase_order_items;
    if (
      purchaseOrderItems &&
      Array.isArray(purchaseOrderItems) &&
      purchaseOrderItems.length > 0
    ) {
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

        const { error } = await client
          .from("purchase_order_items")
          .insert(newItem);
        if (!error) count++;
      }
      importedCounts.purchase_order_items = count;
    }

    // Invoice items
    const invoiceItems = importData.invoice_items;
    if (
      invoiceItems &&
      Array.isArray(invoiceItems) &&
      invoiceItems.length > 0
    ) {
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

        const { error } = await client.from("invoice_items").insert(newItem);
        if (!error) count++;
      }
      importedCounts.invoice_items = count;
    }
  }

  private async createDemoBankAccounts(
    organizationId: string,
    userId: string,
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();

    const bankAccounts = [
      {
        organization_id: organizationId,
        account_name: "Compte Principal - Attijariwafa Bank",
        bank_name: "Attijariwafa Bank",
        account_number: "007 810 0001234567890 12",
        bank_code: "007",
        branch_code: "810",
        account_type: "checking",
        currency_code: "MAD",
        opening_balance: 150000,
        current_balance: 185000,
        is_active: true,
      },
      {
        organization_id: organizationId,
        account_name: "Caisse Ferme",
        bank_name: null,
        account_number: "CAISSE-001",
        account_type: "cash",
        currency_code: "MAD",
        opening_balance: 5000,
        current_balance: 8500,
        is_active: true,
      },
    ];

    const { data, error } = await client
      .from("bank_accounts")
      .insert(bankAccounts)
      .select();
    if (error) {
      this.logger.error(
        `Failed to create demo bank accounts: ${error.message}`,
      );
      return [];
    }
    return data || [];
  }

  private async createDemoFiscalYears(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const currentYear = now.getFullYear();

    const fiscalYear = {
      organization_id: organizationId,
      name: `Exercice ${currentYear}`,
      code: `FY${currentYear}`,
      start_date: `${currentYear}-01-01`,
      end_date: `${currentYear}-12-31`,
      status: "open",
      is_current: true,
      period_type: "monthly",
      created_by: userId,
    };

    const { data: createdYear, error: yearError } = await client
      .from("fiscal_years")
      .insert(fiscalYear)
      .select()
      .single();

    if (yearError) {
      this.logger.error(
        `Failed to create demo fiscal year: ${yearError.message}`,
      );
      return;
    }

    const periods = [];
    const monthNames = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0);
      const status =
        month < now.getMonth() ? "closed" : "open";

      periods.push({
        organization_id: organizationId,
        fiscal_year_id: createdYear.id,
        name: `${monthNames[month]} ${currentYear}`,
        period_number: month + 1,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        status,
      });
    }

    const { error: periodsError } = await client
      .from("fiscal_periods")
      .insert(periods);
    if (periodsError) {
      this.logger.error(
        `Failed to create demo fiscal periods: ${periodsError.message}`,
      );
    }
  }

  private async createDemoTaxes(
    organizationId: string,
    userId: string,
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();

    const taxes = [
      {
        organization_id: organizationId,
        name: "TVA 20%",
        rate: 20,
        tax_type: "both",
        is_active: true,
      },
      {
        organization_id: organizationId,
        name: "TVA 10%",
        rate: 10,
        tax_type: "both",
        is_active: true,
      },
      {
        organization_id: organizationId,
        name: "TVA 0% (Exonéré)",
        rate: 0,
        tax_type: "both",
        is_active: true,
      },
    ];

    const { data, error } = await client.from("taxes").insert(taxes).select();
    if (error) {
      this.logger.error(`Failed to create demo taxes: ${error.message}`);
      return [];
    }
    return data || [];
  }

  private async createDemoTaskAssignments(
    organizationId: string,
    tasks: any[],
    workers: any[],
  ): Promise<void> {
    if (!tasks?.length || !workers?.length) return;

    const client = this.databaseService.getAdminClient();
    const now = new Date();

    const assignments = [];
    for (const task of tasks) {
      if (task.assigned_to) {
        const worker = workers.find((w) => w.id === task.assigned_to);
        if (worker) {
          assignments.push({
            organization_id: organizationId,
            task_id: task.id,
            worker_id: worker.id,
            role: "worker",
            assigned_at: task.scheduled_start || now.toISOString(),
            hours_worked: task.actual_duration || 0,
            status: task.status === "completed" ? "completed" : "assigned",
            is_active: true,
          });
        }
      }
    }

    if (assignments.length > 0) {
      const { error } = await client
        .from("task_assignments")
        .insert(assignments);
      if (error) {
        this.logger.error(
          `Failed to create demo task assignments: ${error.message}`,
        );
      }
    }
  }

  private async createDemoDeliveries(
    organizationId: string,
    farmId: string,
    customers: any[],
    workers: any[],
    harvests: any[],
    userId: string,
  ): Promise<void> {
    if (!customers?.length) return;

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const deliveries = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        delivery_date: twoWeeksAgo.toISOString().split("T")[0],
        delivery_type: "direct_client",
        customer_name: customers[0]?.name || "Client Demo",
        customer_contact: customers[0]?.phone,
        customer_email: customers[0]?.email,
        delivery_address: customers[0]?.address || "Marché Central, Casablanca",
        total_quantity: 500,
        total_amount: 15000,
        currency: "MAD",
        driver_id: workers[0]?.id || null,
        vehicle_info: "Camion frigorifique 12345-A-12",
        departure_time: new Date(twoWeeksAgo.getTime() + 6 * 3600000).toISOString(),
        arrival_time: new Date(twoWeeksAgo.getTime() + 10 * 3600000).toISOString(),
        distance_km: 120,
        status: "delivered",
        payment_status: "paid",
        payment_method: "bank_transfer",
        delivery_note_number: "BL-2024-001",
        invoice_number: "FAC-2024-001",
        notes: "Livraison huile olive - effectuée sans problème",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        delivery_date: lastWeek.toISOString().split("T")[0],
        delivery_type: "wholesale",
        customer_name: customers[1]?.name || customers[0]?.name || "Client Demo 2",
        customer_contact: customers[1]?.phone || customers[0]?.phone,
        customer_email: customers[1]?.email || customers[0]?.email,
        delivery_address: customers[1]?.address || "Coopérative, Berkane",
        total_quantity: 300,
        total_amount: 12000,
        currency: "MAD",
        driver_id: workers[1]?.id || workers[0]?.id || null,
        vehicle_info: "Camionnette 54321-B-45",
        departure_time: new Date(lastWeek.getTime() + 7 * 3600000).toISOString(),
        status: "in_transit",
        payment_status: "partial",
        payment_method: "check",
        delivery_note_number: "BL-2024-002",
        invoice_number: "FAC-2024-002",
        notes: "Livraison huile olive 300L - en cours",
        created_by: userId,
      },
    ];

    const { data: createdDeliveries, error } = await client
      .from("deliveries")
      .insert(deliveries)
      .select();
    if (error) {
      this.logger.error(`Failed to create demo deliveries: ${error.message}`);
      return;
    }

    // Create delivery items linked to harvest records
    if (createdDeliveries?.length && harvests?.length) {
      const deliveryItems = [];

      // Delivery 1 items - olive oil from harvest
      if (createdDeliveries[0] && harvests[1]) {
        deliveryItems.push({
          delivery_id: createdDeliveries[0].id,
          harvest_record_id: harvests[1].id,
          quantity: 500,
          unit: "L",
          price_per_unit: 30,
          quality_grade: "Extra Vierge",
          quality_notes: "Acidité < 0.8%",
          notes: "Huile olive pressée à froid",
        });
      }

      // Delivery 2 items - olive oil from harvest[1] (Olives parcel)
      if (createdDeliveries[1] && harvests[1]) {
        deliveryItems.push({
          delivery_id: createdDeliveries[1].id,
          harvest_record_id: harvests[1].id,
          quantity: 300,
          unit: "L",
          price_per_unit: 40,
          quality_grade: "Extra Vierge",
          quality_notes: "Acidité < 0.8%, pressée à froid",
          notes: "Huile olive premium - livraison partielle",
        });
      }

      if (deliveryItems.length > 0) {
        const { error: itemsError } = await client
          .from("delivery_items")
          .insert(deliveryItems);
        if (itemsError) {
          this.logger.error(
            `Failed to create demo delivery items: ${itemsError.message}`,
          );
        }
      }
    }
  }

  private async createDemoProductApplications(
    organizationId: string,
    farmId: string,
    parcels: any[],
    items: any[],
    tasks: any[],
    userId: string,
  ): Promise<any[]> {
    if (!parcels?.length || !items?.length) return [];

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

    // Find actual items for product_id FK
    const npkItem = items.find((i) => i.item_code === "ENG-NPK-15-15-15");
    const organicItem = items.find((i) => i.item_code === "ENG-ORG-50KG");
    const fungicideItem = items.find((i) => i.item_code === "PHY-FONG-1L");
    const insecticideItem = items.find((i) => i.item_code === "PHY-INS-500ML");

    // Find relevant tasks
    const fertTask = tasks?.find(
      (t) => t.title?.toLowerCase().includes("fertilis") || t.title?.toLowerCase().includes("engrais"),
    );
    const treatTask = tasks?.find(
      (t) => t.title?.toLowerCase().includes("trait") || t.title?.toLowerCase().includes("phyto"),
    );

    const applications = [];

    // NPK fertilization on olives parcel
    if (npkItem) {
      applications.push({
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        product_id: npkItem.id,
        application_date: oneMonthAgo.toISOString(),
        quantity_used: 250,
        area_treated: parcels[0].area || 5,
        cost: 250 * (npkItem.standard_rate || 12.5),
        currency: "MAD",
        task_id: fertTask?.id || null,
        notes: "Application engrais de fond NPK pour oliviers",
      });
    }

    // Fungicide on citrus parcel
    if (fungicideItem) {
      applications.push({
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1]?.id || parcels[0].id,
        product_id: fungicideItem.id,
        application_date: threeWeeksAgo.toISOString(),
        quantity_used: 5,
        area_treated: parcels[1]?.area || 8,
        cost: 5 * (fungicideItem.standard_rate || 120),
        currency: "MAD",
        task_id: treatTask?.id || null,
        notes: "Traitement préventif contre la tavelure",
      });
    }

    // Organic fertilizer on vegetables parcel
    if (organicItem) {
      applications.push({
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2]?.id || parcels[0].id,
        product_id: organicItem.id,
        application_date: twoWeeksAgo.toISOString(),
        quantity_used: 10,
        area_treated: parcels[2]?.area || 3,
        cost: 10 * (organicItem.standard_rate || 85),
        currency: "MAD",
        notes: "Amendement organique avant plantation",
      });
    }

    // Insecticide on olives parcel
    if (insecticideItem) {
      applications.push({
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        product_id: insecticideItem.id,
        application_date: now.toISOString(),
        quantity_used: 3,
        area_treated: parcels[0].area || 5,
        cost: 3 * (insecticideItem.standard_rate || 95),
        currency: "MAD",
        notes: "Traitement contre pucerons",
      });
    }

    if (applications.length === 0) return [];

    const { data, error } = await client
      .from("product_applications")
      .insert(applications)
      .select();
    if (error) {
      this.logger.error(
        `Failed to create demo product applications: ${error.message}`,
      );
      return [];
    }
    return data || [];
  }

  private async createDemoSoilAnalyses(
    organizationId: string,
    parcels: any[],
    _userId: string,
  ): Promise<any[]> {
    if (!parcels?.length) return [];

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const soilData = [
      {
        physical: {
          texture: "Argileux",
          structure: "Granulaire",
          porosity: 45,
          drainage: "Modéré",
          compaction: "Faible",
          color: "Brun foncé",
        },
        chemical: {
          ph: 6.8,
          nitrogen: 0.18,
          phosphorus: 32,
          potassium: 195,
          calcium: 2800,
          magnesium: 380,
          organic_matter: 2.8,
          cec: 18.5,
          salinity: 0.4,
        },
        biological: {
          microbial_activity: "Élevée",
          earthworm_count: 12,
          root_health: "Bonne",
          organic_carbon: 1.6,
        },
      },
      {
        physical: {
          texture: "Sableux",
          structure: "Particulaire",
          porosity: 55,
          drainage: "Excellent",
          compaction: "Très faible",
          color: "Brun clair",
        },
        chemical: {
          ph: 7.2,
          nitrogen: 0.12,
          phosphorus: 22,
          potassium: 145,
          calcium: 2200,
          magnesium: 290,
          organic_matter: 1.8,
          cec: 12.3,
          salinity: 0.3,
        },
        biological: {
          microbial_activity: "Moyenne",
          earthworm_count: 6,
          root_health: "Moyenne",
          organic_carbon: 1.0,
        },
      },
      {
        physical: {
          texture: "Limoneux",
          structure: "Subangulaire",
          porosity: 48,
          drainage: "Bon",
          compaction: "Modéré",
          color: "Brun",
        },
        chemical: {
          ph: 6.5,
          nitrogen: 0.22,
          phosphorus: 38,
          potassium: 210,
          calcium: 3100,
          magnesium: 420,
          organic_matter: 3.2,
          cec: 22.0,
          salinity: 0.5,
        },
        biological: {
          microbial_activity: "Très élevée",
          earthworm_count: 18,
          root_health: "Excellente",
          organic_carbon: 1.9,
        },
      },
    ];

    const analyses = parcels.map((parcel, index) => ({
      organization_id: organizationId,
      parcel_id: parcel.id,
      analysis_date: new Date(
        threeMonthsAgo.getTime() + index * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      physical: soilData[index % soilData.length].physical,
      chemical: soilData[index % soilData.length].chemical,
      biological: soilData[index % soilData.length].biological,
      notes: `Analyse de sol pour ${parcel.name} - Laboratoire Agronomique du Maroc - Réf: LAM-2024-${String(index + 1).padStart(4, "0")}`,
    }));

    const { data, error } = await client
      .from("soil_analyses")
      .insert(analyses)
      .select();
    if (error) {
      this.logger.error(
        `Failed to create demo soil analyses: ${error.message}`,
      );
      return [];
    }
    return data || [];
  }

  private async createDemoWorkRecords(
    organizationId: string,
    farmId: string,
    workers: any[],
    tasks: any[],
    userId: string,
  ): Promise<any[]> {
    if (!workers?.length) return [];

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const records = [];

    const workerTypes = ["daily_worker", "permanent", "seasonal"];

    for (let dayOffset = 1; dayOffset <= 10; dayOffset++) {
      const workDate = new Date(
        now.getTime() - dayOffset * 24 * 60 * 60 * 1000,
      );
      if (workDate.getDay() === 0) continue;

      const worker = workers[dayOffset % workers.length];
      const task = tasks?.[(dayOffset - 1) % (tasks?.length || 1)];
      const hourlyRate = (worker.daily_rate || 150) / 8;

      records.push({
        organization_id: organizationId,
        farm_id: farmId,
        worker_id: worker.id,
        worker_type: workerTypes[dayOffset % workerTypes.length],
        work_date: workDate.toISOString().split("T")[0],
        hours_worked: 8,
        task_id: task?.id || null,
        task_description: task?.title || "Travaux agricoles généraux",
        hourly_rate: hourlyRate,
        total_payment: worker.daily_rate || 150,
        payment_status: dayOffset > 3 ? "paid" : "pending",
        amount_paid: dayOffset > 3 ? (worker.daily_rate || 150) : 0,
        payment_date: dayOffset > 3
          ? workDate.toISOString().split("T")[0]
          : null,
        notes: `Journée de travail - ${task?.title || "Maintenance générale"}`,
      });
    }

    const { data, error } = await client
      .from("work_records")
      .insert(records)
      .select();
    if (error) {
      this.logger.error(
        `Failed to create demo work records (batch): ${error.message} | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`,
      );
      // Retry one by one
      const inserted = [];
      for (const record of records) {
        const { data: single, error: singleError } = await client
          .from("work_records")
          .insert(record)
          .select()
          .single();
        if (singleError) {
          this.logger.error(
            `Failed work record ${record.work_date}: ${singleError.message} | code: ${singleError.code} | hint: ${singleError.hint}`,
          );
        } else if (single) {
          inserted.push(single);
        }
      }
      return inserted;
    }
    return data || [];
  }

  private async createDemoCampaigns(
    organizationId: string,
    farmId: string,
    parcels: any[],
    userId: string,
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const currentYear = now.getFullYear();

    const previousYear = currentYear - 1;
    const twoYearsAgo = currentYear - 2;

    const campaigns = [
      // ============================================
      // CURRENT YEAR CAMPAIGNS
      // ============================================
      {
        organization_id: organizationId,
        name: `Campagne Agrumes ${currentYear}`,
        code: `AGR-${currentYear}`,
        description: "Campagne annuelle pour la production d'agrumes - Clémentines IGP Berkane",
        campaign_type: "irrigated",
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
        status: "active",
        is_current: true,
        total_area_ha: 12,
        total_planned_production: 50000,
        total_actual_production: now.getMonth() >= 10 ? 50000 : 0,
        total_costs: 85000,
        total_revenue: now.getMonth() >= 10 ? 62500 : 0,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: `Campagne Olives ${currentYear}`,
        code: `OLV-${currentYear}`,
        description: "Récolte des olives Picholine - saison automne/hiver",
        campaign_type: "rainfed",
        start_date: `${currentYear}-09-01`,
        end_date: `${currentYear}-12-31`,
        status: now.getMonth() >= 8 ? "active" : "planned",
        total_area_ha: 8,
        total_planned_production: 48000,
        total_costs: now.getMonth() >= 10 ? 45000 : 25000,
        total_revenue: 0,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: `Campagne Tomates Été ${currentYear}`,
        code: `TOM-ETE-${currentYear}`,
        description: "Production de tomates Marmande de plein champ",
        campaign_type: "irrigated",
        start_date: `${currentYear}-04-01`,
        end_date: `${currentYear}-09-30`,
        status: now.getMonth() >= 9 ? "completed" : "active",
        total_area_ha: 5,
        total_planned_production: 406000,
        total_actual_production: now.getMonth() >= 9 ? 406000 : 280000,
        total_costs: 38000,
        total_revenue: now.getMonth() >= 9 ? 162400 : 85000,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: `Campagne Avocats ${currentYear}`,
        code: `AVO-${currentYear}`,
        description: "Production d'avocats Hass - Verger jeune (3ème année)",
        campaign_type: "irrigated",
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
        status: "active",
        total_area_ha: 4,
        total_planned_production: 20000,
        total_costs: 65000,
        total_revenue: now.getMonth() >= 6 ? 95000 : 0,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: `Campagne Grenadiers ${currentYear}`,
        code: `GRN-${currentYear}`,
        description: "Récolte grenades Wonderful - marché export",
        campaign_type: "irrigated",
        start_date: `${currentYear}-08-01`,
        end_date: `${currentYear}-11-30`,
        status: now.getMonth() >= 7 ? "active" : "planned",
        total_area_ha: 3,
        total_planned_production: 15000,
        total_costs: now.getMonth() >= 9 ? 28000 : 15000,
        total_revenue: 0,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: `Campagne Tomates Hiver ${currentYear + 1}`,
        code: `TOM-HIV-${currentYear + 1}`,
        description: "Culture sous serre - Tomates Roma pour industrie",
        campaign_type: "greenhouse",
        start_date: `${currentYear}-10-15`,
        end_date: `${currentYear + 1}-04-30`,
        status: "planned",
        total_area_ha: 2,
        total_planned_production: 120000,
        total_costs: 0,
        total_revenue: 0,
        created_by: userId,
      },
      // ============================================
      // PREVIOUS YEAR CAMPAIGNS (COMPLETED)
      // ============================================
      {
        organization_id: organizationId,
        name: `Campagne Agrumes ${previousYear}`,
        code: `AGR-${previousYear}`,
        description: "Excellente saison - Export vers UE et Russie",
        campaign_type: "irrigated",
        start_date: `${previousYear}-01-01`,
        end_date: `${previousYear}-12-31`,
        status: "completed",
        total_area_ha: 12,
        total_planned_production: 180000,
        total_actual_production: 185000,
        total_costs: 128000,
        total_revenue: 245000,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: `Campagne Olives ${previousYear}`,
        code: `OLV-${previousYear}`,
        description: "Rendement en huile 18% - Qualité extra vierge",
        campaign_type: "rainfed",
        start_date: `${previousYear}-09-01`,
        end_date: `${previousYear}-12-31`,
        status: "completed",
        total_area_ha: 8,
        total_planned_production: 45000,
        total_actual_production: 48000,
        total_costs: 72000,
        total_revenue: 158000,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: `Campagne Tomates ${previousYear}`,
        code: `TOM-${previousYear}`,
        description: "Bonne saison malgré canicule juillet",
        campaign_type: "irrigated",
        start_date: `${previousYear}-04-01`,
        end_date: `${previousYear}-09-30`,
        status: "completed",
        total_area_ha: 5,
        total_planned_production: 380000,
        total_actual_production: 395000,
        total_costs: 39500,
        total_revenue: 92000,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: `Campagne Melons ${previousYear}`,
        code: `MEL-${previousYear}`,
        description: "Dépassement budget irrigation - sécheresse",
        campaign_type: "irrigated",
        start_date: `${previousYear}-05-01`,
        end_date: `${previousYear}-08-31`,
        status: "completed",
        total_area_ha: 3,
        total_planned_production: 35000,
        total_actual_production: 32000,
        total_costs: 28500,
        total_revenue: 48000,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: `Campagne Haricots Verts ${previousYear}`,
        code: `HAR-${previousYear}`,
        description: "Contrat export France - Prime qualité",
        campaign_type: "irrigated",
        start_date: `${previousYear}-03-01`,
        end_date: `${previousYear}-06-30`,
        status: "completed",
        total_area_ha: 2,
        total_planned_production: 25000,
        total_actual_production: 28500,
        total_costs: 16200,
        total_revenue: 42500,
        created_by: userId,
      },
      // ============================================
      // TWO YEARS AGO (HISTORICAL)
      // ============================================
      {
        organization_id: organizationId,
        name: `Campagne Agrumes ${twoYearsAgo}`,
        code: `AGR-${twoYearsAgo}`,
        description: "Gel tardif février - Perte 15% verger Est",
        campaign_type: "irrigated",
        start_date: `${twoYearsAgo}-01-01`,
        end_date: `${twoYearsAgo}-12-31`,
        status: "completed",
        total_area_ha: 12,
        total_planned_production: 170000,
        total_actual_production: 165000,
        total_costs: 125000,
        total_revenue: 198000,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        name: `Campagne Olives ${twoYearsAgo}`,
        code: `OLV-${twoYearsAgo}`,
        description: "Année exceptionnelle - Record de production",
        campaign_type: "rainfed",
        start_date: `${twoYearsAgo}-09-01`,
        end_date: `${twoYearsAgo}-12-31`,
        status: "completed",
        total_area_ha: 8,
        total_planned_production: 45000,
        total_actual_production: 52000,
        total_costs: 68000,
        total_revenue: 172000,
        created_by: userId,
      },
      // ============================================
      // CANCELLED CAMPAIGN (Example)
      // ============================================
      {
        organization_id: organizationId,
        name: `Campagne Fraises ${previousYear}`,
        code: `FRS-${previousYear}`,
        description: "Annulée - Problème approvisionnement plants certifiés",
        campaign_type: "greenhouse",
        start_date: `${previousYear}-01-15`,
        end_date: `${previousYear}-05-31`,
        status: "cancelled",
        total_area_ha: 1.5,
        total_planned_production: 12000,
        total_actual_production: 0,
        total_costs: 12000,
        total_revenue: 0,
        created_by: userId,
      },
    ];

    const { data, error } = await client
      .from("agricultural_campaigns")
      .insert(campaigns)
      .select();
    if (error) {
      this.logger.error(`Failed to create demo campaigns: ${error.message}`);
      return [];
    }
    return data || [];
  }

  private async createDemoBiologicalAssets(
    organizationId: string,
    farmId: string,
    parcels: any[],
    userId: string,
  ): Promise<void> {
    if (!parcels?.length) return;

    const client = this.databaseService.getAdminClient();
    const now = new Date();

    const assets = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        asset_name: "Verger Oliviers Picholine",
        asset_code: "BIO-OLV-001",
        asset_type: "bearer_plant",
        asset_category: "fruit_trees",
        quantity: 500,
        area_ha: 8,
        acquisition_date: "2020-03-15",
        maturity_date: "2025-03-15",
        expected_useful_life_years: 50,
        current_age_years: 6,
        status: "productive",
        is_productive: true,
        initial_cost: 75000,
        accumulated_depreciation: 9000,
        carrying_amount: 66000,
        fair_value: 125000,
        fair_value_date: now.toISOString().split("T")[0],
        fair_value_method: "Méthode des revenus actualisés",
        fair_value_level: 3,
        expected_annual_yield: 10000,
        expected_yield_unit: "kg",
        actual_ytd_yield: 8500,
        depreciation_method: "straight_line",
        annual_depreciation: 1500,
        residual_value: 0,
        variety_info: "Picholine Marocaine",
        notes: "Oliviers variété Picholine, plantation 2020",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id,
        asset_name: "Verger Clémentiniers",
        asset_code: "BIO-CLM-001",
        asset_type: "bearer_plant",
        asset_category: "fruit_trees",
        quantity: 400,
        area_ha: 6,
        acquisition_date: "2021-04-10",
        maturity_date: "2024-04-10",
        expected_useful_life_years: 30,
        current_age_years: 5,
        status: "productive",
        is_productive: true,
        initial_cost: 60000,
        accumulated_depreciation: 10000,
        carrying_amount: 50000,
        fair_value: 95000,
        fair_value_date: now.toISOString().split("T")[0],
        fair_value_method: "Méthode des revenus actualisés",
        fair_value_level: 3,
        expected_annual_yield: 12000,
        expected_yield_unit: "kg",
        actual_ytd_yield: 10000,
        depreciation_method: "straight_line",
        annual_depreciation: 2000,
        residual_value: 0,
        variety_info: "Clémentine Nules",
        notes: "Clémentiniers variété Nules, plantation 2021",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2].id,
        asset_name: "Culture Tomates Marmande",
        asset_code: "BIO-TOM-001",
        asset_type: "consumable_plant",
        asset_category: "vegetables",
        quantity: 5000,
        area_ha: 5,
        acquisition_date: now.toISOString().split("T")[0],
        expected_useful_life_years: 1,
        current_age_years: 0,
        status: "immature",
        is_productive: false,
        initial_cost: 15000,
        carrying_amount: 15000,
        expected_annual_yield: 80000,
        expected_yield_unit: "kg",
        actual_ytd_yield: 0,
        variety_info: "Marmande",
        notes: "Tomates variété Marmande, culture de saison",
        created_by: userId,
      },
    ];

    const { data: createdAssets, error: assetsError } = await client
      .from("biological_assets")
      .insert(assets)
      .select();

    if (assetsError) {
      this.logger.error(
        `Failed to create demo biological assets: ${assetsError.message}`,
      );
      return;
    }

    // Create tree categories first
    const treeCategories = [
      {
        organization_id: organizationId,
        category: "Olive Trees",
        category_ar: "أشجار الزيتون",
        category_fr: "Oliviers",
        is_active: true,
      },
      {
        organization_id: organizationId,
        category: "Citrus Trees",
        category_ar: "أشجار الحمضيات",
        category_fr: "Agrumes",
        is_active: true,
      },
      {
        organization_id: organizationId,
        category: "Avocado Trees",
        category_ar: "أشجار الأفوكادو",
        category_fr: "Avocatiers",
        is_active: true,
      },
    ];

    const { data: createdCategories, error: catError } = await client
      .from("tree_categories")
      .insert(treeCategories)
      .select();

    if (catError) {
      this.logger.error(
        `Failed to create demo tree categories: ${catError.message}`,
      );
      return;
    }

    if (createdCategories && createdCategories.length > 0) {
      const oliveCategory = createdCategories.find((c) => c.category === "Olive Trees");
      const citrusCategory = createdCategories.find((c) => c.category === "Citrus Trees");

      const trees = [];

      // Olive trees
      if (oliveCategory) {
        const oliveVarieties = ["Picholine", "Picholine Marocaine", "Haouzia", "Menara", "Dahbia"];
        for (let i = 0; i < 10; i++) {
          trees.push({
            organization_id: organizationId,
            category_id: oliveCategory.id,
            name: `Olivier ${oliveVarieties[i % oliveVarieties.length]} #${i + 1}`,
            is_active: true,
          });
        }
      }

      // Citrus trees
      if (citrusCategory) {
        const citrusVarieties = ["Clémentine Nules", "Navel", "Maroc Late", "Sanguinelli"];
        for (let i = 0; i < 10; i++) {
          trees.push({
            organization_id: organizationId,
            category_id: citrusCategory.id,
            name: `${citrusVarieties[i % citrusVarieties.length]} #${i + 1}`,
            is_active: true,
          });
        }
      }

      if (trees.length > 0) {
        const { error: treesError } = await client.from("trees").insert(trees);
        if (treesError) {
          this.logger.error(
            `Failed to create demo trees: ${treesError.message}`,
          );
        }
      }
    }
  }

  private async createDemoNotifications(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const now = new Date();

    const notifications = [
      {
        organization_id: organizationId,
        user_id: userId,
        title: "Bienvenue sur Agriprofy!",
        message:
          "Votre compte a été créé avec succès. Explorez les fonctionnalités de la plateforme.",
        type: "info",
        data: { category: "system" },
        is_read: true,
        created_at: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      {
        organization_id: organizationId,
        user_id: userId,
        title: "Rappel: Irrigation programmée",
        message:
          "L'irrigation de la parcelle Olives est programmée pour demain matin.",
        type: "reminder",
        data: { category: "task" },
        is_read: false,
        created_at: new Date(
          now.getTime() - 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      {
        organization_id: organizationId,
        user_id: userId,
        title: "Stock faible: Engrais NPK",
        message:
          "Le stock d'engrais NPK 15-15-15 est en dessous du seuil minimum (500 kg).",
        type: "warning",
        data: { category: "inventory" },
        is_read: false,
        created_at: new Date(
          now.getTime() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      {
        organization_id: organizationId,
        user_id: userId,
        title: "Facture en retard",
        message:
          "La facture FAC-2024-002 est en retard de paiement. Montant: 10,030 MAD.",
        type: "alert",
        data: { category: "accounting" },
        is_read: false,
        created_at: new Date(
          now.getTime() - 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      {
        organization_id: organizationId,
        user_id: userId,
        title: "Analyse satellite disponible",
        message:
          "Nouvelles données NDVI disponibles pour vos parcelles. Consultez le tableau de bord.",
        type: "info",
        data: { category: "satellite" },
        is_read: false,
        created_at: now.toISOString(),
      },
    ];

    const { error } = await client.from("notifications").insert(notifications);
    if (error) {
      this.logger.error(
        `Failed to create demo notifications: ${error.message}`,
      );
    }
  }

  /**
   * Create demo analyses (soil, plant, water) using the generic analyses table
   */
  private async createDemoAnalyses(
    organizationId: string,
    parcels: any[],
  ): Promise<any[]> {
    if (!parcels?.length) return [];

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const analyses = [
      // Soil analysis for Olives parcel
      {
        organization_id: organizationId,
        parcel_id: parcels[0].id,
        analysis_type: "soil",
        analysis_date: threeMonthsAgo.toISOString().split("T")[0],
        laboratory: "Laboratoire Agronomique du Maroc - Berkane",
        data: {
          ph: 6.8,
          organic_matter: 2.8,
          nitrogen: 0.18,
          phosphorus: 32,
          potassium: 195,
          calcium: 2800,
          magnesium: 380,
          texture: "Argileux",
          cec: 18.5,
          salinity: 0.4,
          recommendations: [
            "Maintenir le niveau de matière organique",
            "Surveiller le pH",
          ],
        },
        notes:
          "Analyse complète du sol - Parcelle Olives - Réf: LAM-SOL-2024-001",
      },
      // Plant tissue analysis for Citrus parcel
      {
        organization_id: organizationId,
        parcel_id: parcels[1].id,
        analysis_type: "plant",
        analysis_date: twoMonthsAgo.toISOString().split("T")[0],
        laboratory: "Laboratoire Phytosanitaire National",
        data: {
          nitrogen_percent: 2.8,
          phosphorus_percent: 0.18,
          potassium_percent: 1.9,
          calcium_percent: 3.2,
          magnesium_percent: 0.35,
          iron_ppm: 85,
          zinc_ppm: 22,
          manganese_ppm: 45,
          boron_ppm: 38,
          copper_ppm: 8,
          chlorophyll_index: 45.2,
          leaf_health: "Bonne",
          pest_presence: "Aucun",
          disease_signs: "Aucun",
        },
        notes:
          "Analyse foliaire agrumes - Diagnostic nutritionnel - Réf: LPN-PLT-2024-015",
      },
      // Water analysis for irrigation system
      {
        organization_id: organizationId,
        parcel_id: parcels[0].id,
        analysis_type: "water",
        analysis_date: oneMonthAgo.toISOString().split("T")[0],
        laboratory: "Laboratoire Qualité des Eaux - ONEP",
        data: {
          ph: 7.2,
          ec: 1.2,
          tds: 768,
          hardness: 280,
          calcium_mg_l: 85,
          magnesium_mg_l: 32,
          sodium_mg_l: 45,
          chloride_mg_l: 78,
          sulfate_mg_l: 120,
          bicarbonate_mg_l: 195,
          nitrate_mg_l: 8.5,
          sar: 1.8,
          classification: "C2-S1",
          suitability: "Bonne pour irrigation",
        },
        notes:
          "Analyse eau d'irrigation - Puits principal - Réf: LQE-EAU-2024-089",
      },
      // Additional soil analysis for Vegetables parcel
      {
        organization_id: organizationId,
        parcel_id: parcels[2].id,
        analysis_type: "soil",
        analysis_date: twoMonthsAgo.toISOString().split("T")[0],
        laboratory: "Laboratoire Agronomique du Maroc - Berkane",
        data: {
          ph: 6.5,
          organic_matter: 3.2,
          nitrogen: 0.22,
          phosphorus: 38,
          potassium: 210,
          calcium: 3100,
          magnesium: 420,
          texture: "Limoneux",
          cec: 22.0,
          salinity: 0.5,
          recommendations: [
            "Excellent pour cultures maraîchères",
            "Maintenir l'apport en matière organique",
          ],
        },
        notes:
          "Analyse complète du sol - Parcelle Légumes - Réf: LAM-SOL-2024-002",
      },
      // Plant analysis for Olives
      {
        organization_id: organizationId,
        parcel_id: parcels[0].id,
        analysis_type: "plant",
        analysis_date: oneMonthAgo.toISOString().split("T")[0],
        laboratory: "Laboratoire Phytosanitaire National",
        data: {
          nitrogen_percent: 1.9,
          phosphorus_percent: 0.12,
          potassium_percent: 1.2,
          calcium_percent: 2.1,
          magnesium_percent: 0.25,
          iron_ppm: 65,
          zinc_ppm: 18,
          manganese_ppm: 35,
          boron_ppm: 28,
          copper_ppm: 6,
          chlorophyll_index: 42.8,
          leaf_health: "Bonne",
          pest_presence: "Aucun",
          disease_signs: "Aucun",
        },
        notes:
          "Analyse foliaire oliviers - État nutritionnel satisfaisant - Réf: LPN-PLT-2024-022",
      },
      // Water analysis for secondary well
      {
        organization_id: organizationId,
        parcel_id: parcels[2].id,
        analysis_type: "water",
        analysis_date: now.toISOString().split("T")[0],
        laboratory: "Laboratoire Qualité des Eaux - ONEP",
        data: {
          ph: 7.0,
          ec: 0.9,
          tds: 576,
          hardness: 210,
          calcium_mg_l: 62,
          magnesium_mg_l: 24,
          sodium_mg_l: 32,
          chloride_mg_l: 55,
          sulfate_mg_l: 85,
          bicarbonate_mg_l: 165,
          nitrate_mg_l: 5.2,
          sar: 1.2,
          classification: "C2-S1",
          suitability: "Excellente pour irrigation",
        },
        notes:
          "Analyse eau d'irrigation - Puits secondaire - Réf: LQE-EAU-2024-102",
      },
    ];

    const { data, error } = await client
      .from("analyses")
      .insert(analyses)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo analyses: ${error.message}`);
      return [];
    }

    return data || [];
  }

  /**
   * Create demo analysis recommendations linked to analyses
   */
  private async createDemoAnalysisRecommendations(
    analyses: any[],
  ): Promise<any[]> {
    if (!analyses?.length) return [];

    const client = this.databaseService.getAdminClient();

    // Find analyses by type
    const soilAnalyses = analyses.filter((a) => a.analysis_type === "soil");
    const plantAnalyses = analyses.filter((a) => a.analysis_type === "plant");
    const waterAnalyses = analyses.filter((a) => a.analysis_type === "water");

    const recommendations: any[] = [];

    // Recommendations for soil analyses
    if (soilAnalyses[0]) {
      recommendations.push(
        {
          analysis_id: soilAnalyses[0].id,
          recommendation_type: "fertilizer",
          priority: "medium",
          title: "Apport d'azote recommandé",
          description:
            "Le taux d'azote est légèrement bas. Un apport d'engrais azoté est recommandé pour optimiser la croissance des oliviers.",
          action_items: [
            {
              action: "Appliquer 200 kg/ha de sulfate d'ammonium",
              deadline: "Avant la floraison",
            },
            {
              action: "Fractionner l'apport en 2 applications",
              deadline: "Mars et Mai",
            },
          ],
          estimated_cost: 1500,
        },
        {
          analysis_id: soilAnalyses[0].id,
          recommendation_type: "amendment",
          priority: "low",
          title: "Maintien de la matière organique",
          description:
            "Le niveau de matière organique est bon mais doit être maintenu par des apports réguliers de compost.",
          action_items: [
            { action: "Apporter 5 tonnes/ha de compost", deadline: "Automne" },
            {
              action: "Enfouir les résidus de taille",
              deadline: "Après taille",
            },
          ],
          estimated_cost: 3000,
        },
      );
    }

    if (soilAnalyses[1]) {
      recommendations.push({
        analysis_id: soilAnalyses[1].id,
        recommendation_type: "general",
        priority: "low",
        title: "Sol en excellent état",
        description:
          "Les paramètres du sol sont optimaux pour les cultures maraîchères. Continuer les pratiques actuelles.",
        action_items: [
          { action: "Maintenir la rotation des cultures", deadline: "Continu" },
          { action: "Conserver le paillage", deadline: "Toute l'année" },
        ],
        estimated_cost: 500,
      });
    }

    // Recommendations for plant analyses
    if (plantAnalyses[0]) {
      recommendations.push(
        {
          analysis_id: plantAnalyses[0].id,
          recommendation_type: "fertilizer",
          priority: "medium",
          title: "Correction carence en zinc",
          description:
            "Le niveau de zinc foliaire est légèrement bas. Une pulvérisation foliaire est recommandée.",
          action_items: [
            {
              action: "Pulvérisation de sulfate de zinc à 0.5%",
              deadline: "Printemps",
            },
            {
              action: "Répéter 2 fois à 15 jours d'intervalle",
              deadline: "Mars-Avril",
            },
          ],
          estimated_cost: 800,
        },
        {
          analysis_id: plantAnalyses[0].id,
          recommendation_type: "pest_management",
          priority: "low",
          title: "Surveillance phytosanitaire",
          description:
            "Aucun problème détecté actuellement. Maintenir la surveillance régulière.",
          action_items: [
            {
              action: "Inspection hebdomadaire des feuilles",
              deadline: "Continu",
            },
            {
              action: "Installer des pièges à phéromones",
              deadline: "Avant floraison",
            },
          ],
          estimated_cost: 400,
        },
      );
    }

    if (plantAnalyses[1]) {
      recommendations.push({
        analysis_id: plantAnalyses[1].id,
        recommendation_type: "general",
        priority: "low",
        title: "État nutritionnel satisfaisant",
        description:
          "Les oliviers présentent un bon état nutritionnel général. Continuer le programme de fertilisation actuel.",
        action_items: [
          {
            action: "Maintenir le programme de fertilisation",
            deadline: "Selon calendrier",
          },
        ],
        estimated_cost: 0,
      });
    }

    // Recommendations for water analyses
    if (waterAnalyses[0]) {
      recommendations.push(
        {
          analysis_id: waterAnalyses[0].id,
          recommendation_type: "irrigation",
          priority: "medium",
          title: "Gestion de la salinité",
          description:
            "La conductivité électrique est modérée. Surveiller l'accumulation de sels dans le sol.",
          action_items: [
            {
              action: "Appliquer des irrigations de lessivage",
              deadline: "Mensuel en été",
            },
            {
              action: "Vérifier le drainage des parcelles",
              deadline: "Avant saison des pluies",
            },
          ],
          estimated_cost: 1200,
        },
        {
          analysis_id: waterAnalyses[0].id,
          recommendation_type: "general",
          priority: "low",
          title: "Eau de bonne qualité",
          description:
            "Classification C2-S1 : eau de bonne qualité pour l'irrigation de la plupart des cultures.",
          action_items: [
            { action: "Analyse annuelle recommandée", deadline: "Janvier" },
          ],
          estimated_cost: 300,
        },
      );
    }

    if (waterAnalyses[1]) {
      recommendations.push({
        analysis_id: waterAnalyses[1].id,
        recommendation_type: "irrigation",
        priority: "low",
        title: "Excellente qualité d'eau",
        description:
          "L'eau du puits secondaire est d'excellente qualité. Aucune action corrective nécessaire.",
        action_items: [
          { action: "Maintenir la surveillance annuelle", deadline: "Janvier" },
        ],
        estimated_cost: 300,
      });
    }

    if (recommendations.length === 0) return [];

    const { data, error } = await client
      .from("analysis_recommendations")
      .insert(recommendations)
      .select();

    if (error) {
      this.logger.error(
        `Failed to create demo analysis recommendations (batch): ${error.message} | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`,
      );
      // Retry one by one
      const inserted = [];
      for (const rec of recommendations) {
        const { data: single, error: singleError } = await client
          .from("analysis_recommendations")
          .insert(rec)
          .select()
          .single();
        if (singleError) {
          this.logger.error(
            `Failed recommendation "${rec.title}": ${singleError.message} | code: ${singleError.code} | hint: ${singleError.hint}`,
          );
        } else if (single) {
          inserted.push(single);
        }
      }
      return inserted;
    }

    return data || [];
  }

  private async createDemoChartOfAccounts(
    organizationId: string,
    userId: string,
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();

    const accounts = [
      {
        code: "2100",
        name: "Immobilisations en non-valeurs",
        account_type: "Asset",
        account_subtype: "Fixed Asset",
        is_group: true,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "2200",
        name: "Immobilisations incorporelles",
        account_type: "Asset",
        account_subtype: "Fixed Asset",
        is_group: true,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "2300",
        name: "Immobilisations corporelles",
        account_type: "Asset",
        account_subtype: "Fixed Asset",
        is_group: true,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "2310",
        name: "Terrains agricoles",
        account_type: "Asset",
        account_subtype: "Fixed Asset",
        is_group: false,
        is_active: true,
        parent_code: "2300",
        currency_code: "MAD",
      },
      {
        code: "2321",
        name: "Bâtiments agricoles",
        account_type: "Asset",
        account_subtype: "Fixed Asset",
        is_group: false,
        is_active: true,
        parent_code: "2300",
        currency_code: "MAD",
      },
      {
        code: "2331",
        name: "Tracteurs et machines agricoles",
        account_type: "Asset",
        account_subtype: "Fixed Asset",
        is_group: false,
        is_active: true,
        parent_code: "2300",
        currency_code: "MAD",
      },
      {
        code: "2332",
        name: "Système d'irrigation",
        account_type: "Asset",
        account_subtype: "Fixed Asset",
        is_group: false,
        is_active: true,
        parent_code: "2300",
        currency_code: "MAD",
      },
      {
        code: "2340",
        name: "Matériel de transport",
        account_type: "Asset",
        account_subtype: "Fixed Asset",
        is_group: false,
        is_active: true,
        parent_code: "2300",
        currency_code: "MAD",
      },
      {
        code: "2362",
        name: "Plantations permanentes",
        account_type: "Asset",
        account_subtype: "Fixed Asset",
        is_group: false,
        is_active: true,
        parent_code: "2300",
        currency_code: "MAD",
      },
      {
        code: "2800",
        name: "Amortissements",
        account_type: "Asset",
        account_subtype: "Accumulated Depreciation",
        is_group: true,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "2832",
        name: "Amortissements bâtiments",
        account_type: "Asset",
        account_subtype: "Accumulated Depreciation",
        is_group: false,
        is_active: true,
        parent_code: "2800",
        currency_code: "MAD",
      },
      {
        code: "2834",
        name: "Amortissements matériel",
        account_type: "Asset",
        account_subtype: "Accumulated Depreciation",
        is_group: false,
        is_active: true,
        parent_code: "2800",
        currency_code: "MAD",
      },
      {
        code: "3100",
        name: "Stocks matières premières",
        account_type: "Asset",
        account_subtype: "Inventory",
        is_group: true,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "3110",
        name: "Semences et plants",
        account_type: "Asset",
        account_subtype: "Inventory",
        is_group: false,
        is_active: true,
        parent_code: "3100",
        currency_code: "MAD",
      },
      {
        code: "3111",
        name: "Engrais et amendements",
        account_type: "Asset",
        account_subtype: "Inventory",
        is_group: false,
        is_active: true,
        parent_code: "3100",
        currency_code: "MAD",
      },
      {
        code: "3112",
        name: "Produits phytosanitaires",
        account_type: "Asset",
        account_subtype: "Inventory",
        is_group: false,
        is_active: true,
        parent_code: "3100",
        currency_code: "MAD",
      },
      {
        code: "3500",
        name: "Produits finis",
        account_type: "Asset",
        account_subtype: "Inventory",
        is_group: true,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "3510",
        name: "Récoltes",
        account_type: "Asset",
        account_subtype: "Inventory",
        is_group: false,
        is_active: true,
        parent_code: "3500",
        currency_code: "MAD",
      },
      {
        code: "3420",
        name: "Clients",
        account_type: "Asset",
        account_subtype: "Receivable",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "3421",
        name: "Clients - ventes agricoles",
        account_type: "Asset",
        account_subtype: "Receivable",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "4410",
        name: "Fournisseurs",
        account_type: "Liability",
        account_subtype: "Payable",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "4411",
        name: "Fournisseurs - intrants agricoles",
        account_type: "Liability",
        account_subtype: "Payable",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "4430",
        name: "Sécurité sociale (CNSS)",
        account_type: "Liability",
        account_subtype: "Payable",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "4431",
        name: "Rémunérations dues au personnel",
        account_type: "Liability",
        account_subtype: "Payable",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "4455",
        name: "TVA due",
        account_type: "Liability",
        account_subtype: "Payable",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "4456",
        name: "TVA déductible",
        account_type: "Asset",
        account_subtype: "Receivable",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "5141",
        name: "Banque - Compte courant",
        account_type: "Asset",
        account_subtype: "Cash",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "5161",
        name: "Caisse principale",
        account_type: "Asset",
        account_subtype: "Cash",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "5162",
        name: "Caisse ferme",
        account_type: "Asset",
        account_subtype: "Cash",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "6000",
        name: "Charges d'exploitation",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: true,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "6110",
        name: "Achats de semences et plants",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: false,
        is_active: true,
        parent_code: "6000",
        currency_code: "MAD",
      },
      {
        code: "6111",
        name: "Achats d'engrais",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: false,
        is_active: true,
        parent_code: "6000",
        currency_code: "MAD",
      },
      {
        code: "6112",
        name: "Achats de produits phytosanitaires",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: false,
        is_active: true,
        parent_code: "6000",
        currency_code: "MAD",
      },
      {
        code: "6121",
        name: "Eau d'irrigation",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: false,
        is_active: true,
        parent_code: "6000",
        currency_code: "MAD",
      },
      {
        code: "6124",
        name: "Carburants et lubrifiants",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: false,
        is_active: true,
        parent_code: "6000",
        currency_code: "MAD",
      },
      {
        code: "6167",
        name: "Électricité",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: false,
        is_active: true,
        parent_code: "6000",
        currency_code: "MAD",
      },
      {
        code: "6171",
        name: "Charges de personnel",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: true,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "6174",
        name: "Salaires ouvriers agricoles",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: false,
        is_active: true,
        parent_code: "6171",
        currency_code: "MAD",
      },
      {
        code: "6175",
        name: "Salaires personnel administratif",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: false,
        is_active: true,
        parent_code: "6171",
        currency_code: "MAD",
      },
      {
        code: "6176",
        name: "Charges sociales",
        account_type: "Expense",
        account_subtype: "Operating Expense",
        is_group: false,
        is_active: true,
        parent_code: "6171",
        currency_code: "MAD",
      },
      {
        code: "7000",
        name: "Produits d'exploitation",
        account_type: "Income",
        account_subtype: "Operating Revenue",
        is_group: true,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "7111",
        name: "Ventes de récoltes",
        account_type: "Income",
        account_subtype: "Operating Revenue",
        is_group: false,
        is_active: true,
        parent_code: "7000",
        currency_code: "MAD",
      },
      {
        code: "7112",
        name: "Ventes de fruits et légumes",
        account_type: "Income",
        account_subtype: "Operating Revenue",
        is_group: false,
        is_active: true,
        parent_code: "7000",
        currency_code: "MAD",
      },
      {
        code: "7113",
        name: "Ventes d'huile d'olive",
        account_type: "Income",
        account_subtype: "Operating Revenue",
        is_group: false,
        is_active: true,
        parent_code: "7000",
        currency_code: "MAD",
      },
      {
        code: "7580",
        name: "Autres produits d'exploitation",
        account_type: "Income",
        account_subtype: "Operating Revenue",
        is_group: false,
        is_active: true,
        parent_code: "7000",
        currency_code: "MAD",
      },
      {
        code: "1100",
        name: "Capital social",
        account_type: "Equity",
        account_subtype: "Capital",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "1190",
        name: "Report à nouveau",
        account_type: "Equity",
        account_subtype: "Retained Earnings",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
      {
        code: "1200",
        name: "Résultat de l'exercice",
        account_type: "Equity",
        account_subtype: "Current Year Earnings",
        is_group: false,
        is_active: true,
        currency_code: "MAD",
      },
    ];

    const accountsToInsert = accounts.map((acc) => ({
      organization_id: organizationId,
      code: acc.code,
      name: acc.name,
      account_type: acc.account_type,
      account_subtype: acc.account_subtype,
      is_group: acc.is_group,
      is_active: acc.is_active,
      currency_code: acc.currency_code,
      is_default_chart: true,
      created_by: userId,
    }));

    const { data: createdAccounts, error } = await client
      .from("accounts")
      .insert(accountsToInsert)
      .select();

    if (error) {
      this.logger.error(
        `Failed to create demo chart of accounts: ${error.message}`,
      );
      return [];
    }

    const accountsWithParent = accounts.filter((a) => a.parent_code);
    for (const acc of accountsWithParent) {
      const parent = createdAccounts?.find((p) => p.code === acc.parent_code);
      const child = createdAccounts?.find((c) => c.code === acc.code);
      if (parent && child) {
        await client
          .from("accounts")
          .update({ parent_id: parent.id })
          .eq("id", child.id);
      }
    }

    return createdAccounts || [];
  }

  private async createDemoCertifications(
    organizationId: string,
    userId: string,
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const twoYearsFromNow = new Date(now);
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const threeMonthsFromNow = new Date(now);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const eighteenMonthsAgo = new Date(now);
    eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
    const nineMonthsAgo = new Date(now);
    nineMonthsAgo.setMonth(nineMonthsAgo.getMonth() - 9);
    const threeYearsFromNow = new Date(now);
    threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3);

    const certifications = [
      {
        organization_id: organizationId,
        certification_type: "GlobalGAP",
        certification_number: "GGN-4052852789-MA",
        issued_date: oneYearAgo.toISOString().split("T")[0],
        expiry_date: oneYearFromNow.toISOString().split("T")[0],
        status: "active",
        issuing_body: "GLOBALG.A.P. c/o FoodPLUS GmbH",
        scope:
          "Production de fruits et légumes frais - Agrumes, Olives, Tomates",
        documents: [
          {
            url: "/docs/globalgap-certificate.pdf",
            type: "certificate",
            uploaded_at: oneYearAgo.toISOString(),
          },
          {
            url: "/docs/globalgap-audit-report.pdf",
            type: "audit_report",
            uploaded_at: oneYearAgo.toISOString(),
          },
        ],
        audit_schedule: {
          next_audit_date: sixMonthsFromNow.toISOString().split("T")[0],
          audit_frequency: "Annual",
          auditor_name: "Bureau Veritas Maroc",
        },
        created_by: userId,
      },
      {
        organization_id: organizationId,
        certification_type: "Organic",
        certification_number: "BIO-MA-2024-00789",
        issued_date: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        expiry_date: twoYearsFromNow.toISOString().split("T")[0],
        status: "active",
        issuing_body: "Ecocert Maroc",
        scope: "Agriculture biologique - Oliviers (10 ha), Agrumes (8 ha)",
        documents: [
          {
            url: "/docs/bio-certificate.pdf",
            type: "certificate",
            uploaded_at: new Date(
              now.getTime() - 180 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
          {
            url: "/docs/ecocert-inspection-report.pdf",
            type: "inspection_report",
            uploaded_at: new Date(
              now.getTime() - 170 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
        audit_schedule: {
          next_audit_date: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          audit_frequency: "Annual",
          auditor_name: "Ecocert Maroc",
        },
        created_by: userId,
      },
      {
        organization_id: organizationId,
        certification_type: "HACCP",
        certification_number: "HACCP-MA-2023-04521",
        issued_date: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        expiry_date: threeMonthsFromNow.toISOString().split("T")[0],
        status: "pending_renewal",
        issuing_body: "SGS Maroc",
        scope:
          "Système de gestion de la sécurité alimentaire - Conditionnement et stockage",
        documents: [
          {
            url: "/docs/haccp-certificate.pdf",
            type: "certificate",
            uploaded_at: new Date(
              now.getTime() - 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
        audit_schedule: {
          next_audit_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          audit_frequency: "Annual",
          auditor_name: "SGS Maroc",
        },
        created_by: userId,
      },
      {
        organization_id: organizationId,
        certification_type: "ISO 22000",
        certification_number: "ISO22000-MA-2024-12345",
        issued_date: nineMonthsAgo.toISOString().split("T")[0],
        expiry_date: twoYearsFromNow.toISOString().split("T")[0],
        status: "active",
        issuing_body: "Bureau Veritas Certification",
        scope: "Système de management de la sécurité des denrées alimentaires",
        documents: [
          {
            url: "/docs/iso22000-certificate.pdf",
            type: "certificate",
            uploaded_at: nineMonthsAgo.toISOString(),
          },
          {
            url: "/docs/iso22000-management-review.pdf",
            type: "management_review",
            uploaded_at: new Date(
              now.getTime() - 90 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
        audit_schedule: {
          next_audit_date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          audit_frequency: "Annual surveillance, 3-year recertification",
          auditor_name: "Bureau Veritas Certification",
        },
        created_by: userId,
      },
      {
        organization_id: organizationId,
        certification_type: "Rainforest Alliance",
        certification_number: "RA-MA-2023-56789",
        issued_date: eighteenMonthsAgo.toISOString().split("T")[0],
        expiry_date: sixMonthsFromNow.toISOString().split("T")[0],
        status: "active",
        issuing_body: "Rainforest Alliance Certified",
        scope:
          "Production durable - Conservation biodiversité et bien-être des travailleurs",
        documents: [
          {
            url: "/docs/rainforest-alliance-certificate.pdf",
            type: "certificate",
            uploaded_at: eighteenMonthsAgo.toISOString(),
          },
        ],
        audit_schedule: {
          next_audit_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          audit_frequency: "Annual",
          auditor_name: "SCS Global Services",
        },
        created_by: userId,
      },
      {
        organization_id: organizationId,
        certification_type: "Fairtrade",
        certification_number: "FLO-MA-2024-34567",
        issued_date: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        expiry_date: threeYearsFromNow.toISOString().split("T")[0],
        status: "active",
        issuing_body: "Fairtrade International (FLO)",
        scope: "Commerce équitable - Agrumes et huile d'olive",
        documents: [
          {
            url: "/docs/fairtrade-certificate.pdf",
            type: "certificate",
            uploaded_at: new Date(
              now.getTime() - 120 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
          {
            url: "/docs/fairtrade-premium-report.pdf",
            type: "premium_report",
            uploaded_at: new Date(
              now.getTime() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
        audit_schedule: {
          next_audit_date: new Date(now.getTime() + 240 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          audit_frequency: "Annual",
          auditor_name: "FLOCERT",
        },
        created_by: userId,
      },
      {
        organization_id: organizationId,
        certification_type: "Maroc Label",
        certification_number: "ML-BERKANE-2024-001",
        issued_date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        expiry_date: oneYearFromNow.toISOString().split("T")[0],
        status: "active",
        issuing_body:
          "Office National de Sécurité Sanitaire des Produits Alimentaires (ONSSA)",
        scope: "Indication géographique protégée - Clémentine de Berkane",
        documents: [
          {
            url: "/docs/maroc-label-certificate.pdf",
            type: "certificate",
            uploaded_at: new Date(
              now.getTime() - 60 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
        audit_schedule: {
          next_audit_date: new Date(now.getTime() + 300 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          audit_frequency: "Annual",
          auditor_name: "ONSSA Inspection",
        },
        created_by: userId,
      },
      {
        organization_id: organizationId,
        certification_type: "BRC Food Safety",
        certification_number: "BRC-MA-2022-78901",
        issued_date: twoYearsAgo.toISOString().split("T")[0],
        expiry_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        status: "expired",
        issuing_body: "British Retail Consortium (BRC)",
        scope: "Global Standard for Food Safety - Export vers UK/EU",
        documents: [
          {
            url: "/docs/brc-certificate-expired.pdf",
            type: "certificate",
            uploaded_at: twoYearsAgo.toISOString(),
          },
        ],
        audit_schedule: {
          next_audit_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          audit_frequency: "Annual",
          auditor_name: "Intertek Testing Services",
        },
        created_by: userId,
      },
      {
        organization_id: organizationId,
        certification_type: "IFS Food",
        certification_number: "IFS-APP-2024-001",
        issued_date: null,
        expiry_date: null,
        status: "pending",
        issuing_body: "IFS Management GmbH",
        scope:
          "International Featured Standards - Transformation et conditionnement",
        documents: [
          {
            url: "/docs/ifs-application-form.pdf",
            type: "application",
            uploaded_at: new Date(
              now.getTime() - 14 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
        audit_schedule: {
          next_audit_date: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          audit_frequency: "Initial certification audit planned",
          auditor_name: "TÜV SÜD",
        },
        created_by: userId,
      },
    ];

    const { data, error } = await client
      .from("certifications")
      .insert(certifications)
      .select();

    if (error) {
      this.logger.error(
        `Failed to create demo certifications: ${error.message}`,
      );
      return [];
    }

    return data || [];
  }

  private async createDemoComplianceChecks(
    organizationId: string,
    certifications: any[],
    userId: string,
  ): Promise<any[]> {
    if (!certifications?.length) return [];

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const globalGapCert = certifications.find(
      (c) => c.certification_type === "GlobalGAP",
    );
    const organicCert = certifications.find(
      (c) => c.certification_type === "Organic",
    );
    const haccpCert = certifications.find(
      (c) => c.certification_type === "HACCP",
    );

    const checks: any[] = [];

    if (globalGapCert) {
      checks.push(
        {
          organization_id: organizationId,
          certification_id: globalGapCert.id,
          check_type: "traceability",
          check_date: twoMonthsAgo.toISOString().split("T")[0],
          status: "compliant",
          findings: [],
          corrective_actions: [],
          auditor_name: "Jean-Pierre Audit",
          score: 95,
          created_by: userId,
        },
        {
          organization_id: organizationId,
          certification_id: globalGapCert.id,
          check_type: "pesticide_usage",
          check_date: oneMonthAgo.toISOString().split("T")[0],
          status: "compliant",
          findings: [
            {
              requirement_code: "CB.7.1",
              finding_description: "Documentation complète des traitements",
              severity: "low",
            },
          ],
          corrective_actions: [],
          auditor_name: "Ahmed Contrôleur",
          score: 92,
          created_by: userId,
        },
        {
          organization_id: organizationId,
          certification_id: globalGapCert.id,
          check_type: "record_keeping",
          check_date: now.toISOString().split("T")[0],
          status: "needs_review",
          findings: [
            {
              requirement_code: "AF.1.2.1",
              finding_description: "Registres de traçabilité à mettre à jour",
              severity: "medium",
            },
          ],
          corrective_actions: [
            {
              action_description: "Mettre à jour les registres de traçabilité",
              due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              responsible_person: "Gestionnaire de ferme",
              status: "in_progress",
            },
          ],
          auditor_name: "Ahmed Contrôleur",
          score: 78,
          created_by: userId,
        },
      );
    }

    if (organicCert) {
      checks.push(
        {
          organization_id: organizationId,
          certification_id: organicCert.id,
          check_type: "environmental",
          check_date: threeMonthsAgo.toISOString().split("T")[0],
          status: "compliant",
          findings: [],
          corrective_actions: [],
          auditor_name: "Marie Bio-Contrôle",
          score: 98,
          created_by: userId,
        },
        {
          organization_id: organizationId,
          certification_id: organicCert.id,
          check_type: "record_keeping",
          check_date: oneMonthAgo.toISOString().split("T")[0],
          status: "compliant",
          findings: [],
          corrective_actions: [],
          auditor_name: "Marie Bio-Contrôle",
          score: 100,
          created_by: userId,
        },
      );
    }

    if (haccpCert) {
      checks.push(
        {
          organization_id: organizationId,
          certification_id: haccpCert.id,
          check_type: "quality_control",
          check_date: twoMonthsAgo.toISOString().split("T")[0],
          status: "non_compliant",
          findings: [
            {
              requirement_code: "HACCP.3.1",
              finding_description: "Procédures de nettoyage non documentées",
              severity: "high",
            },
            {
              requirement_code: "HACCP.4.2",
              finding_description: "Formation du personnel à renouveler",
              severity: "medium",
            },
          ],
          corrective_actions: [
            {
              action_description:
                "Documenter toutes les procédures de nettoyage",
              due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              responsible_person: "Responsable qualité",
              status: "completed",
            },
            {
              action_description: "Organiser formation HACCP pour le personnel",
              due_date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              responsible_person: "RH",
              status: "pending",
            },
          ],
          auditor_name: "Pierre Qualité",
          score: 65,
          created_by: userId,
        },
        {
          organization_id: organizationId,
          certification_id: haccpCert.id,
          check_type: "worker_safety",
          check_date: now.toISOString().split("T")[0],
          status: "in_progress",
          findings: [],
          corrective_actions: [],
          auditor_name: "Pierre Qualité",
          created_by: userId,
        },
      );
    }

    if (checks.length === 0) return [];

    const { data, error } = await client
      .from("compliance_checks")
      .insert(checks)
      .select();

    if (error) {
      this.logger.error(
        `Failed to create demo compliance checks: ${error.message}`,
      );
      return [];
    }

    return data || [];
  }

  private async createDemoCropCycles(
    organizationId: string,
    farmId: string,
    parcels: any[],
    campaigns: any[],
    userId: string,
  ): Promise<any[]> {
    if (!parcels?.length) return [];

    const client = this.databaseService.getAdminClient();
    const now = new Date();
    const currentYear = now.getFullYear();

    const { data: fiscalYear } = await client
      .from("fiscal_years")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("is_current", true)
      .single();

    const agrumesCampaign = campaigns?.find((c) => c.name?.includes("Agrumes") && c.status === "active");
    const olivesCampaign = campaigns?.find((c) => c.name?.includes("Olives") && c.status !== "completed" && c.status !== "cancelled");
    const tomatoesCampaign = campaigns?.find((c) => c.name?.includes("Tomates Été"));

    const previousYear = currentYear - 1;
    const twoYearsAgo = currentYear - 2;

    const cropCycles = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0]?.id,
        crop_type: "Olives",
        variety_name: "Picholine Marocaine",
        cycle_code: `OLV-${currentYear}-001`,
        cycle_name: `Campagne Olives ${currentYear}`,
        campaign_id: olivesCampaign?.id || null,
        fiscal_year_id: fiscalYear?.id || null,
        season: "automne",
        land_prep_date: `${currentYear}-08-01`,
        planting_date: null,
        expected_harvest_start: `${currentYear}-11-01`,
        expected_harvest_end: `${currentYear}-12-31`,
        status: now.getMonth() >= 10 ? "harvesting" : "growing",
        planted_area_ha: 10,
        expected_yield_per_ha: 5000,
        expected_total_yield: 50000,
        yield_unit: "kg",
        total_costs: 45000,
        total_revenue: 0,
        notes: "Cycle de production olives - Variété Picholine",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1]?.id,
        crop_type: "Agrumes",
        variety_name: "Clémentine Nules",
        cycle_code: `AGR-${currentYear}-001`,
        cycle_name: `Campagne Agrumes ${currentYear}`,
        campaign_id: agrumesCampaign?.id || null,
        fiscal_year_id: fiscalYear?.id || null,
        season: "hiver",
        land_prep_date: `${currentYear}-01-15`,
        planting_date: null,
        expected_harvest_start: `${currentYear}-11-15`,
        expected_harvest_end: `${currentYear + 1}-02-28`,
        actual_harvest_start:
          now.getMonth() >= 10 ? `${currentYear}-11-20` : null,
        status: now.getMonth() >= 10 ? "harvesting" : "growing",
        planted_area_ha: 8,
        expected_yield_per_ha: 25000,
        expected_total_yield: 200000,
        actual_yield_per_ha: now.getMonth() >= 10 ? 24500 : null,
        actual_total_yield: now.getMonth() >= 10 ? 50000 : null,
        yield_unit: "kg",
        average_quality_grade: "A",
        total_costs: 85000,
        total_revenue: now.getMonth() >= 10 ? 62500 : 0,
        notes: "Cycle de production agrumes - Récolte en cours",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2]?.id,
        crop_type: "Tomates",
        variety_name: "Marmande",
        cycle_code: `TOM-${currentYear}-001`,
        cycle_name: `Campagne Tomates Été ${currentYear}`,
        campaign_id: tomatoesCampaign?.id || null,
        fiscal_year_id: fiscalYear?.id || null,
        season: "été",
        land_prep_date: `${currentYear}-03-15`,
        planting_date: `${currentYear}-04-01`,
        expected_harvest_start: `${currentYear}-06-15`,
        expected_harvest_end: `${currentYear}-09-30`,
        actual_harvest_start: `${currentYear}-06-20`,
        actual_harvest_end: now.getMonth() >= 9 ? `${currentYear}-09-25` : null,
        cycle_closed_date: now.getMonth() >= 9 ? `${currentYear}-10-01` : null,
        status: now.getMonth() >= 9 ? "completed" : "harvesting",
        planted_area_ha: 7,
        harvested_area_ha: 7,
        expected_yield_per_ha: 60000,
        expected_total_yield: 420000,
        actual_yield_per_ha: 58000,
        actual_total_yield: 406000,
        yield_unit: "kg",
        average_quality_grade: "A",
        quality_notes: "Excellente qualité, calibre homogène",
        total_costs: 38000,
        total_revenue: 162400,
        net_profit: 124400,
        cost_per_ha: 5428.57,
        revenue_per_ha: 23200,
        profit_margin: 76.6,
        notes:
          "Cycle terminé avec succès - Rendement légèrement inférieur aux prévisions",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2]?.id,
        crop_type: "Tomates",
        variety_name: "Roma",
        cycle_code: `TOM-${currentYear + 1}-001`,
        cycle_name: `Campagne Tomates Hiver ${currentYear + 1}`,
        fiscal_year_id: fiscalYear?.id || null,
        season: "hiver",
        land_prep_date: `${currentYear}-10-15`,
        planting_date: `${currentYear}-11-01`,
        expected_harvest_start: `${currentYear + 1}-02-01`,
        expected_harvest_end: `${currentYear + 1}-04-30`,
        status: "land_prep",
        planted_area_ha: 7,
        expected_yield_per_ha: 50000,
        expected_total_yield: 350000,
        yield_unit: "kg",
        total_costs: 15000,
        notes: "Préparation du sol en cours pour culture sous serre",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0]?.id,
        crop_type: "Avocats",
        variety_name: "Hass",
        cycle_code: `AVO-${currentYear}-001`,
        cycle_name: `Cycle Avocats ${currentYear}`,
        fiscal_year_id: fiscalYear?.id || null,
        season: "été",
        land_prep_date: `${currentYear}-01-01`,
        expected_harvest_start: `${currentYear}-05-01`,
        expected_harvest_end: `${currentYear}-09-30`,
        actual_harvest_start: `${currentYear}-05-15`,
        status: now.getMonth() >= 9 ? "completed" : "harvesting",
        planted_area_ha: 4,
        harvested_area_ha: now.getMonth() >= 9 ? 4 : 2.5,
        expected_yield_per_ha: 12000,
        expected_total_yield: 48000,
        actual_yield_per_ha: 11500,
        actual_total_yield: now.getMonth() >= 9 ? 46000 : 28750,
        yield_unit: "kg",
        average_quality_grade: "A",
        total_costs: 65000,
        total_revenue: now.getMonth() >= 9 ? 138000 : 86250,
        notes: "Verger jeune - 3ème année de production",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1]?.id,
        crop_type: "Grenades",
        variety_name: "Wonderful",
        cycle_code: `GRN-${currentYear}-001`,
        cycle_name: `Cycle Grenades ${currentYear}`,
        fiscal_year_id: fiscalYear?.id || null,
        season: "automne",
        land_prep_date: `${currentYear}-07-01`,
        expected_harvest_start: `${currentYear}-09-15`,
        expected_harvest_end: `${currentYear}-11-15`,
        status: now.getMonth() >= 8 ? "harvesting" : "flowering",
        planted_area_ha: 3,
        expected_yield_per_ha: 18000,
        expected_total_yield: 54000,
        yield_unit: "kg",
        total_costs: 28000,
        notes: "Production export - Calibre premium",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2]?.id,
        crop_type: "Haricots verts",
        variety_name: "Kenya",
        cycle_code: `HRV-${currentYear}-001`,
        cycle_name: `Cycle Haricots Printemps ${currentYear}`,
        fiscal_year_id: fiscalYear?.id || null,
        season: "printemps",
        land_prep_date: `${currentYear}-02-15`,
        planting_date: `${currentYear}-03-01`,
        expected_harvest_start: `${currentYear}-04-15`,
        expected_harvest_end: `${currentYear}-06-15`,
        actual_harvest_start: `${currentYear}-04-20`,
        actual_harvest_end: `${currentYear}-06-10`,
        cycle_closed_date: `${currentYear}-06-20`,
        status: "completed",
        planted_area_ha: 5,
        harvested_area_ha: 5,
        expected_yield_per_ha: 8000,
        expected_total_yield: 40000,
        actual_yield_per_ha: 8500,
        actual_total_yield: 42500,
        yield_unit: "kg",
        average_quality_grade: "Extra",
        quality_notes: "Calibre fin, sans fil - Export France",
        total_costs: 16200,
        total_revenue: 42500,
        net_profit: 26300,
        cost_per_ha: 3240,
        revenue_per_ha: 8500,
        profit_margin: 61.9,
        notes: "Excellent cycle - Contrat export respecté",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0]?.id,
        crop_type: "Olives",
        variety_name: "Picholine Marocaine",
        cycle_code: `OLV-${previousYear}-001`,
        cycle_name: `Campagne Olives ${previousYear}`,
        fiscal_year_id: fiscalYear?.id || null,
        season: "automne",
        land_prep_date: `${previousYear}-08-01`,
        expected_harvest_start: `${previousYear}-11-01`,
        expected_harvest_end: `${previousYear}-12-31`,
        actual_harvest_start: `${previousYear}-11-05`,
        actual_harvest_end: `${previousYear}-12-20`,
        cycle_closed_date: `${previousYear}-12-28`,
        status: "completed",
        planted_area_ha: 10,
        harvested_area_ha: 10,
        expected_yield_per_ha: 4800,
        expected_total_yield: 48000,
        actual_yield_per_ha: 4800,
        actual_total_yield: 48000,
        yield_unit: "kg",
        average_quality_grade: "A",
        quality_notes: "Rendement huile 18% - Extra vierge",
        total_costs: 72000,
        total_revenue: 158000,
        net_profit: 86000,
        cost_per_ha: 7200,
        revenue_per_ha: 15800,
        profit_margin: 54.4,
        notes: "Bonne saison - Qualité huile excellente",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1]?.id,
        crop_type: "Agrumes",
        variety_name: "Clémentine Nules",
        cycle_code: `AGR-${previousYear}-001`,
        cycle_name: `Campagne Agrumes ${previousYear}`,
        fiscal_year_id: fiscalYear?.id || null,
        season: "hiver",
        land_prep_date: `${previousYear}-01-15`,
        expected_harvest_start: `${previousYear}-11-15`,
        expected_harvest_end: `${currentYear}-02-28`,
        actual_harvest_start: `${previousYear}-11-18`,
        actual_harvest_end: `${currentYear}-02-15`,
        cycle_closed_date: `${currentYear}-03-01`,
        status: "completed",
        planted_area_ha: 8,
        harvested_area_ha: 8,
        expected_yield_per_ha: 24000,
        expected_total_yield: 192000,
        actual_yield_per_ha: 23125,
        actual_total_yield: 185000,
        yield_unit: "kg",
        average_quality_grade: "A",
        quality_notes: "IGP Clémentine de Berkane - Export UE",
        total_costs: 128000,
        total_revenue: 245000,
        net_profit: 117000,
        cost_per_ha: 16000,
        revenue_per_ha: 30625,
        profit_margin: 47.8,
        notes: "Excellente saison - Prix export favorable",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2]?.id,
        crop_type: "Tomates",
        variety_name: "Marmande",
        cycle_code: `TOM-${previousYear}-001`,
        cycle_name: `Campagne Tomates ${previousYear}`,
        fiscal_year_id: fiscalYear?.id || null,
        season: "été",
        land_prep_date: `${previousYear}-03-10`,
        planting_date: `${previousYear}-04-01`,
        expected_harvest_start: `${previousYear}-06-15`,
        expected_harvest_end: `${previousYear}-09-30`,
        actual_harvest_start: `${previousYear}-06-18`,
        actual_harvest_end: `${previousYear}-09-20`,
        cycle_closed_date: `${previousYear}-10-01`,
        status: "completed",
        planted_area_ha: 7,
        harvested_area_ha: 7,
        expected_yield_per_ha: 58000,
        expected_total_yield: 406000,
        actual_yield_per_ha: 56429,
        actual_total_yield: 395000,
        yield_unit: "kg",
        average_quality_grade: "A",
        quality_notes: "Légère baisse rendement - Canicule juillet",
        total_costs: 39500,
        total_revenue: 92000,
        net_profit: 52500,
        cost_per_ha: 5643,
        revenue_per_ha: 13143,
        profit_margin: 57.1,
        notes: "Bonne saison malgré stress thermique",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2]?.id,
        crop_type: "Melons",
        variety_name: "Charentais",
        cycle_code: `MEL-${previousYear}-001`,
        cycle_name: `Cycle Melons ${previousYear}`,
        fiscal_year_id: fiscalYear?.id || null,
        season: "été",
        land_prep_date: `${previousYear}-04-15`,
        planting_date: `${previousYear}-05-01`,
        expected_harvest_start: `${previousYear}-07-01`,
        expected_harvest_end: `${previousYear}-08-31`,
        actual_harvest_start: `${previousYear}-07-05`,
        actual_harvest_end: `${previousYear}-08-25`,
        cycle_closed_date: `${previousYear}-09-05`,
        status: "completed",
        planted_area_ha: 4,
        harvested_area_ha: 4,
        expected_yield_per_ha: 10000,
        expected_total_yield: 40000,
        actual_yield_per_ha: 8000,
        actual_total_yield: 32000,
        yield_unit: "kg",
        average_quality_grade: "B",
        quality_notes: "Calibre réduit - Stress hydrique",
        total_costs: 28500,
        total_revenue: 48000,
        net_profit: 19500,
        cost_per_ha: 7125,
        revenue_per_ha: 12000,
        profit_margin: 40.6,
        notes: "Rendement inférieur aux attentes - Sécheresse",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0]?.id,
        crop_type: "Olives",
        variety_name: "Picholine Marocaine",
        cycle_code: `OLV-${twoYearsAgo}-001`,
        cycle_name: `Campagne Olives ${twoYearsAgo}`,
        fiscal_year_id: fiscalYear?.id || null,
        season: "automne",
        land_prep_date: `${twoYearsAgo}-08-01`,
        expected_harvest_start: `${twoYearsAgo}-11-01`,
        expected_harvest_end: `${twoYearsAgo}-12-31`,
        actual_harvest_start: `${twoYearsAgo}-10-28`,
        actual_harvest_end: `${twoYearsAgo}-12-15`,
        cycle_closed_date: `${twoYearsAgo}-12-22`,
        status: "completed",
        planted_area_ha: 10,
        harvested_area_ha: 10,
        expected_yield_per_ha: 4500,
        expected_total_yield: 45000,
        actual_yield_per_ha: 5200,
        actual_total_yield: 52000,
        yield_unit: "kg",
        average_quality_grade: "A",
        quality_notes: "Année record - Conditions idéales",
        total_costs: 68000,
        total_revenue: 172000,
        net_profit: 104000,
        cost_per_ha: 6800,
        revenue_per_ha: 17200,
        profit_margin: 60.5,
        notes: "Année exceptionnelle - Record de production",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1]?.id,
        crop_type: "Agrumes",
        variety_name: "Clémentine Nules",
        cycle_code: `AGR-${twoYearsAgo}-001`,
        cycle_name: `Campagne Agrumes ${twoYearsAgo}`,
        fiscal_year_id: fiscalYear?.id || null,
        season: "hiver",
        land_prep_date: `${twoYearsAgo}-01-15`,
        expected_harvest_start: `${twoYearsAgo}-11-15`,
        expected_harvest_end: `${previousYear}-02-28`,
        actual_harvest_start: `${twoYearsAgo}-11-20`,
        actual_harvest_end: `${previousYear}-02-10`,
        cycle_closed_date: `${previousYear}-02-20`,
        status: "completed",
        planted_area_ha: 8,
        harvested_area_ha: 6.8,
        expected_yield_per_ha: 24000,
        expected_total_yield: 192000,
        actual_yield_per_ha: 24265,
        actual_total_yield: 165000,
        yield_unit: "kg",
        average_quality_grade: "B",
        quality_notes: "Perte 15% verger Est - Gel février",
        total_costs: 125000,
        total_revenue: 198000,
        net_profit: 73000,
        cost_per_ha: 15625,
        revenue_per_ha: 24750,
        profit_margin: 36.9,
        notes: "Gel tardif février - Sinistre partiel",
        created_by: userId,
      },
    ];

    const { data, error } = await client
      .from("crop_cycles")
      .insert(cropCycles)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo crop cycles: ${error.message}`);
      return [];
    }

    return data || [];
  }
}
