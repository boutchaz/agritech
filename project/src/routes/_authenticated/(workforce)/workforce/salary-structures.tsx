import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, UserPlus, Pencil, Building2, Users, Layers } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useCreateAssignment,
  useCreateSalaryStructure,
  useDeleteSalaryStructure,
  useReplaceComponents,
  useSalaryStructures,
  useStructureAssignments,
  useUpdateSalaryStructure,
} from '@/hooks/usePayroll';
import type {
  CreateSalaryStructureInput,
  SalaryComponent,
  SalaryStructure,
} from '@/lib/api/payroll';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { format } from 'date-fns';

export const Route = createFileRoute(
  '/_authenticated/(workforce)/workforce/salary-structures',
)({
  component: withRouteProtection(SalaryStructuresPage, 'manage', 'SalaryStructure'),
});

const COMPONENT_CATEGORIES: SalaryComponent['category'][] = [
  'basic_salary', 'housing_allowance', 'transport_allowance', 'family_allowance',
  'overtime', 'bonus', 'commission', 'other_earning',
  'cnss_employee', 'cnss_employer', 'amo_employee', 'amo_employer',
  'cis_employee', 'cis_employer',
  'income_tax', 'professional_tax',
  'advance_deduction', 'loan_deduction', 'other_deduction',
];

function SalaryStructuresPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const query = useSalaryStructures(orgId);
  const create = useCreateSalaryStructure();
  const update = useUpdateSalaryStructure();
  const remove = useDeleteSalaryStructure();
  const replaceComponents = useReplaceComponents();

  const [editing, setEditing] = useState<SalaryStructure | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<SalaryStructure | null>(null);

  if (!orgId) return null;
  const structures = query.data ?? [];

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: Layers, label: t('salaryStructures.title', 'Salary Structures'), isActive: true },
        ]}
        title={t('salaryStructures.title', 'Salary Structures')}
        subtitle={t(
          'salaryStructures.subtitle',
          'Define payroll templates and their components. Assign workers to a structure to drive their payslips.',
        )}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('common.create', 'Create')}
          </Button>
        }
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : structures.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('salaryStructures.empty', 'No salary structures yet.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {structures.map((s) => (
            <Card key={s.id} className={s.is_active ? '' : 'opacity-60'}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {s.name}
                    {s.is_default && <Badge variant="default">{t('common.default', 'Default')}</Badge>}
                    {!s.is_active && <Badge variant="outline">{t('common.inactive', 'Inactive')}</Badge>}
                  </CardTitle>
                  {s.description && (
                    <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {t('common.currency', 'Currency')}: {s.currency} · {(s.applicable_worker_types ?? []).join(', ')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAssigning(s)}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    {t('salaryStructures.assign', 'Assign')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(s)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    {t('common.edit', 'Edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!confirm(t('salaryStructures.confirmDelete', 'Delete this structure?'))) return;
                      remove.mutate(
                        { orgId, id: s.id },
                        { onSuccess: () => toast.success(t('common.deleted', 'Deleted')) },
                      );
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(s.components?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {t('salaryStructures.noComponents', 'No components — edit to add some.')}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded border dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                        <tr>
                          <Th>{t('common.name', 'Name')}</Th>
                          <Th>{t('common.type', 'Type')}</Th>
                          <Th>{t('salaryStructures.category', 'Category')}</Th>
                          <Th>{t('salaryStructures.calculation', 'Calculation')}</Th>
                          <Th className="text-right">{t('common.amount', 'Amount')}</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...(s.components ?? [])]
                          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                          .map((c, idx) => (
                            <tr key={c.id ?? idx} className="border-t dark:border-gray-700">
                              <td className="px-3 py-2">{c.name}</td>
                              <td className="px-3 py-2">
                                <Badge variant={c.component_type === 'earning' ? 'default' : 'destructive'}>
                                  {c.component_type}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-gray-600">{c.category}</td>
                              <td className="px-3 py-2 text-gray-600">{c.calculation_type}</td>
                              <td className="px-3 py-2 text-right">
                                {c.calculation_type === 'fixed' && c.amount}
                                {c.calculation_type === 'percentage_of_basic' && `${c.percentage}%`}
                                {c.calculation_type === 'formula' && '—'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <StructureFormDialog
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (data, components) => {
            if (editing) {
              await update.mutateAsync({ orgId, id: editing.id, data });
              await replaceComponents.mutateAsync({ orgId, id: editing.id, components });
            } else {
              await create.mutateAsync({ orgId, data: { ...data, components } });
            }
            toast.success(t('common.saved', 'Saved'));
          }}
        />
      )}

      {assigning && (
        <AssignDialog
          orgId={orgId}
          structure={assigning}
          onClose={() => setAssigning(null)}
        />
      )}
      </div>
    </>
  );
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>;
}

function StructureFormDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: SalaryStructure | null;
  onClose: () => void;
  onSubmit: (data: CreateSalaryStructureInput, components: SalaryComponent[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CreateSalaryStructureInput>(() =>
    initial
      ? {
          name: initial.name,
          description: initial.description ?? '',
          applicable_worker_types: initial.applicable_worker_types,
          is_default: initial.is_default,
          is_active: initial.is_active,
          currency: initial.currency,
        }
      : {
          name: '',
          description: '',
          applicable_worker_types: ['fixed_salary'],
          is_default: false,
          is_active: true,
          currency: 'MAD',
        },
  );
  const [components, setComponents] = useState<SalaryComponent[]>(
    initial?.components ?? [],
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateSalaryStructureInput>(key: K, v: CreateSalaryStructureInput[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const addComponent = () =>
    setComponents((cs) => [
      ...cs,
      {
        name: '',
        component_type: 'earning',
        category: 'basic_salary',
        calculation_type: 'fixed',
        amount: 0,
        is_taxable: true,
        depends_on_payment_days: true,
        sort_order: cs.length,
      },
    ]);

  const updateComponent = (idx: number, patch: Partial<SalaryComponent>) =>
    setComponents((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const removeComponent = (idx: number) =>
    setComponents((cs) => cs.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!draft.name.trim()) {
      toast.error(t('validation.nameRequired', 'Name is required'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(draft, components);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? t('common.errorOccurred', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="3xl"
      title={initial ? t('salaryStructures.edit', 'Edit structure') : t('salaryStructures.create', 'Create structure')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('common.name', 'Name')}</Label>
            <Input value={draft.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t('common.currency', 'Currency')}</Label>
            <Input value={draft.currency ?? 'MAD'} onChange={(e) => set('currency', e.target.value.toUpperCase())} maxLength={3} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>{t('common.description', 'Description')}</Label>
          <Input value={draft.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="flex gap-6">
          <ToggleRow
            label={t('common.default', 'Default')}
            checked={!!draft.is_default}
            onChange={(v) => set('is_default', v)}
          />
          <ToggleRow
            label={t('common.active', 'Active')}
            checked={draft.is_active !== false}
            onChange={(v) => set('is_active', v)}
          />
        </div>

        <div className="border-t pt-4 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">{t('salaryStructures.components', 'Components')}</h3>
            <Button variant="outline" size="sm" onClick={addComponent}>
              <Plus className="w-4 h-4 mr-1" />
              {t('common.add', 'Add')}
            </Button>
          </div>
          {components.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {t('salaryStructures.noComponents', 'No components yet.')}
            </p>
          ) : (
            <div className="space-y-2">
              {components.map((c, idx) => (
                <div key={idx} className="border rounded p-3 dark:border-gray-700 space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">{t('common.name', 'Name')}</Label>
                      <Input
                        value={c.name}
                        onChange={(e) => updateComponent(idx, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 w-32">
                      <Label className="text-xs">{t('common.type', 'Type')}</Label>
                      <Select
                        value={c.component_type}
                        onValueChange={(v) => updateComponent(idx, { component_type: v as any })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="earning">earning</SelectItem>
                          <SelectItem value="deduction">deduction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 w-44">
                      <Label className="text-xs">{t('salaryStructures.category', 'Category')}</Label>
                      <Select
                        value={c.category}
                        onValueChange={(v) => updateComponent(idx, { category: v as any })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COMPONENT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeComponent(idx)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('salaryStructures.calculation', 'Calculation')}</Label>
                      <Select
                        value={c.calculation_type}
                        onValueChange={(v) => updateComponent(idx, { calculation_type: v as any })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">fixed</SelectItem>
                          <SelectItem value="percentage_of_basic">percentage_of_basic</SelectItem>
                          <SelectItem value="formula">formula</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {c.calculation_type === 'fixed' && (
                      <div className="space-y-1">
                        <Label className="text-xs">{t('common.amount', 'Amount')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={c.amount ?? 0}
                          onChange={(e) => updateComponent(idx, { amount: Number(e.target.value) })}
                        />
                      </div>
                    )}
                    {c.calculation_type === 'percentage_of_basic' && (
                      <div className="space-y-1">
                        <Label className="text-xs">{t('salaryStructures.percentage', '%')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={c.percentage ?? 0}
                          onChange={(e) => updateComponent(idx, { percentage: Number(e.target.value) })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function ToggleRow({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <Label className="cursor-pointer">{label}</Label>
    </div>
  );
}

function AssignDialog({
  orgId,
  structure,
  onClose,
}: {
  orgId: string;
  structure: SalaryStructure;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const workersQuery = useWorkers(orgId);
  const assignmentsQuery = useStructureAssignments(orgId);
  const create = useCreateAssignment();

  const [workerId, setWorkerId] = useState('');
  const [baseAmount, setBaseAmount] = useState(0);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const workers: any[] = Array.isArray(workersQuery.data) ? workersQuery.data : [];
  const existingForStructure = (assignmentsQuery.data ?? []).filter(
    (a) => a.salary_structure_id === structure.id,
  );

  const handleSubmit = async () => {
    if (!workerId || baseAmount <= 0) {
      toast.error(t('validation.allFieldsRequired', 'All fields are required'));
      return;
    }
    setSubmitting(true);
    try {
      await create.mutateAsync({
        orgId,
        data: {
          worker_id: workerId,
          salary_structure_id: structure.id,
          base_amount: baseAmount,
          effective_from: effectiveFrom,
        },
      });
      toast.success(t('common.assigned', 'Assigned'));
      setWorkerId('');
      setBaseAmount(0);
    } catch (err: any) {
      toast.error(err?.message ?? t('common.errorOccurred', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="2xl"
      title={t('salaryStructures.assignTitle', 'Assign workers to {{name}}', { name: structure.name })}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('common.close', 'Close')}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="border rounded p-3 dark:border-gray-700 space-y-3">
          <h3 className="font-medium text-sm">{t('salaryStructures.newAssignment', 'New assignment')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>{t('common.worker', 'Worker')}</Label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger><SelectValue placeholder={t('common.select', 'Select')} /></SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.first_name} {w.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('salaryStructures.baseAmount', 'Base amount')}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={baseAmount}
                onChange={(e) => setBaseAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('salaryStructures.effectiveFrom', 'Effective from')}</Label>
              <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.assign', 'Assign')}
          </Button>
        </div>

        <div>
          <h3 className="font-medium text-sm mb-2">
            {t('salaryStructures.assignedWorkers', 'Assigned workers')}
          </h3>
          {existingForStructure.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {t('common.none', 'None')}
            </p>
          ) : (
            <div className="space-y-1">
              {existingForStructure.map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between items-center text-sm border rounded px-3 py-2 dark:border-gray-700"
                >
                  <span>
                    {a.worker?.first_name} {a.worker?.last_name}
                  </span>
                  <span className="text-gray-500">
                    {a.base_amount} · {format(new Date(a.effective_from), 'PP')}
                    {a.effective_to && ` → ${format(new Date(a.effective_to), 'PP')}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
