import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { ZaiProvider } from './providers/zai.provider';
import { SendMessageDto, ChatResponseDto } from './dto';

interface OrganizationContext {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  account_type: string;
  active_users_count: number;
}

interface FarmContext {
  farms_count: number;
  farms: Array<{ id: string; name: string; area: number }>;
  parcels_count: number;
  parcels: Array<{
    id: string;
    name: string;
    area: string;
    crop: string;
    farm_id: string;
  }>;
  active_crop_cycles: number;
  structures_count: number;
}

interface WorkerContext {
  active_workers_count: number;
  workers: Array<{ id: string; name: string; type: string; farm_id?: string }>;
  pending_tasks_count: number;
  tasks: Array<{ id: string; title: string; status: string; type: string }>;
  recent_work_records_count: number;
}

interface AccountingContext {
  accounts_count: number;
  accounts: Array<{ id: string; name: string; type: string; balance: number }>;
  recent_invoices_count: number;
  invoices: Array<{
    number: string;
    type: string;
    status: string;
    total: number;
    date: string;
  }>;
  recent_payments_count: number;
  payments: Array<{
    date: string;
    amount: number;
    method: string;
    status: string;
  }>;
  current_fiscal_year: { name: string; start_date: string; end_date: string } | null;
}

interface InventoryContext {
  items_count: number;
  items: Array<{ id: string; name: string; code: string; stock: number; unit: string }>;
  warehouses_count: number;
  warehouses: Array<{ id: string; name: string; location: string }>;
  recent_stock_movements_count: number;
}

interface ProductionContext {
  recent_harvests_count: number;
  harvests: Array<{
    date: string;
    crop: string;
    quantity: string;
    quality: string;
    status: string;
  }>;
  recent_quality_checks_count: number;
  recent_deliveries_count: number;
}

interface SupplierCustomerContext {
  suppliers_count: number;
  suppliers: Array<{ id: string; name: string; type: string }>;
  customers_count: number;
  customers: Array<{ id: string; name: string; type: string }>;
  pending_sales_orders_count: number;
  sales_orders: Array<{
    number: string;
    date: string;
    total: number;
    status: string;
  }>;
  pending_purchase_orders_count: number;
  purchase_orders: Array<{
    number: string;
    date: string;
    total: number;
    status: string;
  }>;
}

interface BuiltContext {
  organization: OrganizationContext;
  farms?: FarmContext | null;
  workers?: WorkerContext | null;
  accounting?: AccountingContext | null;
  inventory?: InventoryContext | null;
  production?: ProductionContext | null;
  suppliersCustomers?: SupplierCustomerContext | null;
}

