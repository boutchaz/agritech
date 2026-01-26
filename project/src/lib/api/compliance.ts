import { apiClient } from '../api-client';

// =====================================================
// TYPES - ENUMS
// =====================================================

export enum CertificationType {
  GLOBALGAP = 'GlobalGAP',
  HACCP = 'HACCP',
  ISO9001 = 'ISO9001',
  ISO14001 = 'ISO14001',
  ORGANIC = 'Organic',
  FAIRTRADE = 'FairTrade',
  RAINFOREST = 'Rainforest',
  USDA_ORGANIC = 'USDA_Organic',
}

export enum CertificationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PENDING_RENEWAL = 'pending_renewal',
  SUSPENDED = 'suspended',
}

export enum ComplianceCheckType {
  PESTICIDE_USAGE = 'pesticide_usage',
  TRACEABILITY = 'traceability',
  WORKER_SAFETY = 'worker_safety',
  RECORD_KEEPING = 'record_keeping',
  ENVIRONMENTAL = 'environmental',
  QUALITY_CONTROL = 'quality_control',
}

export enum ComplianceCheckStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  NEEDS_REVIEW = 'needs_review',
  IN_PROGRESS = 'in_progress',
}

export enum EvidenceType {
  DOCUMENT = 'document',
  PHOTO = 'photo',
  VIDEO = 'video',
  INSPECTION_REPORT = 'inspection_report',
  TEST_RESULT = 'test_result',
  RECORD = 'record',
  CERTIFICATE = 'certificate',
  OTHER = 'other',
}

// =====================================================
// TYPES - DTOs
// =====================================================

export interface DocumentDto {
  url: string;
  type: string;
  uploaded_at: string;
  name?: string;
  size?: number;
  mime_type?: string;
}

export interface AuditScheduleDto {
  next_audit_date?: string;
  audit_frequency?: string;
  auditor_name?: string;
}

export interface CreateCertificationDto {
  certification_type: CertificationType;
  certification_number: string;
  issued_date: string;
  expiry_date: string;
  status: CertificationStatus;
  issuing_body: string;
  scope?: string;
  documents?: DocumentDto[];
  audit_schedule?: AuditScheduleDto;
}

export interface UpdateCertificationDto {
  certification_type?: CertificationType;
  certification_number?: string;
  issued_date?: string;
  expiry_date?: string;
  status?: CertificationStatus;
  issuing_body?: string;
  scope?: string;
  documents?: DocumentDto[];
  audit_schedule?: AuditScheduleDto;
}

export interface CertificationResponseDto {
  id: string;
  organization_id: string;
  certification_type: CertificationType;
  certification_number: string;
  issued_date: string;
  expiry_date: string;
  status: CertificationStatus;
  issuing_body: string;
  scope?: string;
  documents?: DocumentDto[];
  audit_schedule?: AuditScheduleDto;
  created_at: string;
  updated_at: string;
}

export interface FindingDto {
  requirement_code: string;
  finding_description: string;
  severity: string;
}

export interface CorrectiveActionDto {
  action_description: string;
  due_date: string;
  responsible_person: string;
  status: string;
}

export interface CreateComplianceCheckDto {
  certification_id: string;
  check_type: ComplianceCheckType;
  check_date: string;
  status: ComplianceCheckStatus;
  findings?: FindingDto[];
  corrective_actions?: CorrectiveActionDto[];
  next_check_date?: string;
  auditor_name?: string;
  score?: number;
}

export interface UpdateComplianceCheckDto {
  certification_id?: string;
  check_type?: ComplianceCheckType;
  check_date?: string;
  status?: ComplianceCheckStatus;
  findings?: FindingDto[];
  corrective_actions?: CorrectiveActionDto[];
  next_check_date?: string;
  auditor_name?: string;
  score?: number;
}

export interface ComplianceCheckResponseDto {
  id: string;
  organization_id: string;
  certification_id: string;
  check_type: ComplianceCheckType;
  check_date: string;
  status: ComplianceCheckStatus;
  findings?: FindingDto[];
  corrective_actions?: CorrectiveActionDto[];
  next_check_date?: string;
  auditor_name?: string;
  score?: number;
  created_at: string;
  updated_at: string;
  // Joined data
  certification?: CertificationResponseDto;
}

export interface CreateEvidenceDto {
  compliance_check_id: string;
  evidence_type: EvidenceType;
  file_url: string;
  description?: string;
  uploaded_by: string;
}

