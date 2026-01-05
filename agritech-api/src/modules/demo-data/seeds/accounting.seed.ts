import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AccountingSeedService {
  private readonly logger = new Logger(AccountingSeedService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create demo parties (customers and suppliers)
   */
  async createDemoParties(
    organizationId: string,
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    // Get default accounts
    const { data: receivableAccount } = await client
      .from('accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('account_name', 'Clients')
      .limit(1)
      .single();

    const { data: payableAccount } = await client
      .from('accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('account_name', 'Fournisseurs')
      .limit(1)
      .single();

    const parties = [
      // Customers
      {
        organization_id: organizationId,
        party_type: 'Customer',
        party_name: 'Supermarché Atlas',
        contact_person: 'M. Ahmed Berrada',
        email: 'achats@atlas-market.ma',
        phone: '+212 522 123 456',
        address: '123 Boulevard Mohammed V, Casablanca',
        city: 'Casablanca',
        country: 'Maroc',
        default_receivable_account_id: receivableAccount?.id || null,
        currency: 'MAD',
        tax_id: '12345678',
        payment_terms: 'Net 30',
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        party_type: 'Customer',
        party_name: 'Fruits du Maroc SARL',
        contact_person: 'Mme. Fatima Zahra',
        email: 'contact@fruitsdumaroc.ma',
        phone: '+212 523 456 789',
        address: '45 Avenue Hassan II, Rabat',
        city: 'Rabat',
        country: 'Maroc',
        default_receivable_account_id: receivableAccount?.id || null,
        currency: 'MAD',
        payment_terms: 'Net 45',
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        party_type: 'Customer',
        party_name: 'Export Agricole SA',
        contact_person: 'M. Karim Tazi',
        email: 'export@agricole-export.ma',
        phone: '+212 524 789 012',
        address: '78 Rue de l\'Industrie, Tanger',
        city: 'Tanger',
        country: 'Maroc',
        default_receivable_account_id: receivableAccount?.id || null,
        currency: 'MAD',
        payment_terms: 'Net 60',
        is_active: true,
        created_by: userId,
      },
      // Suppliers
      {
        organization_id: organizationId,
        party_type: 'Supplier',
        party_name: 'Agrofertil SA',
        contact_person: 'M. Hassan El Fassi',
        email: 'ventes@agrofertil.ma',
        phone: '+212 522 987 654',
        address: 'Zone Industrielle, Fès',
        city: 'Fès',
        country: 'Maroc',
        default_payable_account_id: payableAccount?.id || null,
        currency: 'MAD',
        tax_id: '87654321',
        payment_terms: 'Net 30',
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        party_type: 'Supplier',
        party_name: 'Phytoprod Maroc',
        contact_person: 'Mme. Samira Benjelloun',
        email: 'orders@phytoprod.ma',
        phone: '+212 524 567 890',
        address: 'Parc Technologique, Marrakech',
        city: 'Marrakech',
        country: 'Maroc',
        default_payable_account_id: payableAccount?.id || null,
        currency: 'MAD',
        tax_id: '56789012',
        payment_terms: 'Net 45',
        is_active: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        party_type: 'Supplier',
        party_name: 'EquipAgri SARL',
        contact_person: 'M. Omar Boulif',
        email: 'sales@equipagri.ma',
        phone: '+212 523 234 567',
        address: 'Zone Franche, Agadir',
        city: 'Agadir',
        country: 'Maroc',
        default_payable_account_id: payableAccount?.id || null,
        currency: 'MAD',
        tax_id: '34567890',
        payment_terms: 'Net 30',
        is_active: true,
        created_by: userId,
      },
    ];

    const { data: createdParties, error: partiesError } = await client
      .from('parties')
      .insert(parties)
      .select();

    if (partiesError) {
      this.logger.error(`Failed to create demo parties: ${partiesError.message}`);
      return { customers: [], suppliers: [] };
    }

    const customers = createdParties?.filter((p: any) => p.party_type === 'Customer') || [];
    const suppliers = createdParties?.filter((p: any) => p.party_type === 'Supplier') || [];

    return { customers, suppliers };
  }

  /**
   * Create demo quotes (devis)
   */
  async createDemoQuotes(
    organizationId: string,
    customers: any[],
    userId: string,
  ) {
    if (customers.length === 0) {
      this.logger.warn('Cannot create quotes: no customers available');
      return [];
    }

    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const quotes = [
      {
        organization_id: organizationId,
        quote_number: 'DEV-2024-001',
        quote_date: threeWeeksAgo.toISOString().split('T')[0],
        valid_until: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_id: customers[0].id,
        customer_name: customers[0].party_name,
        currency: 'MAD',
        status: 'Draft',
        notes: 'Devis pour livraison d\'agrumes',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        quote_number: 'DEV-2024-002',
        quote_date: twoWeeksAgo.toISOString().split('T')[0],
        valid_until: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_id: customers[1].id,
        customer_name: customers[1].party_name,
        currency: 'MAD',
        status: 'Sent',
        notes: 'Devis pour exportation olives',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        quote_number: 'DEV-2024-003',
        quote_date: oneWeekAgo.toISOString().split('T')[0],
        valid_until: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_id: customers[2].id,
        customer_name: customers[2].party_name,
        currency: 'MAD',
        status: 'Accepted',
        notes: 'Devis accepté pour livraison tomates',
        created_by: userId,
      },
    ];

    const { data: createdQuotes, error: quotesError } = await client
      .from('quotes')
      .insert(quotes)
      .select();

    if (quotesError) {
      this.logger.error(`Failed to create demo quotes: ${quotesError.message}`);
      return [];
    }

    // Create quote items
    const quoteItems = [
      // Quote 1 items
      {
        quote_id: createdQuotes?.[0]?.id,
        line_number: 1,
        item_name: 'Clémentines de Berkane',
        description: 'Clémentines Catégorie I, 5kg',
        quantity: 1000,
        unit: 'kg',
        unit_price: 15,
        discount_percent: 5,
        tax_percent: 20,
        subtotal: 15000,
        discount_amount: 750,
        tax_amount: 2850,
        total: 17100,
      },
      {
        quote_id: createdQuotes?.[0]?.id,
        line_number: 2,
        item_name: 'Oranges Navel',
        description: 'Oranges Navel Premium, 3kg',
        quantity: 500,
        unit: 'kg',
        unit_price: 12,
        discount_percent: 0,
        tax_percent: 20,
        subtotal: 6000,
        discount_amount: 0,
        tax_amount: 1200,
        total: 7200,
      },
      // Quote 2 items
      {
        quote_id: createdQuotes?.[1]?.id,
        line_number: 1,
        item_name: 'Olives de Table',
        description: 'Olives vertes cassées, 1kg',
        quantity: 2000,
        unit: 'kg',
        unit_price: 25,
        discount_percent: 10,
        tax_percent: 20,
        subtotal: 50000,
        discount_amount: 5000,
        tax_amount: 9000,
        total: 54000,
      },
      // Quote 3 items
      {
        quote_id: createdQuotes?.[2]?.id,
        line_number: 1,
        item_name: 'Tomates Marmande',
        description: 'Tomates Marmande Bio, 500g',
        quantity: 1500,
        unit: 'kg',
        unit_price: 18,
        discount_percent: 0,
        tax_percent: 20,
        subtotal: 27000,
        discount_amount: 0,
        tax_amount: 5400,
        total: 32400,
      },
    ];

    await client.from('quote_items').insert(quoteItems);

    return createdQuotes || [];
  }

  /**
   * Create demo sales orders
   */
  async createDemoSalesOrders(
    organizationId: string,
    customers: any[],
    userId: string,
  ) {
    if (customers.length === 0) {
      return [];
    }

    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const salesOrders = [
      {
        organization_id: organizationId,
        order_number: 'BC-2024-001',
        order_date: tenDaysAgo.toISOString().split('T')[0],
        delivery_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_id: customers[0].id,
        customer_name: customers[0].party_name,
        currency: 'MAD',
        status: 'To Deliver',
        notes: 'Commande pour livraison prochaine',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: 'BC-2024-002',
        order_date: fiveDaysAgo.toISOString().split('T')[0],
        delivery_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_id: customers[1].id,
        customer_name: customers[1].party_name,
        currency: 'MAD',
        status: 'To Deliver',
        notes: 'Export commandé',
        created_by: userId,
      },
    ];

    const { data: createdOrders, error: ordersError } = await client
      .from('sales_orders')
      .insert(salesOrders)
      .select();

    if (ordersError) {
      this.logger.error(`Failed to create demo sales orders: ${ordersError.message}`);
      return [];
    }

    // Create sales order items
    const orderItems = [
      {
        sales_order_id: createdOrders?.[0]?.id,
        line_number: 1,
        item_name: 'Clémentines de Berkane',
        description: 'Clémentines Catégorie I',
        quantity: 800,
        unit: 'kg',
        unit_price: 15,
        discount_percent: 5,
        tax_percent: 20,
        subtotal: 12000,
        discount_amount: 600,
        tax_amount: 2280,
        total: 13680,
        delivered_quantity: 0,
        pending_quantity: 800,
      },
      {
        sales_order_id: createdOrders?.[1]?.id,
        line_number: 1,
        item_name: 'Olives de Table',
        description: 'Olives vertes cassées',
        quantity: 1500,
        unit: 'kg',
        unit_price: 25,
        discount_percent: 10,
        tax_percent: 20,
        subtotal: 37500,
        discount_amount: 3750,
        tax_amount: 6750,
        total: 40500,
        delivered_quantity: 0,
        pending_quantity: 1500,
      },
    ];

    await client.from('sales_order_items').insert(orderItems);

    return createdOrders || [];
  }

  /**
   * Create demo purchase orders
   */
  async createDemoPurchaseOrders(
    organizationId: string,
    suppliers: any[],
    userId: string,
  ) {
    if (suppliers.length === 0) {
      return [];
    }

    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const eightDaysAgo = new Date(now);
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const purchaseOrders = [
      {
        organization_id: organizationId,
        order_number: 'CA-2024-001',
        order_date: fifteenDaysAgo.toISOString().split('T')[0],
        expected_delivery_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplier_id: suppliers[0].id,
        supplier_name: suppliers[0].party_name,
        currency: 'MAD',
        status: 'To Receive',
        notes: 'Commande engrais pour saison',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        order_number: 'CA-2024-002',
        order_date: eightDaysAgo.toISOString().split('T')[0],
        expected_delivery_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplier_id: suppliers[1].id,
        supplier_name: suppliers[1].party_name,
        currency: 'MAD',
        status: 'To Receive',
        notes: 'Commande produits phytosanitaires',
        created_by: userId,
      },
    ];

    const { data: createdOrders, error: ordersError } = await client
      .from('purchase_orders')
      .insert(purchaseOrders)
      .select();

    if (ordersError) {
      this.logger.error(`Failed to create demo purchase orders: ${ordersError.message}`);
      return [];
    }

    // Create purchase order items
    const orderItems = [
      {
        purchase_order_id: createdOrders?.[0]?.id,
        line_number: 1,
        item_name: 'Engrais NPK 15-15-15',
        description: 'Engrais complet NPK',
        quantity: 1000,
        unit: 'kg',
        unit_price: 12.5,
        tax_percent: 20,
        subtotal: 12500,
        tax_amount: 2500,
        total: 15000,
        received_quantity: 0,
        pending_quantity: 1000,
      },
      {
        purchase_order_id: createdOrders?.[0]?.id,
        line_number: 2,
        item_name: 'Engrais Organique 50kg',
        description: 'Engrais organique en sac',
        quantity: 50,
        unit: 'sac',
        unit_price: 85,
        tax_percent: 20,
        subtotal: 4250,
        tax_amount: 850,
        total: 5100,
        received_quantity: 0,
        pending_quantity: 50,
      },
      {
        purchase_order_id: createdOrders?.[1]?.id,
        line_number: 1,
        item_name: 'Fongicide Systémique 1L',
        description: 'Fongicide pour traitement',
        quantity: 30,
        unit: 'litre',
        unit_price: 120,
        tax_percent: 20,
        subtotal: 3600,
        tax_amount: 720,
        total: 4320,
        received_quantity: 0,
        pending_quantity: 30,
      },
      {
        purchase_order_id: createdOrders?.[1]?.id,
        line_number: 2,
        item_name: 'Insecticide 500ml',
        description: 'Insecticide pour parasites',
        quantity: 25,
        unit: 'bouteille',
        unit_price: 95,
        tax_percent: 20,
        subtotal: 2375,
        tax_amount: 475,
        total: 2850,
        received_quantity: 0,
        pending_quantity: 25,
      },
    ];

    await client.from('purchase_order_items').insert(orderItems);

    return createdOrders || [];
  }

  /**
   * Create demo invoices
   */
  async createDemoInvoices(
    organizationId: string,
    customers: any[],
    userId: string,
  ) {
    if (customers.length === 0) {
      return [];
    }

    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const twentyDaysAgo = new Date(now);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    const twelveDaysAgo = new Date(now);
    twelveDaysAgo.setDate(twelveDaysAgo.getDate() - 12);
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const invoices = [
      {
        organization_id: organizationId,
        invoice_number: 'FAC-2024-001',
        invoice_date: twentyDaysAgo.toISOString().split('T')[0],
        due_date: new Date(twentyDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_id: customers[0].id,
        customer_name: customers[0].party_name,
        currency: 'MAD',
        status: 'Paid',
        notes: 'Facture livraison clémentines',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        invoice_number: 'FAC-2024-002',
        invoice_date: twelveDaysAgo.toISOString().split('T')[0],
        due_date: new Date(twelveDaysAgo.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_id: customers[1].id,
        customer_name: customers[1].party_name,
        currency: 'MAD',
        status: 'Overdue',
        notes: 'Facture livraison olives',
        created_by: userId,
      },
      {
        organization_id: organizationId,
        invoice_number: 'FAC-2024-003',
        invoice_date: fiveDaysAgo.toISOString().split('T')[0],
        due_date: new Date(fiveDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_id: customers[2].id,
        customer_name: customers[2].party_name,
        currency: 'MAD',
        status: 'Unpaid',
        notes: 'Facture livraison tomates',
        created_by: userId,
      },
    ];

    const { data: createdInvoices, error: invoicesError } = await client
      .from('invoices')
      .insert(invoices)
      .select();

    if (invoicesError) {
      this.logger.error(`Failed to create demo invoices: ${invoicesError.message}`);
      return [];
    }

    // Create invoice items
    const invoiceItems = [
      {
        invoice_id: createdInvoices?.[0]?.id,
        line_number: 1,
        item_name: 'Clémentines de Berkane',
        description: 'Clémentines Catégorie I, 5kg',
        quantity: 500,
        unit: 'kg',
        unit_price: 15,
        discount_percent: 5,
        tax_percent: 20,
        subtotal: 7500,
        discount_amount: 375,
        tax_amount: 1425,
        total: 8550,
      },
      {
        invoice_id: createdInvoices?.[1]?.id,
        line_number: 1,
        item_name: 'Olives de Table',
        description: 'Olives vertes cassées, 1kg',
        quantity: 800,
        unit: 'kg',
        unit_price: 25,
        discount_percent: 10,
        tax_percent: 20,
        subtotal: 20000,
        discount_amount: 2000,
        tax_amount: 3600,
        total: 21600,
      },
      {
        invoice_id: createdInvoices?.[2]?.id,
        line_number: 1,
        item_name: 'Tomates Marmande',
        description: 'Tomates Marmande Bio, 500g',
        quantity: 600,
        unit: 'kg',
        unit_price: 18,
        discount_percent: 0,
        tax_percent: 20,
        subtotal: 10800,
        discount_amount: 0,
        tax_amount: 2160,
        total: 12960,
      },
    ];

    await client.from('invoice_items').insert(invoiceItems);

    return createdInvoices || [];
  }

  /**
   * Create demo payments
   */
  async createDemoPayments(
    organizationId: string,
    invoices: any[],
    customers: any[],
    suppliers: any[],
    userId: string,
  ) {
    if (invoices.length === 0 || customers.length === 0) {
      return [];
    }

    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const payments = [
      // Customer payment (received)
      {
        organization_id: organizationId,
        payment_number: 'PAI-2024-001',
        payment_date: tenDaysAgo.toISOString().split('T')[0],
        payment_type: 'Received',
        party_type: 'Customer',
        party_id: customers[0].id,
        party_name: customers[0].party_name,
        currency: 'MAD',
        amount: 8550,
        payment_method: 'Bank Transfer',
        reference: 'VIR-2024-001',
        status: 'Completed',
        notes: 'Paiement facture FAC-2024-001',
        created_by: userId,
      },
      // Supplier payment (made)
      {
        organization_id: organizationId,
        payment_number: 'PAI-2024-002',
        payment_date: fiveDaysAgo.toISOString().split('T')[0],
        payment_type: 'Paid',
        party_type: 'Supplier',
        party_id: suppliers[0]?.id || null,
        party_name: suppliers[0]?.party_name || 'Agrofertil SA',
        currency: 'MAD',
        amount: 20100,
        payment_method: 'Bank Transfer',
        reference: 'VIR-2024-002',
        status: 'Completed',
        notes: 'Paiement commande CA-2024-001',
        created_by: userId,
      },
    ];

    const { data: createdPayments, error: paymentsError } = await client
      .from('payments')
      .insert(payments)
      .select();

    if (paymentsError) {
      this.logger.error(`Failed to create demo payments: ${paymentsError.message}`);
      return [];
    }

    // Link payments to invoices
    const paymentReferences = [
      {
        payment_id: createdPayments?.[0]?.id,
        reference_type: 'Invoice',
        reference_id: invoices[0]?.id,
        reference_number: invoices[0]?.invoice_number,
        allocated_amount: 8550,
      },
    ];

    await client.from('payment_references').insert(paymentReferences);

    return createdPayments || [];
  }

  /**
   * Create demo journal entries
   */
  async createDemoJournalEntries(
    organizationId: string,
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();

    // Get default accounts
    const { data: cashAccount } = await client
      .from('accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('account_name', 'Caisse')
      .limit(1)
      .single();

    const { data: bankAccount } = await client
      .from('accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('account_name', 'Banque')
      .limit(1)
      .single();

    const { data: salesAccount } = await client
      .from('accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('account_name', 'Ventes')
      .limit(1)
      .single();

    const { data: vatAccount } = await client
      .from('accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('account_name', 'TVA Collectée')
      .limit(1)
      .single();

    const { data: expenseAccount } = await client
      .from('accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('account_type', 'Expense')
      .limit(1)
      .single();

    const now = new Date();
    const eighteenDaysAgo = new Date(now);
    eighteenDaysAgo.setDate(eighteenDaysAgo.getDate() - 18);

    const journalEntries = [
      {
        organization_id: organizationId,
        entry_number: 'ECR-2024-001',
        entry_date: eighteenDaysAgo.toISOString().split('T')[0],
        entry_type: 'Sales',
        reference_type: 'Invoice',
        reference_number: 'FAC-2024-001',
        status: 'Posted',
        notes: 'Écriture comptable facture FAC-2024-001',
        posted_at: eighteenDaysAgo.toISOString(),
        posted_by: userId,
        created_by: userId,
      },
    ];

    const { data: createdEntries, error: entriesError } = await client
      .from('journal_entries')
      .insert(journalEntries)
      .select();

    if (entriesError) {
      this.logger.error(`Failed to create demo journal entries: ${entriesError.message}`);
      return [];
    }

    // Create journal entry lines
    const entryLines = [
      {
        journal_entry_id: createdEntries?.[0]?.id,
        line_number: 1,
        account_id: bankAccount?.id || null,
        debit: 8550,
        credit: 0,
        description: 'Encaissement facture FAC-2024-001',
      },
      {
        journal_entry_id: createdEntries?.[0]?.id,
        line_number: 2,
        account_id: salesAccount?.id || null,
        debit: 0,
        credit: 7125,
        description: 'Ventes HT',
      },
      {
        journal_entry_id: createdEntries?.[0]?.id,
        line_number: 3,
        account_id: vatAccount?.id || null,
        debit: 0,
        credit: 1425,
        description: 'TVA collectée',
      },
    ];

    await client.from('journal_entry_lines').insert(entryLines);

    return createdEntries || [];
  }
}
