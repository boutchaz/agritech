import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { CreateComplianceCheckDto } from './dto/create-compliance-check.dto';
import { UpdateComplianceCheckDto } from './dto/update-compliance-check.dto';
import { CreateEvidenceDto } from './dto/create-evidence.dto';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private databaseService: DatabaseService) {}

  // ============================================================================
  // CERTIFICATION OPERATIONS
  // ============================================================================

  /**
   * Get all certifications for an organization
   */
  async findAllCertifications(organizationId: string) {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('expiry_date', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch certifications: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch certifications');
    }

    return data || [];
  }

  /**
   * Get a single certification by ID
   */
  async findOneCertification(organizationId: string, certificationId: string) {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('id', certificationId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Certification not found');
      }
      this.logger.error(`Failed to fetch certification: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch certification');
    }

    return data;
  }

  /**
   * Create a new certification
   */
  async createCertification(
    organizationId: string,
    dto: CreateCertificationDto,
  ) {
    const supabase = this.databaseService.getAdminClient();

    // Validate expiry date is after issued date
    const issuedDate = new Date(dto.issued_date);
    const expiryDate = new Date(dto.expiry_date);

    if (expiryDate <= issuedDate) {
      throw new BadRequestException(
        'Expiry date must be after issued date',
      );
    }

    // Check for duplicate certification
    const { data: existing } = await supabase
      .from('certifications')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('certification_type', dto.certification_type)
      .eq('certification_number', dto.certification_number)
      .single();

    if (existing) {
      throw new BadRequestException(
        'Certification with this type and number already exists',
      );
    }

    const { data, error } = await supabase
      .from('certifications')
      .insert({
        organization_id: organizationId,
        certification_type: dto.certification_type,
        certification_number: dto.certification_number,
        issued_date: dto.issued_date,
        expiry_date: dto.expiry_date,
        status: dto.status,
        issuing_body: dto.issuing_body,
        scope: dto.scope,
        documents: dto.documents || [],
        audit_schedule: dto.audit_schedule || {},
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create certification: ${error.message}`);
      throw new InternalServerErrorException('Failed to create certification');
    }

    this.logger.log(
      `Certification created: ${data.id} for org ${organizationId}`,
    );

    if (data.audit_schedule?.next_audit_date) {
      await this.scheduleAuditReminders(data);
    }

    return data;
  }

  /**
   * Update a certification
   */
  async updateCertification(
    organizationId: string,
    certificationId: string,
    dto: UpdateCertificationDto,
  ) {
    const supabase = this.databaseService.getAdminClient();

    // Verify certification exists and belongs to organization
    const { data: existing, error: fetchError } = await supabase
      .from('certifications')
      .select('id')
      .eq('id', certificationId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException('Certification not found');
    }

    // Validate dates if both are provided
    if (dto.issued_date && dto.expiry_date) {
      const issuedDate = new Date(dto.issued_date);
      const expiryDate = new Date(dto.expiry_date);

      if (expiryDate <= issuedDate) {
        throw new BadRequestException(
          'Expiry date must be after issued date',
        );
      }
    }

    const { data, error } = await supabase
      .from('certifications')
      .update(dto)
      .eq('id', certificationId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update certification: ${error.message}`);
      throw new InternalServerErrorException('Failed to update certification');
    }

    this.logger.log(`Certification updated: ${certificationId}`);

    if (dto.audit_schedule?.next_audit_date) {
      await this.scheduleAuditReminders(data);
    }

    return data;
  }

  /**
   * Delete a certification
   */
  async removeCertification(organizationId: string, certificationId: string) {
    const supabase = this.databaseService.getAdminClient();

    const { error } = await supabase
      .from('certifications')
      .delete()
      .eq('id', certificationId)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete certification: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete certification');
    }

    this.logger.log(`Certification deleted: ${certificationId}`);
  }

  // ============================================================================
  // COMPLIANCE CHECK OPERATIONS
  // ============================================================================

  /**
   * Get all compliance checks for an organization
   */
  async findAllChecks(organizationId: string) {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('compliance_checks')
      .select(
        `
        *,
        certification:certifications(id, certification_type, certification_number)
      `,
      )
      .eq('organization_id', organizationId)
      .order('check_date', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch compliance checks: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to fetch compliance checks',
      );
    }

    return data || [];
  }

  /**
   * Get a single compliance check by ID
   */
  async findOneCheck(organizationId: string, checkId: string) {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('compliance_checks')
      .select(
        `
        *,
        certification:certifications(id, certification_type, certification_number, issuing_body),
        evidence:compliance_evidence(id, evidence_type, file_url, description, uploaded_at)
      `,
      )
      .eq('id', checkId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Compliance check not found');
      }
      this.logger.error(`Failed to fetch compliance check: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to fetch compliance check',
      );
    }

    return data;
  }

  /**
   * Create a new compliance check
   */
  async createCheck(organizationId: string, dto: CreateComplianceCheckDto) {
    const supabase = this.databaseService.getAdminClient();

    // Verify certification exists and belongs to organization
    const { data: certification, error: certError } = await supabase
      .from('certifications')
      .select('id, organization_id')
      .eq('id', dto.certification_id)
      .eq('organization_id', organizationId)
      .single();

    if (certError || !certification) {
      throw new BadRequestException(
        'Certification not found or does not belong to organization',
      );
    }

    const { data, error } = await supabase
      .from('compliance_checks')
      .insert({
        organization_id: organizationId,
        certification_id: dto.certification_id,
        check_type: dto.check_type,
        check_date: dto.check_date,
        status: dto.status,
        findings: dto.findings || [],
        corrective_actions: dto.corrective_actions || [],
        next_check_date: dto.next_check_date,
        auditor_name: dto.auditor_name,
        score: dto.score,
      })
      .select(
        `
        *,
        certification:certifications(id, certification_type, certification_number)
      `,
      )
      .single();

    if (error) {
      this.logger.error(`Failed to create compliance check: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to create compliance check',
      );
    }

    this.logger.log(
      `Compliance check created: ${data.id} for org ${organizationId}`,
    );
    return data;
  }

  /**
   * Update a compliance check
   */
  async updateCheck(
    organizationId: string,
    checkId: string,
    dto: UpdateComplianceCheckDto,
  ) {
    const supabase = this.databaseService.getAdminClient();

    // Verify check exists and belongs to organization
    const { data: existing, error: fetchError } = await supabase
      .from('compliance_checks')
      .select('id')
      .eq('id', checkId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException('Compliance check not found');
    }

    const { data, error } = await supabase
      .from('compliance_checks')
      .update(dto)
      .eq('id', checkId)
      .eq('organization_id', organizationId)
      .select(
        `
        *,
        certification:certifications(id, certification_type, certification_number)
      `,
      )
      .single();

    if (error) {
      this.logger.error(`Failed to update compliance check: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to update compliance check',
      );
    }

    this.logger.log(`Compliance check updated: ${checkId}`);
    return data;
  }

  /**
   * Delete a compliance check
   */
  async removeCheck(organizationId: string, checkId: string) {
    const supabase = this.databaseService.getAdminClient();

    const { error } = await supabase
      .from('compliance_checks')
      .delete()
      .eq('id', checkId)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete compliance check: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to delete compliance check',
      );
    }

    this.logger.log(`Compliance check deleted: ${checkId}`);
  }

  // ============================================================================
  // REQUIREMENTS OPERATIONS
  // ============================================================================

  /**
   * Get compliance requirements by certification type
   */
  async findRequirements(certificationType?: string) {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('compliance_requirements')
      .select('*')
      .order('requirement_code');

    if (certificationType) {
      query = query.eq('certification_type', certificationType);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(
        `Failed to fetch compliance requirements: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to fetch compliance requirements',
      );
    }

    return data || [];
  }

  // ============================================================================
  // EVIDENCE OPERATIONS
  // ============================================================================

  /**
   * Create evidence for a compliance check
   */
  async createEvidence(organizationId: string, dto: CreateEvidenceDto) {
    const supabase = this.databaseService.getAdminClient();

    // Verify compliance check exists and belongs to organization
    const { data: check, error: checkError } = await supabase
      .from('compliance_checks')
      .select('id, organization_id')
      .eq('id', dto.compliance_check_id)
      .eq('organization_id', organizationId)
      .single();

    if (checkError || !check) {
      throw new BadRequestException(
        'Compliance check not found or does not belong to organization',
      );
    }

    const { data, error } = await supabase
      .from('compliance_evidence')
      .insert({
        compliance_check_id: dto.compliance_check_id,
        evidence_type: dto.evidence_type,
        file_url: dto.file_url,
        description: dto.description,
        uploaded_by: dto.uploaded_by,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create evidence: ${error.message}`);
      throw new InternalServerErrorException('Failed to create evidence');
    }

    this.logger.log(
      `Evidence created: ${data.id} for check ${dto.compliance_check_id}`,
    );
    return data;
  }

  // ============================================================================
  // DASHBOARD STATISTICS
  // ============================================================================

  /**
   * Get compliance dashboard statistics
   */
  async getDashboardStats(organizationId: string) {
    const supabase = this.databaseService.getAdminClient();

    try {
      // Get all certifications
      const { data: certifications, error: certError } = await supabase
        .from('certifications')
        .select('id, status, expiry_date')
        .eq('organization_id', organizationId);

      if (certError) {
        throw certError;
      }

      const totalCertifications = certifications?.length || 0;
      const activeCertifications =
        certifications?.filter((c) => c.status === 'active').length || 0;

      // Calculate expiring soon (within 90 days)
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const expiringSoon =
        certifications?.filter((c) => {
          const expiryDate = new Date(c.expiry_date);
          return (
            c.status === 'active' &&
            expiryDate <= ninetyDaysFromNow &&
            expiryDate > new Date()
          );
        }).length || 0;

      // Get recent compliance checks (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentChecks, error: checksError } = await supabase
        .from('compliance_checks')
        .select(
          `
          id,
          check_type,
          check_date,
          status,
          score,
          certification:certifications(certification_type)
        `,
        )
        .eq('organization_id', organizationId)
        .gte('check_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('check_date', { ascending: false })
        .limit(10);

      if (checksError) {
        throw checksError;
      }

      // Get all checks for statistics
      const { data: allChecks, error: allChecksError } = await supabase
        .from('compliance_checks')
        .select('status, score')
        .eq('organization_id', organizationId);

      if (allChecksError) {
        throw allChecksError;
      }

      const nonCompliantCount =
        allChecks?.filter((c) => c.status === 'non_compliant').length || 0;

      // Calculate average compliance score
      const checksWithScore = allChecks?.filter((c) => c.score !== null) || [];
      const averageScore =
        checksWithScore.length > 0
          ? checksWithScore.reduce((sum, c) => sum + (c.score || 0), 0) /
            checksWithScore.length
          : 0;

      return {
        certifications: {
          total: totalCertifications,
          active: activeCertifications,
          expiring_soon: expiringSoon,
        },
        checks: {
          recent: recentChecks || [],
          non_compliant_count: nonCompliantCount,
          average_score: Math.round(averageScore * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch dashboard stats: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to fetch dashboard statistics',
      );
    }
  }

  // ============================================================================
  // AUDIT REMINDER SCHEDULING
  // ============================================================================

  async scheduleAuditReminders(certification: {
    id: string;
    organization_id: string;
    audit_schedule?: { next_audit_date?: string };
  }) {
    const supabase = this.databaseService.getAdminClient();
    const auditDateStr = certification.audit_schedule?.next_audit_date;

    if (!auditDateStr) {
      return;
    }

    const auditDate = new Date(auditDateStr);
    const now = new Date();

    const { error: deleteError } = await supabase
      .from('audit_reminders')
      .delete()
      .eq('certification_id', certification.id)
      .is('sent_at', null);

    if (deleteError) {
      this.logger.error(`Failed to delete old reminders: ${deleteError.message}`);
    }

    const reminderConfigs = [
      { type: '30_days', daysBefore: 30 },
      { type: '14_days', daysBefore: 14 },
      { type: '7_days', daysBefore: 7 },
      { type: '1_day', daysBefore: 1 },
    ];

    const remindersToInsert: Array<{
      certification_id: string;
      organization_id: string;
      reminder_type: string;
      scheduled_for: string;
    }> = [];

    for (const config of reminderConfigs) {
      const reminderDate = new Date(auditDate);
      reminderDate.setDate(reminderDate.getDate() - config.daysBefore);

      if (reminderDate > now) {
        remindersToInsert.push({
          certification_id: certification.id,
          organization_id: certification.organization_id,
          reminder_type: config.type,
          scheduled_for: reminderDate.toISOString(),
        });
      }
    }

    if (remindersToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('audit_reminders')
        .upsert(remindersToInsert, {
          onConflict: 'certification_id,reminder_type',
        });

      if (insertError) {
        this.logger.error(`Failed to schedule audit reminders: ${insertError.message}`);
      } else {
        this.logger.log(
          `Scheduled ${remindersToInsert.length} audit reminders for certification ${certification.id}`,
        );
      }
    }
  }
}