export interface EvidenceResponseDto {
  id: string;
  organization_id: string;
  compliance_check_id: string;
  evidence_type: EvidenceType;
  file_url: string;
  description?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceRequirementDto {
  id: string;
  certification_type: CertificationType;
  requirement_code: string;
  requirement_description: string;
  category: string;
  severity: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceDashboardStats {
  certifications: {
    total: number;
    active: number;
    expiring_soon: number;
  };
  checks: {
    recent: ComplianceCheckResponseDto[];
    non_compliant_count: number;
    average_score: number;
  };
}

// =====================================================
// API CLIENT
// =====================================================

const API_BASE = '/api/v1/compliance';

export const complianceApi = {
  /**
   * Get all certifications for organization
   */
  async getCertifications(organizationId: string): Promise<CertificationResponseDto[]> {
    return apiClient.get<CertificationResponseDto[]>(
      `${API_BASE}/certifications`,
      {},
      organizationId
    );
  },

  /**
   * Get single certification by ID
   */
  async getCertification(
    organizationId: string,
    certificationId: string
  ): Promise<CertificationResponseDto> {
    return apiClient.get<CertificationResponseDto>(
      `${API_BASE}/certifications/${certificationId}`,
      {},
      organizationId
    );
  },

  /**
   * Create new certification
   */
  async createCertification(
    organizationId: string,
    data: CreateCertificationDto
  ): Promise<CertificationResponseDto> {
    return apiClient.post<CertificationResponseDto>(
      `${API_BASE}/certifications`,
      data,
      {},
      organizationId
    );
  },

  /**
   * Update certification
   */
  async updateCertification(
    organizationId: string,
    certificationId: string,
    data: UpdateCertificationDto
  ): Promise<CertificationResponseDto> {
    return apiClient.patch<CertificationResponseDto>(
      `${API_BASE}/certifications/${certificationId}`,
      data,
      {},
      organizationId
    );
  },

  /**
   * Delete certification
   */
  async deleteCertification(organizationId: string, certificationId: string): Promise<void> {
    return apiClient.delete<void>(
      `${API_BASE}/certifications/${certificationId}`,
      {},
      organizationId
    );
  },

  /**
   * Get all compliance checks for organization
   */
  async getComplianceChecks(organizationId: string): Promise<ComplianceCheckResponseDto[]> {
    return apiClient.get<ComplianceCheckResponseDto[]>(
      `${API_BASE}/checks`,
      {},
      organizationId
    );
  },

  /**
   * Get single compliance check by ID
   */
  async getComplianceCheck(
    organizationId: string,
    checkId: string
  ): Promise<ComplianceCheckResponseDto> {
    return apiClient.get<ComplianceCheckResponseDto>(
      `${API_BASE}/checks/${checkId}`,
      {},
      organizationId
    );
  },

  /**
   * Create new compliance check
   */
  async createComplianceCheck(
    organizationId: string,
    data: CreateComplianceCheckDto
  ): Promise<ComplianceCheckResponseDto> {
    return apiClient.post<ComplianceCheckResponseDto>(
      `${API_BASE}/checks`,
      data,
      {},
      organizationId
    );
  },

  /**
   * Update compliance check
   */
  async updateComplianceCheck(
    organizationId: string,
    checkId: string,
    data: UpdateComplianceCheckDto
  ): Promise<ComplianceCheckResponseDto> {
    return apiClient.patch<ComplianceCheckResponseDto>(
      `${API_BASE}/checks/${checkId}`,
      data,
      {},
      organizationId
    );
  },

  /**
   * Delete compliance check
   */
  async deleteComplianceCheck(organizationId: string, checkId: string): Promise<void> {
    return apiClient.delete<void>(
      `${API_BASE}/checks/${checkId}`,
      {},
      organizationId
    );
  },

  /**
   * Get compliance requirements, optionally filtered by certification type
   */
  async getComplianceRequirements(
    certificationType?: string
  ): Promise<ComplianceRequirementDto[]> {
    const params = certificationType ? { certification_type: certificationType } : {};
    return apiClient.get<ComplianceRequirementDto[]>(
      `${API_BASE}/requirements`,
      params as Record<string, string>
    );
  },

  /**
   * Upload compliance evidence
   */
  async createEvidence(
    organizationId: string,
    data: CreateEvidenceDto
  ): Promise<EvidenceResponseDto> {
    return apiClient.post<EvidenceResponseDto>(
      `${API_BASE}/evidence`,
      data,
      {},
      organizationId
    );
  },

  /**
   * Get compliance dashboard statistics
   */
  async getDashboardStats(organizationId: string): Promise<ComplianceDashboardStats> {
    return apiClient.get<ComplianceDashboardStats>(
      `${API_BASE}/dashboard`,
      {},
      organizationId
    );
  },
};
