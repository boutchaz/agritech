import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class InventorySeedService {
  private readonly logger = new Logger(InventorySeedService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create demo items and warehouses
   */
  async createDemoItems(
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
      return { warehouse, items: [] };
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
  async createDemoStockEntries(
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
    if (items[0]) {
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

    if (items[1]) {
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

    if (items[4]) {
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

    if (items[5]) {
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

    if (items[4]) {
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

    if (items[0]) {
      stockEntryItems.push({
        stock_entry_id: createdEntries[2].id,
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

    if (items[2]) {
      stockEntryItems.push({
        stock_entry_id: createdEntries[4].id,
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

    if (stockEntryItems.length > 0) {
      await client.from('stock_entry_items').insert(stockEntryItems);
    }
  }
}
