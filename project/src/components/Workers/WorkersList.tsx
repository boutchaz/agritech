import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  UserX,
  Lock,
  Banknote,
  Download,
  Search,
  MapPin,
  Calendar,
  MoreVertical,
  Users,
} from 'lucide-react';
import {
  useWorkers,
  usePaginatedWorkers,
  useDeactivateWorker,
  useDeleteWorker,
  useWorkersActivitySummary,
} from '../../hooks/useWorkers';
import { useAuth } from '../../hooks/useAuth';
import { getCompensationDisplay } from '../../types/workers';
import type { Worker, WorkerType } from '../../types/workers';
import WorkerForm from './WorkerForm';
import WorkerPaymentDialog from './WorkerPaymentDialog';
import { Can } from '../authorization/Can';
import { useCan } from '../../lib/casl/AbilityContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { DataTablePagination, useServerTableState } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WorkersListProps {
  organizationId: string;
  farms: Array<{ id: string; name: string }>;
}

interface ConfirmActionState {
  title: string;
  description?: string;
  variant?: 'destructive' | 'default';
  onConfirm: () => Promise<void> | void;
}

const DEFAULT_CONFIRM_ACTION: ConfirmActionState = {
  title: '',
  onConfirm: () => {},
};

const AVATAR_PALETTE = [
  'bg-pink-200 text-pink-700',
  'bg-emerald-200 text-emerald-700',
  'bg-blue-200 text-blue-700',
  'bg-amber-200 text-amber-700',
  'bg-purple-200 text-purple-700',
  'bg-rose-200 text-rose-700',
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function formatMad(amount: number): string {
  try {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} MAD`;
  }
}

interface SparklineProps {
  data?: Array<{ date: string; hours: number; amount: number }>;
  fallbackSeed: string;
  color: 'blue' | 'amber' | 'red';
}

const Sparkline = ({ data, fallbackSeed, color }: SparklineProps) => {
  const stroke =
    color === 'red' ? '#ef4444' : color === 'amber' ? '#f59e0b' : '#3b82f6';
  const fill =
    color === 'red'
      ? 'rgba(239,68,68,0.12)'
      : color === 'amber'
        ? 'rgba(245,158,11,0.15)'
        : 'rgba(59,130,246,0.12)';

  const points = useMemo(() => {
    if (data && data.length > 0) {
      const maxAmount = Math.max(...data.map(d => d.amount), 1);
      return data.map((d, i) => {
        const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
        const y = 30 - (d.amount / maxAmount) * 28 - 1;
        return { x, y: Math.max(1, Math.min(29, y)) };
      });
    }
    const h = hashString(fallbackSeed);
    const n = 10;
    const arr: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      const v =
        0.5 +
        0.25 * Math.sin((h % 360) * 0.05 + i * 0.9) +
        0.15 * Math.cos((h % 720) * 0.03 + i * 1.7);
      const clamped = Math.max(0.05, Math.min(0.95, v));
      arr.push({ x: t * 100, y: 30 - clamped * 28 - 1 });
    }
    return arr;
  }, [data, fallbackSeed]);

  const polylinePts = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPts = `0,30 ${polylinePts} 100,30`;

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-[120px] h-[30px]">
      <polygon points={areaPts} fill={fill} />
      <polyline
        points={polylinePts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const WorkersList = ({ organizationId, farms }: WorkersListProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useCan();
  const { currentFarm, currentOrganization } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState>(DEFAULT_CONFIRM_ACTION);
  const [filterType, setFilterType] = useState<WorkerType | 'all'>('all');
  const [filterActive] = useState<boolean | 'all'>('all');
  const [filterPlatformAccess] = useState<'all' | 'with' | 'without'>('all');
  const [selectedFarm] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [workerToPay, setWorkerToPay] = useState<Worker | null>(null);

  const farmsArray = Array.isArray(farms) ? farms : [];
  const tableState = useServerTableState({
    defaultPageSize: 12,
    defaultSort: { key: 'last_name', direction: 'asc' },
  });

  const { data: workersData = [] } = useWorkers(organizationId);
  const allWorkers = workersData as Worker[];

  const { data: activitySummary = {} } = useWorkersActivitySummary(organizationId, 30);

  const { data: paginatedData, isLoading: _isLoading } = usePaginatedWorkers(organizationId, {
    ...tableState.queryParams,
    workerType: filterType !== 'all' ? filterType : undefined,
    isActive: filterActive === 'all' ? undefined : filterActive,
    farmId: selectedFarm !== 'all' ? selectedFarm : undefined,
    platformAccess: filterPlatformAccess !== 'all' ? filterPlatformAccess : undefined,
  });

  const workers = (paginatedData?.data ?? []) as Worker[];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const deactivateWorker = useDeactivateWorker();
  const deleteWorker = useDeleteWorker();

  const filteredWorkersForStats = useMemo(() => {
    const normalizedSearch = tableState.search.trim().toLowerCase();
    return allWorkers.filter((worker) => {
      const matchesSearch = !normalizedSearch
        || worker.first_name.toLowerCase().includes(normalizedSearch)
        || worker.last_name.toLowerCase().includes(normalizedSearch)
        || worker.cin?.toLowerCase().includes(normalizedSearch);
      const matchesType = filterType === 'all' || worker.worker_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [allWorkers, filterType, tableState.search]);

  // TODO: wire up real pending-payment hook when one exists keyed by worker id.
  // For now, no per-worker pending-payment data is available.
  const hasPendingPayment = (_worker: Worker): boolean => false;
  const pendingAmount = (_worker: Worker): number => 0;

  const stats = useMemo(() => {
    const pendingCount = filteredWorkersForStats.filter(hasPendingPayment).length;
    const pendingTotal = filteredWorkersForStats.reduce((s, w) => s + pendingAmount(w), 0);
    return {
      total: paginatedData?.total ?? filteredWorkersForStats.length,
      fixedSalary: filteredWorkersForStats.filter((w) => w.worker_type === 'fixed_salary').length,
      dailyWorkers: filteredWorkersForStats.filter((w) => w.worker_type === 'daily_worker').length,
      sharecropping: filteredWorkersForStats.filter((w) => w.worker_type === 'metayage').length,
      pendingCount,
      pendingTotal,
    };
  }, [filteredWorkersForStats, paginatedData?.total]);

  const getWorkerTypePillClass = (type: WorkerType) => {
    switch (type) {
      case 'fixed_salary':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200';
      case 'daily_worker':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200';
      case 'metayage':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-200';
    }
  };

  const getWorkerTypeLabel = (type: WorkerType) => t(`workers.workerTypes.${type}`);

  const openCreateForm = () => {
    setSelectedWorker(null);
    setShowForm(true);
  };

  const handleEdit = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowForm(true);
  };

  const handlePayWorker = (worker: Worker) => {
    setWorkerToPay(worker);
    setShowPaymentDialog(true);
  };

  const handleViewWorker = (workerId: string) => {
    navigate({ to: '/workers/$workerId', params: { workerId } });
  };

  const openConfirm = (action: ConfirmActionState) => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleDeactivate = (worker: Worker) => {
    openConfirm({
      title: t('workers.confirmations.deactivate'),
      variant: 'default',
      onConfirm: async () => {
        try {
          await deactivateWorker.mutateAsync({ workerId: worker.id, organizationId });
        } catch (error) {
          console.error('Error deactivating worker:', error);
        }
      },
    });
  };

  const handleDelete = (worker: Worker) => {
    openConfirm({
      title: t('workers.confirmations.delete'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteWorker.mutateAsync({ workerId: worker.id, organizationId });
        } catch (error) {
          console.error('Error deleting worker:', error);
        }
      },
    });
  };

  const handleStatusChange = (value: WorkerType | 'all') => {
    setFilterType(value);
    tableState.setPage(1);
  };

  const filterPills: Array<{ value: WorkerType | 'all'; label: string }> = [
    { value: 'all', label: t('workers.filters.all', 'Tous') },
    { value: 'fixed_salary', label: t('workers.filters.fixedSalary', 'Salaire fixe') },
    { value: 'daily_worker', label: t('workers.filters.dailyWorker', 'Journalier') },
    { value: 'metayage', label: t('workers.filters.metayage', 'Métayage') },
  ];

  const contextName = currentFarm?.name || currentOrganization?.name || '';

  const renderWorkerCard = (worker: Worker) => {
    const initials = `${worker.first_name?.[0] ?? ''}${worker.last_name?.[0] ?? ''}`.toUpperCase();
    const seed = worker.id || `${worker.first_name}-${worker.last_name}`;
    const avatarClass = AVATAR_PALETTE[hashString(seed) % AVATAR_PALETTE.length];
    const due = hasPendingPayment(worker);
    const dueAmount = pendingAmount(worker);
    const accentColor = due
      ? 'bg-red-500'
      : worker.worker_type === 'daily_worker'
        ? 'bg-amber-400'
        : 'bg-emerald-500';
    const sparkColor: 'blue' | 'amber' | 'red' = due
      ? 'red'
      : worker.worker_type === 'daily_worker'
        ? 'amber'
        : 'blue';

    return (
      <div
        key={worker.id}
        role="button"
        tabIndex={0}
        onClick={() => handleViewWorker(worker.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewWorker(worker.id); } }}
        className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-all cursor-pointer active:scale-[0.99]"
      >
        <div className={`absolute inset-y-0 start-0 w-1 ${accentColor}`} aria-hidden />

        {/* Header */}
        <div className="flex items-start gap-3 p-4 ps-5">
          <div
            className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-semibold ${avatarClass}`}
          >
            {initials || '??'}
          </div>
          <div className="flex-1 min-w-0 text-start">
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {worker.first_name} {worker.last_name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {worker.position || t('workers.table.notSpecified')}
            </p>
            {worker.farm_name && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{worker.farm_name}</span>
              </p>
            )}
          </div>
          {due && (
            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {t('workers.badges.due', 'Dû')}
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 px-4 ps-5">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getWorkerTypePillClass(worker.worker_type)}`}
          >
            {getWorkerTypeLabel(worker.worker_type)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                worker.is_active ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            {worker.is_active ? t('workers.table.active') : t('workers.table.inactive')}
          </span>
          {worker.is_cnss_declared && (
            <span className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-0.5 text-xs">
              CNSS
            </span>
          )}
        </div>

        {/* Compensation + sparkline */}
        <div className="flex items-end justify-between gap-3 px-4 ps-5 mt-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('workers.table.compensation', 'Compensation')}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {getCompensationDisplay(worker)}
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              {t('workers.sparkline.last30Days', '30 derniers j')}
            </p>
            <Sparkline data={activitySummary[worker.id]?.days} fallbackSeed={seed} color={sparkColor} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-700 px-4 ps-5 py-2">
          <div className="flex items-center gap-1.5 text-xs">
            {due ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-red-700 dark:text-red-400 font-medium">
                  {t('workers.status.toSettle', '{{amount}} à régler', { amount: formatMad(dueAmount) })}
                </span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  {t('workers.status.upToDate', 'À jour')}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Can I="create" a="Payment">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePayWorker(worker);
                }}
                title={t('workers.actions.paySalary')}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </Can>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  title={t('common.more', 'Plus')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {can('update', 'Worker') && (
                  <DropdownMenuItem onClick={() => handleEdit(worker)}>
                    <Edit className="w-4 h-4 me-2" />
                    {t('workers.actions.edit', 'Modifier')}
                  </DropdownMenuItem>
                )}
                {worker.is_active && can('deactivate', 'Worker') && (
                  <DropdownMenuItem onClick={() => handleDeactivate(worker)}>
                    <UserX className="w-4 h-4 me-2" />
                    {t('workers.actions.deactivate', 'Désactiver')}
                  </DropdownMenuItem>
                )}
                {can('delete', 'Worker') && (
                  <DropdownMenuItem
                    onClick={() => handleDelete(worker)}
                    className="text-red-600 focus:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 me-2" />
                    {t('workers.actions.delete', 'Supprimer')}
                  </DropdownMenuItem>
                )}
                {!can('update', 'Worker') && !can('delete', 'Worker') && (
                  <DropdownMenuItem disabled>
                    <Lock className="w-4 h-4 me-2" />
                    {t('workers.table.viewOnly')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-tour="worker-list">
      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 p-6 sm:p-8 text-white shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">
              {t('workers.banner.tag', 'PERSONNEL')}
              {contextName ? ` · ${contextName}` : ''}
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold">
              {t('workers.title', 'Vos ouvriers')}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {t('workers.banner.summary', '{{total}} personnes · {{pending}} avec paiements en attente', {
                total: stats.total,
                pending: stats.pendingCount,
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/30 bg-white/10 !text-white shadow-none hover:bg-white/20 hover:!text-white dark:border-white/30 dark:bg-white/10 dark:!text-white dark:hover:bg-white/20 dark:hover:!text-white"
            >
              <Download className="w-4 h-4 me-1" aria-hidden />
              {t('common.export', 'Exporter')}
            </Button>
            <Can
              I="create"
              a="Worker"
              fallback={
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/80"
                >
                  <Lock className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{t('workers.list.restrictedAccess')}</span>
                </div>
              }
            >
              <Button
                type="button"
                variant="outline"
                data-tour="worker-add"
                onClick={openCreateForm}
                className="border-transparent bg-white !text-emerald-800 shadow-sm hover:bg-white/90 hover:!text-emerald-900 dark:bg-white dark:!text-emerald-800 dark:hover:bg-white/90"
              >
                <Plus className="w-4 h-4 me-1" aria-hidden />
                {t('workers.list.addWorker', 'Ajouter un ouvrier')}
              </Button>
            </Can>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-xs text-white/80 uppercase tracking-wide">
              {t('workers.stats.total', 'Total')}
            </p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-xs text-white/80 uppercase tracking-wide">
              {t('workers.stats.fixedSalary', 'Salaire fixe')}
            </p>
            <p className="text-2xl font-bold text-white">{stats.fixedSalary}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-xs text-white/80 uppercase tracking-wide">
              {t('workers.stats.dailyWorkers', 'Journaliers')}
            </p>
            <p className="text-2xl font-bold text-white">{stats.dailyWorkers}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-xs text-white/80 uppercase tracking-wide">
              {t('workers.stats.sharecropping', 'Métayage')}
            </p>
            <p className="text-2xl font-bold text-white">{stats.sharecropping}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 col-span-2 sm:col-span-1">
            <p className="text-xs text-white/80 uppercase tracking-wide">
              {t('workers.stats.toPay', 'À payer')}
            </p>
            <p className="text-2xl font-bold text-white">{formatMad(stats.pendingTotal)}</p>
          </div>
        </div>
      </section>

      {/* Search + filter pills */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={tableState.search}
            onChange={(e) => tableState.setSearch(e.target.value)}
            placeholder={t('workers.list.search', 'Rechercher un ouvrier...')}
            className="ps-9"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterPills.map((pill) => {
            const active = filterType === pill.value;
            return (
              <Button
                key={pill.value}
                type="button"
                variant={active ? 'emerald' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange(pill.value)}
                className="rounded-full px-3 font-medium"
              >
                {pill.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Cards grid */}
      {workers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map(renderWorkerCard)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="relative mb-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
              <Users className="h-12 w-12 text-primary" aria-hidden />
            </div>
            <div className="absolute -bottom-1 -end-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-card shadow-sm">
              <Plus className="h-5 w-5 text-primary" aria-hidden />
            </div>
          </div>
          <h3 className="mb-1 text-lg font-semibold text-foreground">
            {t('workers.list.emptyTitle', 'Aucun ouvrier trouvé')}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {filterType !== 'all' || tableState.search
              ? t('workers.list.emptyFiltered', 'Aucun ouvrier ne correspond à vos filtres. Essayez de modifier vos critères de recherche.')
              : t('workers.list.emptyDescription', 'Commencez par ajouter votre premier ouvrier pour gérer votre personnel.')
            }
          </p>
          {(filterType !== 'all' || tableState.search) ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => { setFilterType('all'); tableState.setSearch(''); }}
            >
              {t('workers.list.clearFilters', 'Effacer les filtres')}
            </Button>
          ) : can('create', 'Worker') ? (
            <Button type="button" variant="emerald" onClick={openCreateForm}>
              <Plus className="me-2 h-4 w-4" aria-hidden />
              {t('workers.list.addWorker', 'Ajouter un ouvrier')}
            </Button>
          ) : null}
        </div>
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <DataTablePagination
          page={tableState.page}
          totalPages={totalPages}
          pageSize={tableState.pageSize}
          totalItems={totalItems}
          onPageChange={tableState.setPage}
          onPageSizeChange={tableState.setPageSize}
        />
      )}

      <WorkerForm
        open={showForm}
        worker={selectedWorker}
        organizationId={organizationId}
        farms={farmsArray}
        existingWorkers={allWorkers}
        onClose={() => {
          setShowForm(false);
          setSelectedWorker(null);
        }}
        onSuccess={() => {
          setShowForm(false);
          setSelectedWorker(null);
        }}
      />

      {workerToPay && (
        <WorkerPaymentDialog
          open={showPaymentDialog}
          worker={workerToPay}
          organizationId={organizationId}
          onClose={() => {
            setShowPaymentDialog(false);
            setWorkerToPay(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['worker-payments'] });
            queryClient.invalidateQueries({ queryKey: ['payments', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['payment-statistics', organizationId] });
            if (workerToPay?.id) {
              queryClient.invalidateQueries({ queryKey: ['worker-stats', organizationId, workerToPay.id] });
            }
            setShowPaymentDialog(false);
            setWorkerToPay(null);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={async () => {
          await confirmAction.onConfirm();
          setConfirmOpen(false);
          setConfirmAction(DEFAULT_CONFIRM_ACTION);
        }}
      />
    </div>
  );
};

// keep Banknote import used somewhere to avoid lint error if needed in future
void Banknote;

export default WorkersList;
