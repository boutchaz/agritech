import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";

@Injectable()
export class ProductionSeedService {
  private readonly logger = new Logger(ProductionSeedService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create demo harvests
   */
  async createDemoHarvests(
    organizationId: string,
    farmId: string,
    parcels: any[],
    workers: any[],
    userId: string,
  ) {
    if (parcels.length === 0 || workers.length === 0) {
      this.logger.warn("Cannot create harvests: missing parcels or workers");
      return [];
    }

    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const harvests = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        harvest_number: "REC-2024-001",
        harvest_date: twoMonthsAgo.toISOString().split("T")[0],
        parcel_id: parcels[0].id,
        parcel_name: parcels[0].name,
        crop_type: "Clémentines",
        variety: "Clementine Nules",
        harvest_type: "Main Harvest",
        estimated_quantity: 15000,
        actual_quantity: 14250,
        unit: "kg",
        quality_grade: "A",
        status: "Completed",
        notes: "Récolte principale clémentines",
        completed_at: twoMonthsAgo.toISOString(),
        completed_by: workers[0].id,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        harvest_number: "REC-2024-002",
        harvest_date: oneMonthAgo.toISOString().split("T")[0],
        parcel_id: parcels[1].id,
        parcel_name: parcels[1].name,
        crop_type: "Oranges",
        variety: "Navel Late",
        harvest_type: "Main Harvest",
        estimated_quantity: 12000,
        actual_quantity: 11800,
        unit: "kg",
        quality_grade: "A",
        status: "Completed",
        notes: "Récolte principale oranges navel",
        completed_at: oneMonthAgo.toISOString(),
        completed_by: workers[1].id,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        harvest_number: "REC-2024-003",
        harvest_date: threeWeeksAgo.toISOString().split("T")[0],
        parcel_id: parcels[2].id,
        parcel_name: parcels[2].name,
        crop_type: "Tomates",
        variety: "Marmande",
        harvest_type: "Partial Harvest",
        estimated_quantity: 8000,
        actual_quantity: 7500,
        unit: "kg",
        quality_grade: "B",
        status: "Completed",
        notes: "Récolte partielle tomates",
        completed_at: threeWeeksAgo.toISOString(),
        completed_by: workers[2].id,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        harvest_number: "REC-2024-004",
        harvest_date: twoWeeksAgo.toISOString().split("T")[0],
        parcel_id: parcels[0].id, // Olives parcel (index 0)
        parcel_name: parcels[0].name,
        crop_type: "Olives",
        variety: "Picholine Marocaine",
        harvest_type: "Main Harvest",
        estimated_quantity: 5000,
        actual_quantity: 4800,
        unit: "kg",
        quality_grade: "A",
        status: "Completed",
        notes: "Récolte principale olives",
        completed_at: twoWeeksAgo.toISOString(),
        completed_by: workers[0].id,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        harvest_number: "REC-2024-005",
        harvest_date: oneWeekAgo.toISOString().split("T")[0],
        parcel_id: parcels[2].id,
        parcel_name: parcels[2].name,
        crop_type: "Tomates",
        variety: "Marmande",
        harvest_type: "Partial Harvest",
        estimated_quantity: 6000,
        actual_quantity: null,
        unit: "kg",
        quality_grade: null,
        status: "In Progress",
        notes: "Récolte en cours tomates",
        created_by: userId,
      },
    ];

    const { data: createdHarvests, error: harvestsError } = await client
      .from("harvests")
      .insert(harvests)
      .select();

    if (harvestsError) {
      this.logger.error(
        `Failed to create demo harvests: ${harvestsError.message}`,
      );
      return [];
    }

