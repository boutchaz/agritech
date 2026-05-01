import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  payrollRunsApi,
  salarySlipsApi,
  salaryStructuresApi,
  type CreateAssignmentInput,
  type CreatePayrollRunInput,
  type CreateSalaryStructureInput,
  type GenerateSlipInput,
  type SalaryComponent,
  type SlipStatus,
  type UpdateSalaryStructureInput,
} from '@/lib/api/payroll';

const k = (orgId: string | null, ...rest: unknown[]) => ['hr', orgId, ...rest];

// ── Salary Structures ────────────────────────────────────────────

export function useSalaryStructures(orgId: string | null) {
  return useQuery({
    queryKey: k(orgId, 'salary-structures'),
    queryFn: () => salaryStructuresApi.list(orgId!),
    enabled: !!orgId,
  });
}

export function useSalaryStructure(orgId: string | null, id: string | null) {
  return useQuery({
    queryKey: k(orgId, 'salary-structures', id),
    queryFn: () => salaryStructuresApi.getOne(orgId!, id!),
    enabled: !!orgId && !!id,
  });
}

export function useCreateSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateSalaryStructureInput }) =>
      salaryStructuresApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k(v.orgId, 'salary-structures') }),
  });
}

export function useUpdateSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateSalaryStructureInput }) =>
      salaryStructuresApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k(v.orgId, 'salary-structures') }),
  });
}

export function useDeleteSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      salaryStructuresApi.remove(orgId, id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k(v.orgId, 'salary-structures') }),
  });
}

export function useReplaceComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, components }: { orgId: string; id: string; components: SalaryComponent[] }) =>
      salaryStructuresApi.replaceComponents(orgId, id, components),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k(v.orgId, 'salary-structures') }),
  });
}

export function useStructureAssignments(orgId: string | null, workerId?: string) {
  return useQuery({
    queryKey: k(orgId, 'structure-assignments', workerId),
    queryFn: () => salaryStructuresApi.listAssignments(orgId!, workerId),
    enabled: !!orgId,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateAssignmentInput }) =>
      salaryStructuresApi.createAssignment(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k(v.orgId, 'structure-assignments') }),
  });
}

// ── Payroll Runs ─────────────────────────────────────────────────

export function usePayrollRuns(orgId: string | null) {
  return useQuery({
    queryKey: k(orgId, 'payroll-runs'),
    queryFn: () => payrollRunsApi.list(orgId!),
    enabled: !!orgId,
  });
}

export function usePayrollRun(orgId: string | null, id: string | null) {
  return useQuery({
    queryKey: k(orgId, 'payroll-runs', id),
    queryFn: () => payrollRunsApi.getOne(orgId!, id!),
    enabled: !!orgId && !!id,
  });
}

export function useCreatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreatePayrollRunInput }) =>
      payrollRunsApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k(v.orgId, 'payroll-runs') }),
  });
}

function invalidateRunAndSlips(qc: ReturnType<typeof useQueryClient>, orgId: string) {
  qc.invalidateQueries({ queryKey: k(orgId, 'payroll-runs') });
  qc.invalidateQueries({ queryKey: k(orgId, 'salary-slips') });
}

export function useGeneratePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      payrollRunsApi.generate(orgId, id),
    onSuccess: (_d, v) => invalidateRunAndSlips(qc, v.orgId),
  });
}

export function useSubmitPayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      payrollRunsApi.submit(orgId, id),
    onSuccess: (_d, v) => invalidateRunAndSlips(qc, v.orgId),
  });
}

export function useCancelPayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      payrollRunsApi.cancel(orgId, id),
    onSuccess: (_d, v) => invalidateRunAndSlips(qc, v.orgId),
  });
}

// ── Salary Slips ─────────────────────────────────────────────────

export function useSalarySlips(
  orgId: string | null,
  filters: { worker_id?: string; payroll_run_id?: string; from?: string; to?: string; status?: SlipStatus } = {},
) {
  return useQuery({
    queryKey: k(orgId, 'salary-slips', filters),
    queryFn: () => salarySlipsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useSalarySlip(orgId: string | null, id: string | null) {
  return useQuery({
    queryKey: k(orgId, 'salary-slips', id),
    queryFn: () => salarySlipsApi.getOne(orgId!, id!),
    enabled: !!orgId && !!id,
  });
}

export function useGenerateSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: GenerateSlipInput }) =>
      salarySlipsApi.generate(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k(v.orgId, 'salary-slips') }),
  });
}

export function useSlipAction(action: 'submit' | 'pay' | 'cancel') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      salarySlipsApi[action](orgId, id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k(v.orgId, 'salary-slips') }),
  });
}
