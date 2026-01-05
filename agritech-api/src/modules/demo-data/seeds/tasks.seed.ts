import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class TasksSeedService {
  private readonly logger = new Logger(TasksSeedService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create demo tasks
   */
  async createDemoTasks(
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
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        title: 'Traitement Phytosanitaire',
        description: 'Traitement préventif contre les maladies des oliviers',
        task_type: 'pest_control',
        priority: 'high',
        status: 'completed',
        assigned_to: workers[0].id,
        scheduled_start: lastWeek.toISOString(),
        actual_start: lastWeek.toISOString(),
        actual_end: new Date(lastWeek.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        completed_date: lastWeek.toISOString().split('T')[0],
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
        title: 'Irrigation Complémentaire',
        description: 'Irrigation d\'appoint pour les agrumes',
        task_type: 'irrigation',
        priority: 'medium',
        status: 'in_progress',
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
        title: 'Désherbage Manuel',
        description: 'Désherbage manuel de la parcelle de légumes',
        task_type: 'maintenance',
        priority: 'low',
        status: 'assigned',
        assigned_to: workers[1].id,
        scheduled_start: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_duration: 4,
        weather_dependency: false,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[0].id,
        title: 'Récolte Olives',
        description: 'Récolte annuelle des olives',
        task_type: 'harvesting',
        priority: 'high',
        status: 'pending',
        assigned_to: workers[2].id,
        scheduled_start: nextMonth.toISOString(),
        due_date: nextMonth.toISOString().split('T')[0],
        estimated_duration: 20,
        weather_dependency: true,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[1].id,
        title: 'Application Engrais NPK',
        description: 'Application d\'engrais NPK pour les agrumes',
        task_type: 'fertilization',
        priority: 'medium',
        status: 'pending',
        scheduled_start: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_duration: 4,
        weather_dependency: false,
        created_by: userId,
      },
      {
        organization_id: organizationId,
        farm_id: farmId,
        parcel_id: parcels[2].id,
        title: 'Récolte Tomates',
        description: 'Première récolte de tomates de saison',
        task_type: 'harvesting',
        priority: 'high',
        status: 'assigned',
        assigned_to: workers[1].id,
        scheduled_start: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_duration: 8,
        weather_dependency: true,
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
}
