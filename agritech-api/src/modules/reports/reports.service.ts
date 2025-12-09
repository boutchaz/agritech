import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ReportFiltersDto, ReportType } from './dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * Generate report data based on type and filters
   */
  async generateReport(organizationId: string, filters: ReportFiltersDto) {
    this.logger.log(`Generating report ${filters.report_type} for org ${organizationId}`);

    const supabase = this.databaseService.getAdminClient();

    try {
      switch (filters.report_type) {
        // Analyses Reports
        case ReportType.ANALYSES_COMPLETE:
          return await this.getAnalysesComplete(supabase, organizationId, filters);

        case ReportType.ANALYSES_SOIL_ONLY:
          return await this.getAnalysesSoilOnly(supabase, organizationId, filters);

        // Stock Reports
        case ReportType.STOCK_INVENTORY:
          return await this.getStockInventory(supabase, organizationId);

        case ReportType.STOCK_MOVEMENTS:
          return await this.getStockMovements(supabase, organizationId, filters);

        // Infrastructure Reports
        case ReportType.INFRASTRUCTURE_COMPLETE:
          return await this.getInfrastructureComplete(supabase, organizationId);

        // Personnel Reports
        case ReportType.EMPLOYEES:
          return await this.getEmployees(supabase, organizationId);

        case ReportType.DAY_LABORERS:
          return await this.getDayLaborers(supabase, organizationId);

        // Module-specific Reports
        case ReportType.FRUIT_TREES_FERTILIZATION:
          return await this.getFruitTreesFertilization(supabase, organizationId, filters);

        case ReportType.FRUIT_TREES_PRUNING:
          return await this.getFruitTreesPruning(supabase, organizationId, filters);

        default:
          throw new BadRequestException(`Report type ${filters.report_type} not yet implemented`);
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error generating report: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate report');
    }
  }

  /**
   * Get available report types for organization (based on active modules)
   */
  async getAvailableReports(organizationId: string) {
    const supabase = this.databaseService.getAdminClient();

    // Get active modules for the organization
    const { data: activeModules, error } = await supabase
      .from('organization_modules')
      .select('module_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) {
      this.logger.error('Error fetching active modules', error);
      throw new InternalServerErrorException('Failed to fetch active modules');
    }

    // Base reports always available
    const baseReports = [
      {
        id: 'analyses',
        name: 'Analyses (Sol, Plante, Eau)',
        description: 'Rapports d\'analyses de sol, plante et eau',
        types: [
          {
            id: ReportType.ANALYSES_COMPLETE,
            name: 'Rapport d\'analyses complet',
            description: 'Toutes les analyses (sol, plante, eau)',
          },
          {
            id: ReportType.ANALYSES_SOIL_ONLY,
            name: 'Analyses de sol uniquement',
            description: 'Analyses de sol avec données détaillées',
          },
        ],
      },
      {
        id: 'stock',
        name: 'Stock',
        description: 'Rapports de gestion du stock',
        types: [
          {
            id: ReportType.STOCK_INVENTORY,
            name: 'État du stock',
            description: 'État actuel du stock',
          },
          {
            id: ReportType.STOCK_MOVEMENTS,
            name: 'Mouvements de stock',
            description: 'Entrées et sorties de stock',
          },
        ],
      },
      {
        id: 'infrastructure',
        name: 'Infrastructure',
        description: 'Rapports sur les infrastructures',
        types: [
          {
            id: ReportType.INFRASTRUCTURE_COMPLETE,
            name: 'Rapport complet',
            description: 'État de toutes les infrastructures',
          },
        ],
      },
      {
        id: 'employees',
        name: 'Personnel',
        description: 'Rapports sur le personnel',
        types: [
          {
            id: ReportType.EMPLOYEES,
            name: 'Liste des salariés',
            description: 'Liste complète des salariés',
          },
          {
            id: ReportType.DAY_LABORERS,
            name: 'Liste des ouvriers',
            description: 'Liste des ouvriers journaliers',
          },
        ],
      },
    ];

    // Module-specific reports
    const moduleReports: any[] = [];
    const moduleIds = activeModules?.map((m) => m.module_id) || [];

    if (moduleIds.includes('fruit-trees')) {
      moduleReports.push({
        id: 'fruit-trees',
        name: 'Arbres Fruitiers',
        description: 'Rapports sur la gestion des arbres fruitiers',
        types: [
          {
            id: ReportType.FRUIT_TREES_FERTILIZATION,
            name: 'Rapport de fertilisation',
            description: 'Historique des applications d\'engrais',
          },
          {
            id: ReportType.FRUIT_TREES_PRUNING,
            name: 'Rapport de taille',
            description: 'Suivi des opérations de taille',
          },
        ],
      });
    }

    // Add more module-specific reports as needed...

    return {
      baseReports,
      moduleReports,
    };
  }

  // Private helper methods for each report type

  private async getAnalysesComplete(supabase: any, organizationId: string, filters: ReportFiltersDto) {
    let query = supabase
      .from('analyses')
      .select(`
        analysis_date,
        analysis_type,
        laboratory,
        notes,
        parcels!inner(name, farms!inner(organization_id))
      `)
      .eq('parcels.farms.organization_id', organizationId)
      .order('analysis_date', { ascending: false });

    if (filters.start_date) {
      query = query.gte('analysis_date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('analysis_date', filters.end_date);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException('Failed to fetch analyses data');
    }

    return {
      columns: ['Date', 'Parcelle', 'Type', 'Laboratoire', 'Notes'],
      data: (data || []).map((analysis) => ({
        Date: new Date(analysis.analysis_date).toLocaleDateString(),
        Parcelle: analysis.parcels.name,
        Type: analysis.analysis_type === 'soil' ? 'Sol' : analysis.analysis_type === 'plant' ? 'Plante' : 'Eau',
        Laboratoire: analysis.laboratory || 'N/A',
        Notes: analysis.notes || '',
      })),
    };
  }

  private async getAnalysesSoilOnly(supabase: any, organizationId: string, filters: ReportFiltersDto) {
    let query = supabase
      .from('analyses')
      .select(`
        analysis_date,
        data,
        notes,
        parcels!inner(name, farms!inner(organization_id))
      `)
      .eq('analysis_type', 'soil')
      .eq('parcels.farms.organization_id', organizationId)
      .order('analysis_date', { ascending: false });

    if (filters.start_date) {
      query = query.gte('analysis_date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('analysis_date', filters.end_date);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException('Failed to fetch soil analyses data');
    }

    return {
      columns: ['Date', 'Parcelle', 'pH', 'Texture', 'N-P-K (ppm)', 'Notes'],
      data: (data || []).map((analysis) => ({
        Date: new Date(analysis.analysis_date).toLocaleDateString(),
        Parcelle: analysis.parcels.name,
        pH: analysis.data?.ph_level || 'N/A',
        Texture: analysis.data?.texture || 'N/A',
        'N-P-K (ppm)': `${analysis.data?.nitrogen_ppm || 0}-${analysis.data?.phosphorus_ppm || 0}-${analysis.data?.potassium_ppm || 0}`,
        Notes: analysis.notes || '',
      })),
    };
  }

  private async getStockInventory(supabase: any, organizationId: string) {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        name,
        quantity,
        unit,
        price_per_unit,
        last_purchase_date,
        product_categories!inner(name)
      `)
      .eq('organization_id', organizationId);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch inventory data');
    }

    return {
      columns: ['Produit', 'Catégorie', 'Quantité', 'Valeur', 'Dernier achat'],
      data: (data || []).map((item) => ({
        Produit: item.name,
        Catégorie: item.product_categories.name,
        Quantité: `${item.quantity} ${item.unit}`,
        Valeur: item.quantity * item.price_per_unit,
        'Dernier achat': item.last_purchase_date ? new Date(item.last_purchase_date).toLocaleDateString() : '-',
      })),
    };
  }

  private async getStockMovements(supabase: any, organizationId: string, filters: ReportFiltersDto) {
    const purchasesQuery = supabase
      .from('purchases')
      .select(`
        purchase_date,
        quantity,
        total_price,
        inventory!inner(name, unit, organization_id)
      `)
      .eq('inventory.organization_id', organizationId);

    const applicationsQuery = supabase
      .from('product_applications')
      .select(`
        application_date,
        quantity_used,
        inventory!inner(name, unit, price_per_unit, organization_id)
      `)
      .eq('inventory.organization_id', organizationId);

    if (filters.start_date) {
      purchasesQuery.gte('purchase_date', filters.start_date);
      applicationsQuery.gte('application_date', filters.start_date);
    }
    if (filters.end_date) {
      purchasesQuery.lte('purchase_date', filters.end_date);
      applicationsQuery.lte('application_date', filters.end_date);
    }

    const [purchases, applications] = await Promise.all([
      purchasesQuery,
      applicationsQuery,
    ]);

    if (purchases.error || applications.error) {
      throw new InternalServerErrorException('Failed to fetch stock movements data');
    }

    const movements = [
      ...(purchases.data || []).map((p) => ({
        Date: new Date(p.purchase_date).toLocaleDateString(),
        Produit: p.inventory.name,
        Type: 'Entrée',
        Quantité: `${p.quantity} ${p.inventory.unit}`,
        Valeur: p.total_price,
      })),
      ...(applications.data || []).map((a) => ({
        Date: new Date(a.application_date).toLocaleDateString(),
        Produit: a.inventory.name,
        Type: 'Sortie',
        Quantité: `${a.quantity_used} ${a.inventory.unit}`,
        Valeur: a.quantity_used * a.inventory.price_per_unit,
      })),
    ];

    return {
      columns: ['Date', 'Produit', 'Type', 'Quantité', 'Valeur'],
      data: movements,
    };
  }

  private async getInfrastructureComplete(supabase: any, organizationId: string) {
    const { data, error } = await supabase
      .from('structures')
      .select(`
        name,
        type,
        condition,
        installation_date,
        maintenance_history(maintenance_date),
        farms!inner(organization_id)
      `)
      .eq('farms.organization_id', organizationId);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch infrastructure data');
    }

    return {
      columns: ['Structure', 'Type', 'État', 'Installation', 'Dernière maintenance'],
      data: (data || []).map((structure) => ({
        Structure: structure.name,
        Type: structure.type,
        État: structure.condition,
        Installation: new Date(structure.installation_date).toLocaleDateString(),
        'Dernière maintenance': structure.maintenance_history?.[0]?.maintenance_date
          ? new Date(structure.maintenance_history[0].maintenance_date).toLocaleDateString()
          : '-',
      })),
    };
  }

  private async getEmployees(supabase: any, organizationId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', organizationId)
      .order('last_name');

    if (error) {
      throw new InternalServerErrorException('Failed to fetch employees data');
    }

    return {
      columns: ['Nom', 'Prénom', 'CIN', 'Poste', 'Date d\'embauche', 'Salaire'],
      data: (data || []).map((employee) => ({
        Nom: employee.last_name,
        Prénom: employee.first_name,
        CIN: employee.cin,
        Poste: employee.position,
        'Date d\'embauche': new Date(employee.hire_date).toLocaleDateString(),
        Salaire: employee.salary,
      })),
    };
  }

  private async getDayLaborers(supabase: any, organizationId: string) {
    const { data, error } = await supabase
      .from('day_laborers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('last_name');

    if (error) {
      throw new InternalServerErrorException('Failed to fetch day laborers data');
    }

    return {
      columns: ['Nom', 'Prénom', 'CIN', 'Taux journalier', 'Spécialités'],
      data: (data || []).map((laborer) => ({
        Nom: laborer.last_name,
        Prénom: laborer.first_name,
        CIN: laborer.cin,
        'Taux journalier': laborer.daily_rate,
        Spécialités: laborer.specialties?.join(', ') || '-',
      })),
    };
  }

  private async getFruitTreesFertilization(supabase: any, organizationId: string, filters: ReportFiltersDto) {
    let query = supabase
      .from('product_applications')
      .select(`
        application_date,
        quantity_used,
        notes,
        inventory!inner(name, unit, category_id, organization_id),
        parcels!inner(name)
      `)
      .eq('inventory.organization_id', organizationId)
      .eq('inventory.category_id', 'fertilizer')
      .order('application_date', { ascending: false });

    if (filters.start_date) {
      query = query.gte('application_date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('application_date', filters.end_date);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException('Failed to fetch fertilization data');
    }

    return {
      columns: ['Date', 'Parcelle', 'Produit', 'Quantité', 'Notes'],
      data: (data || []).map((app) => ({
        Date: new Date(app.application_date).toLocaleDateString(),
        Parcelle: app.parcels.name,
        Produit: app.inventory.name,
        Quantité: `${app.quantity_used} ${app.inventory.unit}`,
        Notes: app.notes || '',
      })),
    };
  }

  private async getFruitTreesPruning(supabase: any, organizationId: string, filters: ReportFiltersDto) {
    let query = supabase
      .from('work_records')
      .select(`
        work_date,
        task_description,
        notes,
        parcels!inner(name, farms!inner(organization_id)),
        day_laborers!inner(first_name, last_name)
      `)
      .eq('task_category', 'pruning')
      .eq('parcels.farms.organization_id', organizationId)
      .order('work_date', { ascending: false });

    if (filters.start_date) {
      query = query.gte('work_date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('work_date', filters.end_date);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException('Failed to fetch pruning data');
    }

    return {
      columns: ['Date', 'Parcelle', 'Type de taille', 'Équipe', 'Observations'],
      data: (data || []).map((record) => ({
        Date: new Date(record.work_date).toLocaleDateString(),
        Parcelle: record.parcels.name,
        'Type de taille': record.task_description,
        Équipe: `${record.day_laborers.first_name} ${record.day_laborers.last_name}`,
        Observations: record.notes || '',
      })),
    };
  }
}
