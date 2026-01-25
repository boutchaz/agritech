import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePestReportDto } from './dto/create-pest-report.dto';
import { UpdatePestReportDto } from './dto/update-pest-report.dto';
import { PestReportResponseDto, PestDiseaseLibraryDto } from './dto/pest-report-response.dto';

@Injectable()
export class PestAlertsService {
  private readonly logger = new Logger(PestAlertsService.name);

  constructor(
    private databaseService: DatabaseService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Get pest/disease library (reference data)
   */
  async getLibrary(organizationId: string): Promise<PestDiseaseLibraryDto[]> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('pest_disease_library')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      this.logger.error(`Failed to fetch pest/disease library: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch pest/disease library');
    }

    return data || [];
  }

  /**
   * Get all pest reports for an organization
   */
  async getReports(organizationId: string): Promise<PestReportResponseDto[]> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('pest_disease_reports')
      .select(`
        *,
        pest_disease:pest_disease_library(id, name, type, symptoms, treatment, prevention),
        farm:farms(id, name),
        parcel:parcels(id, name),
        reporter:user_profiles(id, first_name, last_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch pest reports: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch pest reports');
    }

    return data || [];
  }

  /**
   * Get a single pest report by ID
   */
  async getReport(organizationId: string, reportId: string): Promise<PestReportResponseDto> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('pest_disease_reports')
      .select(`
        *,
        pest_disease:pest_disease_library(id, name, type, symptoms, treatment, prevention),
        farm:farms(id, name),
        parcel:parcels(id, name),
        reporter:user_profiles(id, first_name, last_name),
        verifier:user_profiles!verified_by(id, first_name, last_name)
      `)
      .eq('id', reportId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Pest report not found');
      }
      this.logger.error(`Failed to fetch pest report: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch pest report');
    }

    return data;
  }

  /**
   * Create a new pest report
   */
  async createReport(
    userId: string,
    organizationId: string,
    dto: CreatePestReportDto,
  ): Promise<PestReportResponseDto> {
    const supabase = this.databaseService.getAdminClient();

    // Validate farm and parcel belong to organization
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', dto.farm_id)
      .eq('organization_id', organizationId)
      .single();

    if (farmError || !farm) {
      throw new BadRequestException('Farm not found or does not belong to organization');
    }

    const { data: parcel, error: parcelError } = await supabase
      .from('parcels')
      .select('id, name')
      .eq('id', dto.parcel_id)
      .eq('farm_id', dto.farm_id)
      .single();

    if (parcelError || !parcel) {
      throw new BadRequestException('Parcel not found or does not belong to farm');
    }

    // Validate pest_disease_id exists
    const { data: pestDisease, error: pestError } = await supabase
      .from('pest_disease_library')
      .select('id, name, type')
      .eq('id', dto.pest_disease_id)
      .single();

    if (pestError || !pestDisease) {
      throw new BadRequestException('Pest/disease not found in library');
    }

    // Convert location to PostGIS format if provided
    let locationValue = null;
    if (dto.location) {
      locationValue = `POINT(${dto.location.longitude} ${dto.location.latitude})`;
    }

    // Create the report
    const { data, error } = await supabase
      .from('pest_disease_reports')
      .insert({
        organization_id: organizationId,
        farm_id: dto.farm_id,
        parcel_id: dto.parcel_id,
        reporter_id: userId,
        pest_disease_id: dto.pest_disease_id,
        severity: dto.severity,
        affected_area_percentage: dto.affected_area_percentage,
        detection_method: dto.detection_method,
        photo_urls: dto.photo_urls || [],
        location: locationValue,
        notes: dto.notes,
        status: 'pending',
      })
      .select(`
        *,
        pest_disease:pest_disease_library(id, name, type, symptoms, treatment, prevention),
        farm:farms(id, name),
        parcel:parcels(id, name),
        reporter:user_profiles(id, first_name, last_name)
      `)
      .single();

    if (error) {
      this.logger.error(`Failed to create pest report: ${error.message}`);
      throw new InternalServerErrorException('Failed to create pest report');
    }

    // Send notification to organization admins
    try {
      // Get organization admins
      const { data: admins } = await supabase
        .from('organization_users')
        .select('user_id, roles(name)')
        .eq('organization_id', organizationId)
        .in('role_id', ['organization_admin', 'system_admin']);

      if (admins && admins.length > 0) {
        const adminUserIds = admins.map((admin) => admin.user_id);
        await this.notificationsService.createNotificationsForUsers(
          adminUserIds,
          organizationId,
          'general' as any,
          `New ${pestDisease.type} report: ${pestDisease.name}`,
          `${pestDisease.name} detected on ${parcel.name} - Severity: ${dto.severity}`,
          {
            report_id: data.id,
            pest_disease_id: dto.pest_disease_id,
            severity: dto.severity,
            parcel_id: dto.parcel_id,
          },
        );
      }
    } catch (notifError) {
      this.logger.warn(`Failed to send notification: ${notifError.message}`);
      // Don't fail the request if notification fails
    }

    this.logger.log(`Pest report created: ${data.id} by user ${userId}`);
    return data;
  }

  /**
   * Update pest report status
   */
  async updateReport(
    userId: string,
    organizationId: string,
    reportId: string,
    dto: UpdatePestReportDto,
  ): Promise<PestReportResponseDto> {
    const supabase = this.databaseService.getAdminClient();

    // Verify report exists and belongs to organization
    const { data: existing, error: fetchError } = await supabase
      .from('pest_disease_reports')
      .select('id, status, parcel_id, pest_disease_id')
      .eq('id', reportId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException('Pest report not found');
    }

    // Use the helper function to update status
    const { data: updateResult, error: updateError } = await supabase.rpc(
      'update_pest_report_status',
      {
        p_report_id: reportId,
        p_status: dto.status,
        p_verified_by: dto.status === 'verified' ? userId : null,
        p_treatment_applied: dto.treatment_applied || null,
      },
    );

    if (updateError) {
      this.logger.error(`Failed to update pest report: ${updateError.message}`);
      throw new InternalServerErrorException('Failed to update pest report');
    }

    // Fetch updated report
    const { data, error } = await supabase
      .from('pest_disease_reports')
      .select(`
        *,
        pest_disease:pest_disease_library(id, name, type, symptoms, treatment, prevention),
        farm:farms(id, name),
        parcel:parcels(id, name),
        reporter:user_profiles(id, first_name, last_name),
        verifier:user_profiles!verified_by(id, first_name, last_name)
      `)
      .eq('id', reportId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch updated report: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch updated report');
    }

    // Send notification on status change to verified or treated
    if (dto.status === 'verified' || dto.status === 'treated') {
      try {
        const { data: reporter } = await supabase
          .from('pest_disease_reports')
          .select('reporter_id')
          .eq('id', reportId)
          .single();

        if (reporter) {
          await this.notificationsService.createNotification({
            userId: reporter.reporter_id,
            organizationId,
            type: 'general' as any,
            title: `Pest report ${dto.status}`,
            message: `Your pest report has been ${dto.status}`,
            data: { report_id: reportId, status: dto.status },
          });
        }
      } catch (notifError) {
        this.logger.warn(`Failed to send notification: ${notifError.message}`);
      }
    }

    this.logger.log(`Pest report updated: ${reportId} to status ${dto.status}`);
    return data;
  }

  /**
   * Delete a pest report
   */
  async deleteReport(organizationId: string, reportId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const { error } = await supabase
      .from('pest_disease_reports')
      .delete()
      .eq('id', reportId)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete pest report: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete pest report');
    }

    this.logger.log(`Pest report deleted: ${reportId}`);
  }

  /**
   * Escalate pest report to performance alert
   */
  async escalateToAlert(
    userId: string,
    organizationId: string,
    reportId: string,
  ): Promise<{ alert_id: string }> {
    const supabase = this.databaseService.getAdminClient();

    // Verify report exists and belongs to organization
    const { data: report, error: fetchError } = await supabase
      .from('pest_disease_reports')
      .select('id, parcel_id, pest_disease_id, severity, notes')
      .eq('id', reportId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !report) {
      throw new NotFoundException('Pest report not found');
    }

    // Get pest disease name for notification
    const { data: pestDisease } = await supabase
      .from('pest_disease_library')
      .select('name, type')
      .eq('id', report.pest_disease_id)
      .single();

    // Use the helper function to create alert
    const { data: alertId, error: alertError } = await supabase.rpc(
      'create_alert_from_pest_report',
      {
        p_report_id: reportId,
      },
    );

    if (alertError) {
      this.logger.error(`Failed to escalate to alert: ${alertError.message}`);
      throw new InternalServerErrorException('Failed to escalate to alert');
    }

    // Send notification to organization admins
    try {
      const { data: admins } = await supabase
        .from('organization_users')
        .select('user_id')
        .eq('organization_id', organizationId)
        .in('role_id', ['organization_admin', 'system_admin']);

      if (admins && admins.length > 0) {
        const adminUserIds = admins.map((admin) => admin.user_id);
        await this.notificationsService.createNotificationsForUsers(
          adminUserIds,
          organizationId,
          'general' as any,
          'Pest report escalated to alert',
          `${pestDisease?.name || 'Pest/Disease'} report has been escalated to a performance alert`,
          {
            report_id: reportId,
            alert_id: alertId,
            severity: report.severity,
          },
        );
      }
    } catch (notifError) {
      this.logger.warn(`Failed to send notification: ${notifError.message}`);
    }

    this.logger.log(`Pest report escalated to alert: ${reportId} -> ${alertId}`);
    return { alert_id: alertId };
  }
}