    // Create harvest workers for each harvest
    const harvestWorkers = [
      {
        harvest_id: createdHarvests?.[0]?.id,
        worker_id: workers[0].id,
        worker_name: workers[0].name,
        role: "Team Leader",
        hours_worked: 8,
        payment_rate: 50,
        payment_amount: 400,
      },
      {
        harvest_id: createdHarvests?.[0]?.id,
        worker_id: workers[1].id,
        worker_name: workers[1].name,
        role: "Harvester",
        hours_worked: 8,
        payment_rate: 45,
        payment_amount: 360,
      },
      {
        harvest_id: createdHarvests?.[1]?.id,
        worker_id: workers[1].id,
        worker_name: workers[1].name,
        role: "Team Leader",
        hours_worked: 7,
        payment_rate: 50,
        payment_amount: 350,
      },
      {
        harvest_id: createdHarvests?.[1]?.id,
        worker_id: workers[2].id,
        worker_name: workers[2].name,
        role: "Harvester",
        hours_worked: 7,
        payment_rate: 45,
        payment_amount: 315,
      },
      {
        harvest_id: createdHarvests?.[2]?.id,
        worker_id: workers[2].id,
        worker_name: workers[2].name,
        role: "Team Leader",
        hours_worked: 6,
        payment_rate: 50,
        payment_amount: 300,
      },
      {
        harvest_id: createdHarvests?.[3]?.id,
        worker_id: workers[0].id,
        worker_name: workers[0].name,
        role: "Team Leader",
        hours_worked: 9,
        payment_rate: 50,
        payment_amount: 450,
      },
    ];

    await client.from("harvest_workers").insert(harvestWorkers);