interface ContextNeeds {
  farm: boolean;
  worker: boolean;
  accounting: boolean;
  inventory: boolean;
  production: boolean;
  supplierCustomer: boolean;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly zaiProvider: ZaiProvider;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.zaiProvider = new ZaiProvider(configService);
  }

  private async verifyOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data: orgUser } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }
  }

  async sendMessage(
    userId: string,
    organizationId: string,
    dto: SendMessageDto,
  ): Promise<ChatResponseDto> {
    await this.verifyOrganizationAccess(userId, organizationId);

    this.logger.log(`Building context for chat request in org ${organizationId}`);

    // Build context from all modules in parallel for performance
    const context = await this.buildOrganizationContext(organizationId, dto.query);

    // Build prompts
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      dto.query,
      context,
      dto.language || 'en',
    );

    // Get API key from environment
    const apiKey = this.configService.get<string>('ZAI_API_KEY', '');
    this.zaiProvider.setApiKey(apiKey);

    // Save user message to history if enabled
    const shouldSaveHistory = dto.save_history !== false;
    if (shouldSaveHistory) {
      await this.saveMessage(userId, organizationId, 'user', dto.query, dto.language);
    }

    // Generate response
    try {
      const response = await this.zaiProvider.generate({
        systemPrompt,
        userPrompt,
        config: {
          provider: 'zai' as any,
          model: 'GLM-4.5-Flash',
          temperature: 0.7,
          maxTokens: 8192,
        },
      });

      // Save assistant response to history
      if (shouldSaveHistory) {
        await this.saveMessage(userId, organizationId, 'assistant', response.content, dto.language, {
          provider: 'zai',
          model: response.model,
          tokensUsed: response.tokensUsed,
        });
      }

      return {
        response: response.content,
        context_summary: this.summarizeContext(context),
        metadata: {
          provider: 'zai',
          model: response.model,
          tokensUsed: response.tokensUsed,
          timestamp: response.generatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Chat generation failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to generate response: ${error.message}`,
      );
    }
  }

  private async saveMessage(
    userId: string,
    organizationId: string,
    role: 'user' | 'assistant',
    content: string,
    language?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();

    await client.from('chat_conversations').insert({
      organization_id: organizationId,
      user_id: userId,
      role,
      content,
      language: language || 'en',
      metadata: metadata || {},
    });
  }

  private async buildOrganizationContext(
    organizationId: string,
    query: string,
  ): Promise<BuiltContext> {
    const client = this.databaseService.getAdminClient();

    // Analyze query to determine which context to load (optimization)
    const contextNeeds = this.analyzeQueryContext(query);

    // Build all context in parallel
    const [
      organizationContext,
      farmContext,
      workerContext,
      accountingContext,
      inventoryContext,
      productionContext,
      supplierCustomerContext,
    ] = await Promise.all([
      this.getOrganizationContext(client, organizationId),
      contextNeeds.farm
        ? this.getFarmContext(client, organizationId)
        : Promise.resolve(null),
      contextNeeds.worker
        ? this.getWorkerContext(client, organizationId)
        : Promise.resolve(null),
      contextNeeds.accounting
        ? this.getAccountingContext(client, organizationId)
        : Promise.resolve(null),
      contextNeeds.inventory
        ? this.getInventoryContext(client, organizationId)
        : Promise.resolve(null),
      contextNeeds.production
        ? this.getProductionContext(client, organizationId)
        : Promise.resolve(null),
      contextNeeds.supplierCustomer
        ? this.getSupplierCustomerContext(client, organizationId)
        : Promise.resolve(null),
    ]);

    return {
      organization: organizationContext,
      farms: farmContext,
      workers: workerContext,
      accounting: accountingContext,
      inventory: inventoryContext,
      production: productionContext,
      suppliersCustomers: supplierCustomerContext,
    };
  }

  private analyzeQueryContext(query: string): ContextNeeds {
    const lowerQuery = query.toLowerCase();
    return {
      farm: /farm|parcel|crop|field|plant|soil|irrigation|harvest|structure/.test(
        lowerQuery,
      ),
      worker: /worker|employee|labor|task|assignment|wage|salary|work/.test(
        lowerQuery,
      ),
      accounting:
        /account|invoice|payment|journal|expense|revenue|profit|cost|fiscal|tax/.test(
          lowerQuery,
        ),
      inventory:
        /stock|inventory|warehouse|item|product|material|reception/.test(
          lowerQuery,
        ),
      production: /production|harvest|yield|quality|delivery/.test(lowerQuery),
      supplierCustomer:
        /supplier|customer|vendor|client|order|quote|purchase|sale/.test(
          lowerQuery,
        ),
    };
  }

  private async getOrganizationContext(
    client: any,
    organizationId: string,
  ): Promise<OrganizationContext> {
    const { data: org } = await client
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    const { data: users } = await client
      .from('organization_users')
      .select('user_id, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    return {
      id: org.id,
      name: org.name,
      currency: org.currency_code || 'USD',
      timezone: org.timezone || 'UTC',
      account_type: org.account_type || 'standard',
      active_users_count: users?.length || 0,
    };
  }

  private async getFarmContext(
    client: any,
    organizationId: string,
  ): Promise<FarmContext> {
    // Get farms
    const { data: farms } = await client
      .from('farms')
      .select('id, name, location, size, size_unit, is_active, status')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Get parcels summary
    const { data: parcels } = await client
      .from('parcels')
      .select('id, name, area, area_unit, crop_type, farm_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(50);

    // Get crop cycles
    const { data: cropCycles } = await client
      .from('crop_cycles')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'planned'])
      .limit(20);

    // Get structures
    const { data: structures } = await client
      .from('structures')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(20);

    return {
      farms_count: farms?.length || 0,
      farms:
        farms?.map((f: any) => ({
          id: f.id,
          name: f.name,
          area: f.size || 0,
        })) || [],
      parcels_count: parcels?.length || 0,
      parcels:
        parcels?.map((p: any) => ({
          id: p.id,
          name: p.name,
          area: `${p.area} ${p.area_unit}`,
          crop: p.crop_type || 'N/A',
          farm_id: p.farm_id,
        })) || [],
      active_crop_cycles: cropCycles?.length || 0,
      structures_count: structures?.length || 0,
    };
  }

  private async getWorkerContext(
    client: any,
    organizationId: string,
  ): Promise<WorkerContext> {
    const { data: workers } = await client
      .from('workers')
      .select('id, first_name, last_name, worker_type, is_active, farm_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(50);

    const { data: tasks } = await client
      .from('tasks')
      .select('id, title, status, task_type, priority')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'assigned', 'in_progress'])
      .limit(50);

    const { data: workRecords } = await client
      .from('work_records')
      .select('id, work_date, amount_paid, payment_status')
      .eq('organization_id', organizationId)
      .gte(
        'work_date',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .limit(50);

    return {
      active_workers_count: workers?.length || 0,
      workers:
        workers?.map((w: any) => ({
          id: w.id,
          name: `${w.first_name} ${w.last_name}`,
          type: w.worker_type,
          farm_id: w.farm_id,
        })) || [],
      pending_tasks_count: tasks?.length || 0,
      tasks:
        tasks?.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          type: t.task_type,
        })) || [],
      recent_work_records_count: workRecords?.length || 0,
    };
  }

  private async getAccountingContext(
    client: any,
    organizationId: string,
  ): Promise<AccountingContext> {
    // Get chart of accounts summary - FIXED: account_name → name
    const { data: accounts } = await client
      .from('accounts')
      .select('id, name, account_type')
      .eq('organization_id', organizationId)
      .limit(50);

    // Get recent invoices
    const { data: invoices } = await client
      .from('invoices')
      .select(
        'id, invoice_number, invoice_type, status, grand_total, invoice_date',
      )
      .eq('organization_id', organizationId)
      .gte(
        'invoice_date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('invoice_date', { ascending: false })
      .limit(30);

    // Get recent payments - FIXED: payments → accounting_payments
    const { data: payments } = await client
      .from('accounting_payments')
      .select('id, payment_date, amount, payment_method, status')
      .eq('organization_id', organizationId)
      .gte(
        'payment_date',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('payment_date', { ascending: false })
      .limit(20);

    // Get fiscal year - FIXED: is_active → is_current
    const { data: fiscalYear } = await client
      .from('fiscal_years')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_current', true)
      .maybeSingle();

    return {
      accounts_count: accounts?.length || 0,
      accounts:
        accounts?.map((a: any) => ({
          id: a.id,
          name: a.name,
          type: a.account_type,
          balance: 0, // Balance is calculated, not stored
        })) || [],
      recent_invoices_count: invoices?.length || 0,
      invoices:
        invoices?.map((i: any) => ({
          number: i.invoice_number,
          type: i.invoice_type,
          status: i.status,
          total: i.grand_total,
          date: i.invoice_date,
        })) || [],
      recent_payments_count: payments?.length || 0,
      payments:
        payments?.map((p: any) => ({
          date: p.payment_date,
          amount: p.amount,
          method: p.payment_method,
          status: p.status,
        })) || [],
      current_fiscal_year: fiscalYear
        ? {
            name: fiscalYear.name,
            start_date: fiscalYear.start_date,
            end_date: fiscalYear.end_date,
          }
        : null,
    };
  }

  private async getInventoryContext(
    client: any,
    organizationId: string,
  ): Promise<InventoryContext> {
    // FIXED: item_name, item_code, stock_uom (removed current_stock as it's calculated)
    const { data: items } = await client
      .from('items')
      .select('id, item_name, item_code, default_unit')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(50);

    const { data: warehouses } = await client
      .from('warehouses')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    const { data: stockEntries } = await client
      .from('stock_entries')
      .select('id, entry_type, entry_date')
      .eq('organization_id', organizationId)
      .gte(
        'entry_date',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('entry_date', { ascending: false })
      .limit(20);

    return {
      items_count: items?.length || 0,
      items:
        items?.map((i: any) => ({
          id: i.id,
          name: i.item_name,
          code: i.item_code,
          stock: 0, // Stock is calculated from stock_entries, not stored
          unit: i.default_unit,
        })) || [],
      warehouses_count: warehouses?.length || 0,
      warehouses:
        warehouses?.map((w: any) => ({
          id: w.id,
          name: w.name,
          location: w.location,
        })) || [],
      recent_stock_movements_count: stockEntries?.length || 0,
    };
  }

  private async getProductionContext(
    client: any,
    organizationId: string,
  ): Promise<ProductionContext> {
    // FIXED: Removed crop_type (table has crop_id instead), added more accurate columns
    const { data: harvests } = await client
      .from('harvest_records')
      .select('id, harvest_date, quantity, unit, quality_grade, status')
      .eq('organization_id', organizationId)
      .gte(
        'harvest_date',
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('harvest_date', { ascending: false })
      .limit(30);

    // FIXED: quality_control → quality_inspections
    const { data: qualityChecks } = await client
      .from('quality_inspections')
      .select('*')
      .eq('organization_id', organizationId)
      .gte(
        'inspection_date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('inspection_date', { ascending: false })
      .limit(20);

    const { data: deliveries } = await client
      .from('deliveries')
      .select('*')
      .eq('organization_id', organizationId)
      .gte(
        'delivery_date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('delivery_date', { ascending: false })
      .limit(20);

    return {
      recent_harvests_count: harvests?.length || 0,
      harvests:
        harvests?.map((h: any) => ({
          date: h.harvest_date,
          crop: 'N/A', // Crop info requires join with crops table
          quantity: `${h.quantity} ${h.unit}`,
          quality: h.quality_grade || 'N/A',
          status: h.status,
        })) || [],
      recent_quality_checks_count: qualityChecks?.length || 0,
      recent_deliveries_count: deliveries?.length || 0,
    };
  }

  private async getSupplierCustomerContext(
    client: any,
    organizationId: string,
  ): Promise<SupplierCustomerContext> {
    const { data: suppliers } = await client
      .from('suppliers')
      .select('id, name, supplier_type, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(30);

    const { data: customers } = await client
      .from('customers')
      .select('id, name, customer_type, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(30);

    const { data: salesOrders } = await client
      .from('sales_orders')
      .select('id, order_number, order_date, total_amount, status')
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'confirmed', 'partial'])
      .order('order_date', { ascending: false })
      .limit(20);

    const { data: purchaseOrders } = await client
      .from('purchase_orders')
      .select('id, order_number, order_date, total_amount, status')
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'confirmed', 'partial'])
      .order('order_date', { ascending: false })
      .limit(20);

    return {
      suppliers_count: suppliers?.length || 0,
      suppliers:
        suppliers?.map((s: any) => ({
          id: s.id,
          name: s.name,
          type: s.supplier_type,
        })) || [],
      customers_count: customers?.length || 0,
      customers:
        customers?.map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.customer_type,
        })) || [],
      pending_sales_orders_count: salesOrders?.length || 0,
      sales_orders:
        salesOrders?.map((o: any) => ({
          number: o.order_number,
          date: o.order_date,
          total: o.total_amount,
          status: o.status,
        })) || [],
      pending_purchase_orders_count: purchaseOrders?.length || 0,
      purchase_orders:
        purchaseOrders?.map((o: any) => ({
          number: o.order_number,
          date: o.order_date,
          total: o.total_amount,
          status: o.status,
        })) || [],
    };
  }

  private buildSystemPrompt(): string {
    return `You are an intelligent agricultural management assistant for the AgriTech platform. You have access to comprehensive farm management data and can help users with:

**Farm Management:**
- Parcels, crops, and soil information
- Irrigation and farm structures
- Crop cycles and phenological stages

**Workforce Management:**
- Workers (employees, day laborers, métayage)
- Tasks and assignments
- Work records and payments

**Accounting & Finance:**
- Chart of accounts and journal entries
- Invoices (sales/purchase), payments
- Financial reports and fiscal years

**Inventory & Stock:**
- Items and products
- Warehouses and stock movements
- Stock entries and reception batches

**Production:**
- Harvests and yields
- Quality control checks
- Deliveries and production intelligence

**Suppliers & Customers:**
- Supplier management
- Customer management
- Sales orders and purchase orders
- Quotes and estimates

**Your capabilities:**
- Answer questions about any aspect of the farm operation
- Provide insights based on the data
- Help with data analysis and trends
- Suggest improvements based on best practices
- Assist with troubleshooting issues

**Important guidelines:**
- Always base your responses on the provided context data
- If you don't have sufficient data, clearly state what information is missing
- Use professional but accessible language
- Be specific with references to actual data (names, amounts, dates)
- For complex analyses, break down your response clearly
- If the user asks for something that requires actions you cannot perform, explain what needs to be done`;
  }

  private buildUserPrompt(
    query: string,
    context: BuiltContext,
    language: string,
  ): string {
    const langInstruction =
      language === 'fr'
        ? 'Répondre en français.'
        : language === 'ar'
        ? 'الرد باللغة العربية.'
        : 'Respond in English.';

    return `${langInstruction}

User Question: ${query}

====================================================
ORGANIZATION CONTEXT
====================================================
Organization: ${context.organization.name}
Currency: ${context.organization.currency}
Account Type: ${context.organization.account_type}
Active Users: ${context.organization.active_users_count}

====================================================
FARM DATA
====================================================
${context.farms ? `
Farms: ${context.farms.farms_count}
${context.farms.farms.map((f) => `- ${f.name} (${f.area} ha)`).join('\n')}

Parcels: ${context.farms.parcels_count}
${context.farms.parcels.slice(0, 10).map((p) => `- ${p.name}: ${p.crop}, ${p.area}`).join('\n')}
${context.farms.parcels.length > 10 ? `\n... and ${context.farms.parcels.length - 10} more parcels` : ''}

Active Crop Cycles: ${context.farms.active_crop_cycles}
Structures: ${context.farms.structures_count}
` : 'No farm data available.'}

====================================================
WORKFORCE DATA
====================================================
${context.workers ? `
Active Workers: ${context.workers.active_workers_count}
${context.workers.workers.slice(0, 10).map((w) => `- ${w.name} (${w.type})`).join('\n')}
${context.workers.workers.length > 10 ? `\n... and ${context.workers.workers.length - 10} more workers` : ''}

Pending Tasks: ${context.workers.pending_tasks_count}
${context.workers.tasks.slice(0, 5).map((t) => `- ${t.title}: ${t.status}`).join('\n')}

Recent Work Records (last 30 days): ${context.workers.recent_work_records_count}
` : 'No workforce data available.'}

====================================================
ACCOUNTING DATA
====================================================
${context.accounting ? `
Chart of Accounts: ${context.accounting.accounts_count} accounts

Recent Invoices (last 90 days): ${context.accounting.recent_invoices_count}
${context.accounting.invoices.slice(0, 5).map((i) => `- ${i.number} (${i.type}): ${i.status} - ${i.total} ${i.date}`).join('\n')}

Recent Payments (last 30 days): ${context.accounting.recent_payments_count}
${context.accounting.payments.slice(0, 5).map((p) => `- ${p.date}: ${p.amount} (${p.method})`).join('\n')}

Fiscal Year: ${context.accounting.current_fiscal_year?.name || 'Not set'}
` : 'No accounting data available.'}

====================================================
INVENTORY DATA
====================================================
${context.inventory ? `
Items: ${context.inventory.items_count}
${context.inventory.items.slice(0, 10).map((i) => `- ${i.name}: ${i.stock} ${i.unit}`).join('\n')}
${context.inventory.items.length > 10 ? `\n... and ${context.inventory.items.length - 10} more items` : ''}

Warehouses: ${context.inventory.warehouses_count}
${context.inventory.warehouses.map((w) => `- ${w.name} (${w.location})`).join('\n')}

Recent Stock Movements (last 30 days): ${context.inventory.recent_stock_movements_count}
` : 'No inventory data available.'}

====================================================
PRODUCTION DATA
====================================================
${context.production ? `
Recent Harvests (last 365 days): ${context.production.recent_harvests_count}
${context.production.harvests.slice(0, 5).map((h) => `- ${h.date}: ${h.crop} - ${h.quantity} (${h.quality})`).join('\n')}

Recent Quality Checks (last 90 days): ${context.production.recent_quality_checks_count}
Recent Deliveries (last 90 days): ${context.production.recent_deliveries_count}
` : 'No production data available.'}

====================================================
SUPPLIERS & CUSTOMERS DATA
====================================================
${context.suppliersCustomers ? `
Suppliers: ${context.suppliersCustomers.suppliers_count}
${context.suppliersCustomers.suppliers.slice(0, 10).map((s) => `- ${s.name} (${s.type})`).join('\n')}
${context.suppliersCustomers.suppliers.length > 10 ? `\n... and ${context.suppliersCustomers.suppliers.length - 10} more` : ''}

Customers: ${context.suppliersCustomers.customers_count}
${context.suppliersCustomers.customers.slice(0, 10).map((c) => `- ${c.name} (${c.type})`).join('\n')}
${context.suppliersCustomers.customers.length > 10 ? `\n... and ${context.suppliersCustomers.customers.length - 10} more` : ''}

Pending Sales Orders: ${context.suppliersCustomers.pending_sales_orders_count}
${context.suppliersCustomers.sales_orders.slice(0, 5).map((o) => `- ${o.number}: ${o.total} (${o.status})`).join('\n')}

Pending Purchase Orders: ${context.suppliersCustomers.pending_purchase_orders_count}
${context.suppliersCustomers.purchase_orders.slice(0, 5).map((o) => `- ${o.number}: ${o.total} (${o.status})`).join('\n')}
` : 'No supplier/customer data available.'}

====================================================
YOUR RESPONSE
====================================================
Based on the above context and the user's question, provide a helpful, accurate response. Reference specific data points when relevant. If the answer requires information not shown above, clearly indicate what additional information would be needed.`;
  }

  private summarizeContext(context: BuiltContext) {
    return {
      organization: context.organization.name,
      farms_count: context.farms?.farms_count || 0,
      parcels_count: context.farms?.parcels_count || 0,
      workers_count: context.workers?.active_workers_count || 0,
      pending_tasks: context.workers?.pending_tasks_count || 0,
      recent_invoices: context.accounting?.recent_invoices_count || 0,
      inventory_items: context.inventory?.items_count || 0,
      recent_harvests: context.production?.recent_harvests_count || 0,
    };
  }

  async getConversationHistory(
    userId: string,
    organizationId: string,
    limit = 10,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    // Get total count
    const { count } = await client
      .from('chat_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    // Get messages with pagination
    const { data: messages } = await client
      .from('chat_conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    return {
      messages: (messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        metadata: msg.metadata,
      })),
      total: count || 0,
    };
  }

  async clearConversationHistory(userId: string, organizationId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('chat_conversations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to clear chat history: ${error.message}`);
      throw new BadRequestException(`Failed to clear chat history: ${error.message}`);
    }

    return {
      success: true,
    };
  }
}
