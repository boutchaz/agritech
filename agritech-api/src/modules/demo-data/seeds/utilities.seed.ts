import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class UtilitiesSeedService {
  private readonly logger = new Logger(UtilitiesSeedService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create demo utilities (fixed costs: electricity, water, diesel, etc.)
   */
  async createDemoUtilities(organizationId: string, farmId: string, parcels: any[]) {
    const client = this.databaseService.getAdminClient();

    const now = new Date();
    const currentMonth = now.toISOString().split('T')[0];
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const utilities = [
      // Electricity bills (monthly recurring)
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'electricity',
        provider: 'ONEE (Office National de l\'Électricité)',
        account_number: 'ELEC-2024-001234',
        amount: 1850.50,
        consumption_value: 450,
        consumption_unit: 'kWh',
        billing_date: lastMonth.toISOString().split('T')[0],
        due_date: new Date(lastMonth.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'paid',
        is_recurring: true,
        recurring_frequency: 'monthly',
        notes: 'Facture électricité - Pompage irrigation et éclairage',
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'electricity',
        provider: 'ONEE (Office National de l\'Électricité)',
        account_number: 'ELEC-2024-001234',
        amount: 2100.00,
        consumption_value: 520,
        consumption_unit: 'kWh',
        billing_date: twoMonthsAgo.toISOString().split('T')[0],
        due_date: new Date(twoMonthsAgo.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'paid',
        is_recurring: true,
        recurring_frequency: 'monthly',
        notes: 'Facture électricité - Haute saison irrigation',
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'electricity',
        provider: 'ONEE (Office National de l\'Électricité)',
        account_number: 'ELEC-2024-001234',
        amount: 1650.75,
        consumption_value: 410,
        consumption_unit: 'kWh',
        billing_date: currentMonth,
        due_date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'pending',
        is_recurring: true,
        recurring_frequency: 'monthly',
        notes: 'Facture électricité en attente de paiement',
      },

      // Water bills (monthly recurring)
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0]?.id,
        type: 'water',
        provider: 'ONEP (Office National de l\'Eau Potable)',
        account_number: 'EAU-2024-005678',
        amount: 3200.00,
        consumption_value: 850,
        consumption_unit: 'm³',
        billing_date: lastMonth.toISOString().split('T')[0],
        due_date: new Date(lastMonth.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'paid',
        is_recurring: true,
        recurring_frequency: 'monthly',
        notes: 'Irrigation parcelle olives',
        cost_per_parcel: 3200.00,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1]?.id,
        type: 'water',
        provider: 'ONEP (Office National de l\'Eau Potable)',
        account_number: 'EAU-2024-005679',
        amount: 2800.50,
        consumption_value: 720,
        consumption_unit: 'm³',
        billing_date: lastMonth.toISOString().split('T')[0],
        due_date: new Date(lastMonth.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'paid',
        is_recurring: true,
        recurring_frequency: 'monthly',
        notes: 'Irrigation parcelle agrumes',
        cost_per_parcel: 2800.50,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0]?.id,
        type: 'water',
        provider: 'ONEP (Office National de l\'Eau Potable)',
        account_number: 'EAU-2024-005678',
        amount: 3500.00,
        consumption_value: 920,
        consumption_unit: 'm³',
        billing_date: currentMonth,
        due_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'pending',
        is_recurring: true,
        recurring_frequency: 'monthly',
        notes: 'Facture eau - période de forte irrigation',
      },

      // Diesel for tractors and machinery
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'diesel',
        provider: 'Afriquia Gaz',
        amount: 4500.00,
        consumption_value: 300,
        consumption_unit: 'L',
        billing_date: lastMonth.toISOString().split('T')[0],
        payment_status: 'paid',
        is_recurring: false,
        notes: 'Carburant pour tracteurs - travaux de sol',
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'diesel',
        provider: 'Shell Maroc',
        amount: 3800.00,
        consumption_value: 250,
        consumption_unit: 'L',
        billing_date: twoMonthsAgo.toISOString().split('T')[0],
        payment_status: 'paid',
        is_recurring: false,
        notes: 'Carburant pour récolte et transport',
      },

      // Internet (monthly recurring)
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'internet',
        provider: 'Maroc Telecom',
        account_number: 'INT-2024-009876',
        amount: 499.00,
        consumption_value: 100,
        consumption_unit: 'GB',
        billing_date: lastMonth.toISOString().split('T')[0],
        due_date: new Date(lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'paid',
        is_recurring: true,
        recurring_frequency: 'monthly',
        notes: 'Forfait internet bureau ferme + surveillance caméras',
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'internet',
        provider: 'Maroc Telecom',
        account_number: 'INT-2024-009876',
        amount: 499.00,
        consumption_value: 100,
        consumption_unit: 'GB',
        billing_date: currentMonth,
        due_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'pending',
        is_recurring: true,
        recurring_frequency: 'monthly',
        notes: 'Forfait internet - facture en cours',
      },

      // Phone bills (monthly recurring)
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'phone',
        provider: 'Orange Maroc',
        account_number: 'TEL-2024-112233',
        amount: 299.00,
        billing_date: lastMonth.toISOString().split('T')[0],
        due_date: new Date(lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'paid',
        is_recurring: true,
        recurring_frequency: 'monthly',
        notes: 'Forfait téléphone gestionnaire ferme',
      },

      // Gas for heating/cooking
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'gas',
        provider: 'Afriquia Gaz',
        amount: 850.00,
        consumption_value: 50,
        consumption_unit: 'kg',
        billing_date: threeMonthsAgo.toISOString().split('T')[0],
        payment_status: 'paid',
        is_recurring: false,
        notes: 'Bouteilles de gaz pour local technique',
      },

      // Other utilities (maintenance contracts, etc.)
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'other',
        provider: 'Maintenance Agri-Service',
        amount: 2500.00,
        billing_date: twoMonthsAgo.toISOString().split('T')[0],
        payment_status: 'paid',
        is_recurring: true,
        recurring_frequency: 'quarterly',
        notes: 'Contrat maintenance équipements irrigation',
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        type: 'other',
        provider: 'Sécurité Atlas',
        amount: 1500.00,
        billing_date: lastMonth.toISOString().split('T')[0],
        due_date: new Date(lastMonth.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'overdue',
        is_recurring: true,
        recurring_frequency: 'monthly',
        notes: 'Service gardiennage et surveillance - paiement en retard',
      },
    ];

    const { data: createdUtilities, error } = await client
      .from('utilities')
      .insert(utilities)
      .select();

    if (error) {
      this.logger.error(`Failed to create demo utilities: ${error.message}`);
      return [];
    }

    return createdUtilities || [];
  }
}