    return createdHarvests || [];
  }

  /**
   * Create demo reception batches
   */
  async createDemoReceptionBatches(
    organizationId: string,
    farmId: string,
    harvests: any[],
    userId: string,
  ) {
    if (harvests.length === 0) {
      this.logger.warn(
        "Cannot create reception batches: no harvests available",
      );
      return [];
    }

    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const receptionBatches = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        batch_number: "LOT-2024-001",
        reception_date: twoMonthsAgo.toISOString().split("T")[0],
        harvest_id: harvests[0].id,
        harvest_number: harvests[0].harvest_number,
        crop_type: harvests[0].crop_type,
        variety: harvests[0].variety,
        quantity: 14250,
        unit: "kg",
        quality_grade: "A",
        status: "Processed",
        notes: "Lot clémentines principal",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        batch_number: "LOT-2024-002",
        reception_date: oneMonthAgo.toISOString().split("T")[0],
        harvest_id: harvests[1].id,
        harvest_number: harvests[1].harvest_number,
        crop_type: harvests[1].crop_type,
        variety: harvests[1].variety,
        quantity: 11800,
        unit: "kg",
        quality_grade: "A",
        status: "Processed",
        notes: "Lot oranges navel principal",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        batch_number: "LOT-2024-003",
        reception_date: threeWeeksAgo.toISOString().split("T")[0],
        harvest_id: harvests[2].id,
        harvest_number: harvests[2].harvest_number,
        crop_type: harvests[2].crop_type,
        variety: harvests[2].variety,
        quantity: 7500,
        unit: "kg",
        quality_grade: "B",
        status: "Processed",
        notes: "Lot tomates partiel",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        batch_number: "LOT-2024-004",
        reception_date: twoWeeksAgo.toISOString().split("T")[0],
        harvest_id: harvests[3].id,
        harvest_number: harvests[3].harvest_number,
        crop_type: harvests[3].crop_type,
        variety: harvests[3].variety,
        quantity: 4800,
        unit: "kg",
        quality_grade: "A",
        status: "Processed",
        notes: "Lot olives principal",
        created_by: userId,
      },
    ];

    const { data: createdBatches, error: batchesError } = await client
      .from("reception_batches")
      .insert(receptionBatches)
      .select();

    if (batchesError) {
      this.logger.error(
        `Failed to create demo reception batches: ${batchesError.message}`,
      );
      return [];
    }

    return createdBatches || [];
  }

  /**
   * Create demo production costs
   */
  async createDemoProductionCosts(
    organizationId: string,
    farmId: string,
    parcels: any[],
    tasks: any[],
    userId: string,
  ) {
    if (parcels.length === 0) {
      this.logger.warn("Cannot create production costs: no parcels available");
      return [];
    }

    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const productionCosts = [
      // Labor costs
      {
        organization_id: organizationId,
        farm_id: farmId,
        cost_date: threeMonthsAgo.toISOString().split("T")[0],
        parcel_id: parcels[0].id,
        parcel_name: parcels[0].name,
        cost_type: "Labor",
        cost_category: "Harvesting",
        description: "Main d'œuvre récolte clémentines",
        quantity: 80,
        unit: "hours",
        unit_cost: 47.5,
        total_cost: 3800,
        currency: "MAD",
        reference_type: "Task",
        reference_id: tasks[0]?.id || null,
        reference_number: tasks[0]?.task_number || null,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        cost_date: twoMonthsAgo.toISOString().split("T")[0],
        parcel_id: parcels[1].id,
        parcel_name: parcels[1].name,
        cost_type: "Labor",
        cost_category: "Pruning",
        description: "Taille arbres agrumes",
        quantity: 60,
        unit: "hours",
        unit_cost: 47.5,
        total_cost: 2850,
        currency: "MAD",
        reference_type: "Task",
        reference_id: tasks[1]?.id || null,
        reference_number: tasks[1]?.task_number || null,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        cost_date: oneMonthAgo.toISOString().split("T")[0],
        parcel_id: parcels[2].id,
        parcel_name: parcels[2].name,
        cost_type: "Labor",
        cost_category: "Irrigation",
        description: "Installation irrigation goutte-à-goutte",
        quantity: 40,
        unit: "hours",
        unit_cost: 47.5,
        total_cost: 1900,
        currency: "MAD",
        reference_type: "Task",
        reference_id: tasks[2]?.id || null,
        reference_number: tasks[2]?.task_number || null,
        created_by: userId,
      },
      // Input costs
      {
        organization_id: organizationId,
        farm_id: farmId,
        cost_date: threeMonthsAgo.toISOString().split("T")[0],
        parcel_id: parcels[0].id,
        parcel_name: parcels[0].name,
        cost_type: "Input",
        cost_category: "Fertilizer",
        description: "Engrais NPK 15-15-15",
        quantity: 500,
        unit: "kg",
        unit_cost: 12.5,
        total_cost: 6250,
        currency: "MAD",
        reference_type: "Stock Entry",
        reference_id: null,
        reference_number: "SE-2024-001",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        cost_date: twoMonthsAgo.toISOString().split("T")[0],
        parcel_id: parcels[1].id,
        parcel_name: parcels[1].name,
        cost_type: "Input",
        cost_category: "Fertilizer",
        description: "Engrais organique",
        quantity: 30,
        unit: "sac",
        unit_cost: 85,
        total_cost: 2550,
        currency: "MAD",
        reference_type: "Stock Entry",
        reference_id: null,
        reference_number: "SE-2024-001",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        cost_date: oneMonthAgo.toISOString().split("T")[0],
        parcel_id: parcels[2].id,
        parcel_name: parcels[2].name,
        cost_type: "Input",
        cost_category: "Pesticide",
        description: "Fongicide systémique",
        quantity: 5,
        unit: "litre",
        unit_cost: 120,
        total_cost: 600,
        currency: "MAD",
        reference_type: "Stock Entry",
        reference_id: null,
        reference_number: "SE-2024-003",
        created_by: userId,
      },
      // Equipment costs
      {
        organization_id: organizationId,
        farm_id: farmId,
        cost_date: threeMonthsAgo.toISOString().split("T")[0],
        parcel_id: parcels[0].id,
        parcel_name: parcels[0].name,
        cost_type: "Equipment",
        cost_category: "Fuel",
        description: "Carburant tracteur",
        quantity: 200,
        unit: "litre",
        unit_cost: 12,
        total_cost: 2400,
        currency: "MAD",
        reference_type: null,
        reference_id: null,
        reference_number: null,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        cost_date: twoMonthsAgo.toISOString().split("T")[0],
        parcel_id: parcels[0].id,
        parcel_name: parcels[0].name,
        cost_type: "Equipment",
        cost_category: "Maintenance",
        description: "Maintenance système irrigation",
        quantity: 1,
        unit: "job",
        unit_cost: 1500,
        total_cost: 1500,
        currency: "MAD",
        reference_type: "Task",
        reference_id: tasks[3]?.id || null,
        reference_number: tasks[3]?.task_number || null,
        created_by: userId,
      },
      // Other costs
      {
        organization_id: organizationId,
        farm_id: farmId,
        cost_date: oneMonthAgo.toISOString().split("T")[0],
        parcel_id: parcels[1].id,
        parcel_name: parcels[1].name,
        cost_type: "Other",
        cost_category: "Utilities",
        description: "Électricité pompage eau",
        quantity: 500,
        unit: "kWh",
        unit_cost: 1.2,
        total_cost: 600,
        currency: "MAD",
        reference_type: null,
        reference_id: null,
        reference_number: null,
        created_by: userId,
      },
    ];

    const { data: createdCosts, error: costsError } = await client
      .from("production_costs")
      .insert(productionCosts)
      .select();

    if (costsError) {
      this.logger.error(
        `Failed to create demo production costs: ${costsError.message}`,
      );
      return [];
    }

    return createdCosts || [];
  }

  /**
   * Create demo production revenues
   */
  async createDemoProductionRevenues(
    organizationId: string,
    farmId: string,
    parcels: any[],
    harvests: any[],
    receptionBatches: any[],
    userId: string,
  ) {
    if (harvests.length === 0 || receptionBatches.length === 0) {
      this.logger.warn(
        "Cannot create production revenues: no harvests or batches available",
      );
      return [];
    }

    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const productionRevenues = [
      {
        organization_id: organizationId,
        farm_id: farmId,
        revenue_date: twoMonthsAgo.toISOString().split("T")[0],
        parcel_id: parcels[0].id,
        parcel_name: parcels[0].name,
        harvest_id: harvests[0].id,
        harvest_number: harvests[0].harvest_number,
        batch_id: receptionBatches[0].id,
        batch_number: receptionBatches[0].batch_number,
        crop_type: harvests[0].crop_type,
        variety: harvests[0].variety,
        quantity: 14250,
        unit: "kg",
        unit_price: 15,
        total_revenue: 213750,
        currency: "MAD",
        revenue_type: "Sales",
        reference_type: "Invoice",
        reference_id: null,
        reference_number: "FAC-2024-001",
        notes: "Vente clémentines grade A",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        revenue_date: oneMonthAgo.toISOString().split("T")[0],
        parcel_id: parcels[1].id,
        parcel_name: parcels[1].name,
        harvest_id: harvests[1].id,
        harvest_number: harvests[1].harvest_number,
        batch_id: receptionBatches[1].id,
        batch_number: receptionBatches[1].batch_number,
        crop_type: harvests[1].crop_type,
        variety: harvests[1].variety,
        quantity: 11800,
        unit: "kg",
        unit_price: 12,
        total_revenue: 141600,
        currency: "MAD",
        revenue_type: "Sales",
        reference_type: "Invoice",
        reference_id: null,
        reference_number: "FAC-2024-002",
        notes: "Vente oranges navel grade A",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        revenue_date: threeWeeksAgo.toISOString().split("T")[0],
        parcel_id: parcels[2].id,
        parcel_name: parcels[2].name,
        harvest_id: harvests[2].id,
        harvest_number: harvests[2].harvest_number,
        batch_id: receptionBatches[2].id,
        batch_number: receptionBatches[2].batch_number,
        crop_type: harvests[2].crop_type,
        variety: harvests[2].variety,
        quantity: 7500,
        unit: "kg",
        unit_price: 18,
        total_revenue: 135000,
        currency: "MAD",
        revenue_type: "Sales",
        reference_type: "Invoice",
        reference_id: null,
        reference_number: "FAC-2024-003",
        notes: "Vente tomates grade B",
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        revenue_date: twoWeeksAgo.toISOString().split("T")[0],
        parcel_id: parcels[0].id,
        parcel_name: parcels[0].name,
        harvest_id: harvests[3].id,
        harvest_number: harvests[3].harvest_number,
        batch_id: receptionBatches[3].id,
        batch_number: receptionBatches[3].batch_number,
        crop_type: harvests[3].crop_type,
        variety: harvests[3].variety,
        quantity: 4800,
        unit: "kg",
        unit_price: 25,
        total_revenue: 120000,
        currency: "MAD",
        revenue_type: "Sales",
        reference_type: "Invoice",
        reference_id: null,
        reference_number: "FAC-2024-004",
        notes: "Vente olives grade A",
        created_by: userId,
      },
    ];

    const { data: createdRevenues, error: revenuesError } = await client
      .from("production_revenues")
      .insert(productionRevenues)
      .select();

    if (revenuesError) {
      this.logger.error(
        `Failed to create demo production revenues: ${revenuesError.message}`,
      );
      return [];
    }

    return createdRevenues || [];
  }
}
