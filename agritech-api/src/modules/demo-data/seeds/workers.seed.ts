import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class WorkersSeedService {
  private readonly logger = new Logger(WorkersSeedService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create demo workers
   */
  async createDemoWorkers(organizationId: string, farmId: string, userId: string) {
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
}
