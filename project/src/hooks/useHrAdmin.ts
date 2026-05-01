import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  appraisalCyclesApi,
  appraisalsApi,
  expenseCategoriesApi,
  expenseClaimsApi,
  feedbackApi,
  interviewsApi,
  jobApplicantsApi,
  jobOpeningsApi,
  type ApplicantStatus,
  type AppraisalStatus,
  type CreateApplicantInput,
  type CreateCycleInput,
  type CreateExpenseClaimInput,
  type CreateFeedbackInput,
  type CreateInterviewInput,
  type CreateOpeningInput,
  type ExpenseClaimStatus,
  type InterviewStatus,
  type OpeningStatus,
  type UpdateAppraisalInput,
} from '@/lib/api/hr-admin';

const orgKey = (orgId: string | null, ...rest: unknown[]) => ['hr', orgId, ...rest];

// ── Expense Claims ──────────────────────────────────────────────────

export function useExpenseCategories(orgId: string | null) {
  return useQuery({
    queryKey: orgKey(orgId, 'expense-categories'),
    queryFn: () => expenseCategoriesApi.list(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: { name: string; description?: string } }) =>
      expenseCategoriesApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'expense-categories') }),
  });
}

export function useExpenseClaims(
  orgId: string | null,
  filters: { worker_id?: string; status?: ExpenseClaimStatus; from?: string; to?: string } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'expense-claims', filters),
    queryFn: () => expenseClaimsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateExpenseClaimInput }) =>
      expenseClaimsApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'expense-claims') }),
  });
}

export function useApproveExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, notes }: { orgId: string; id: string; notes?: string }) =>
      expenseClaimsApi.approve(orgId, id, notes),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'expense-claims') }),
  });
}

export function useRejectExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, reason }: { orgId: string; id: string; reason: string }) =>
      expenseClaimsApi.reject(orgId, id, reason),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'expense-claims') }),
  });
}

export function useDeleteExpenseClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      expenseClaimsApi.remove(orgId, id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'expense-claims') }),
  });
}

// ── Recruitment ─────────────────────────────────────────────────────

export function useJobOpenings(
  orgId: string | null,
  filters: { status?: OpeningStatus; farm_id?: string } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'job-openings', filters),
    queryFn: () => jobOpeningsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateJobOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateOpeningInput }) =>
      jobOpeningsApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'job-openings') }),
  });
}

export function useUpdateJobOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: Partial<CreateOpeningInput> }) =>
      jobOpeningsApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'job-openings') }),
  });
}

export function useDeleteJobOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) => jobOpeningsApi.remove(orgId, id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'job-openings') }),
  });
}

export function useJobApplicants(
  orgId: string | null,
  filters: { job_opening_id?: string; status?: ApplicantStatus } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'job-applicants', filters),
    queryFn: () => jobApplicantsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateApplicantInput }) =>
      jobApplicantsApi.create(orgId, data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'job-applicants') });
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'job-openings') });
    },
  });
}

export function useUpdateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      id,
      data,
    }: {
      orgId: string;
      id: string;
      data: Partial<CreateApplicantInput> & { status?: ApplicantStatus; rating?: number };
    }) => jobApplicantsApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'job-applicants') }),
  });
}

export function useInterviews(orgId: string | null, applicantId?: string) {
  return useQuery({
    queryKey: orgKey(orgId, 'interviews', applicantId),
    queryFn: () => interviewsApi.list(orgId!, applicantId),
    enabled: !!orgId,
  });
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateInterviewInput }) =>
      interviewsApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'interviews') }),
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      id,
      data,
    }: {
      orgId: string;
      id: string;
      data: Partial<CreateInterviewInput> & { status?: InterviewStatus };
    }) => interviewsApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'interviews') }),
  });
}

// ── Performance ─────────────────────────────────────────────────────

export function useAppraisalCycles(orgId: string | null) {
  return useQuery({
    queryKey: orgKey(orgId, 'appraisal-cycles'),
    queryFn: () => appraisalCyclesApi.list(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateCycleInput }) =>
      appraisalCyclesApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'appraisal-cycles') }),
  });
}

export function useUpdateCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: Partial<CreateCycleInput> }) =>
      appraisalCyclesApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'appraisal-cycles') }),
  });
}

export function useBulkCreateAppraisals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, cycleId, worker_ids }: { orgId: string; cycleId: string; worker_ids: string[] }) =>
      appraisalCyclesApi.bulkCreate(orgId, cycleId, worker_ids),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'appraisals') }),
  });
}

export function useAppraisals(
  orgId: string | null,
  filters: { cycle_id?: string; worker_id?: string; status?: AppraisalStatus } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'appraisals', filters),
    queryFn: () => appraisalsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useUpdateAppraisal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateAppraisalInput }) =>
      appraisalsApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'appraisals') }),
  });
}

export function useFeedback(orgId: string | null, workerId?: string) {
  return useQuery({
    queryKey: orgKey(orgId, 'performance-feedback', workerId),
    queryFn: () => feedbackApi.list(orgId!, workerId),
    enabled: !!orgId,
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateFeedbackInput }) =>
      feedbackApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'performance-feedback') }),
  });
}
