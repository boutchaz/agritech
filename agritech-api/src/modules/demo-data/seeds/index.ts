/**
 * Demo Data Seeding Modules
 *
 * This directory contains modular seed services for different domains:
 * - farm.seed.ts: Farm and parcels seeding
 * - workers.seed.ts: Workers seeding
 * - tasks.seed.ts: Tasks seeding
 * - cost-centers.seed.ts: Cost centers seeding
 * - structures.seed.ts: Infrastructure structures seeding
 * - utilities.seed.ts: Utilities (fixed costs) seeding
 * - inventory.seed.ts: Items, warehouses, and stock entries seeding
 * - accounting.seed.ts: Parties, quotes, sales orders, purchase orders, invoices, payments, journal entries seeding
 * - production.seed.ts: Harvests, reception batches, costs, revenues seeding
 */

export { FarmSeedService } from './farm.seed';
export { WorkersSeedService } from './workers.seed';
export { TasksSeedService } from './tasks.seed';
export { CostCentersSeedService } from './cost-centers.seed';
export { StructuresSeedService } from './structures.seed';
export { UtilitiesSeedService } from './utilities.seed';
export { InventorySeedService } from './inventory.seed';
export { AccountingSeedService } from './accounting.seed';
export { ProductionSeedService } from './production.seed';
