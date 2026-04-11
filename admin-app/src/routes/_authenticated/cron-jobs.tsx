import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Clock,
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Search,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { toast } from 'sonner';
import clsx from 'clsx';

interface CronJobInfo {
  name: string;
  schedule: string;
  description: string;
  module: string;
  running: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

const MODULE_COLORS: Record<string, string> = {
  'Reminders': 'bg-blue-100 text-blue-700',
  'Subscriptions': 'bg-purple-100 text-purple-700',
  'Satellite': 'bg-cyan-100 text-cyan-700',
  'AI Jobs': 'bg-amber-100 text-amber-700',
  'Compliance': 'bg-red-100 text-red-700',
  'Monitoring': 'bg-emerald-100 text-emerald-700',
};

function formatSchedule(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, dom, , dow] = parts;

  if (dom !== '*' && dom !== '*/5') {
    return `Monthly on day ${dom} at ${hour}:${min.padStart(2, '0')} UTC`;
  }
  if (dow !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[parseInt(dow)] ?? `Day ${dow}`}s at ${hour}:${min.padStart(2, '0')} UTC`;
  }
  if (dom === '*/5') {
    return `Every 5 days at ${hour}:${min.padStart(2, '0')} UTC`;
  }
  if (hour.startsWith('*/')) {
    return `Every ${hour.slice(2)}h at :${min.padStart(2, '0')}`;
  }
  return `Daily at ${hour}:${min.padStart(2, '0')} UTC`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = Date.now();
  const diff = d.getTime() - now;
  const abs = Math.abs(diff);

  if (abs < 60_000) return 'just now';
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000);
    return diff > 0 ? `in ${m}m` : `${m}m ago`;
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000);
    return diff > 0 ? `in ${h}h` : `${h}h ago`;
  }
  return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface JobLog {
  id: string;
  job_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  errors: unknown;
  input_data: unknown;
  created_by: string | null;
}

function CronJobsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'live' | 'logs'>('live');

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-cron-jobs'],
    queryFn: () => apiRequest<CronJobInfo[]>('/api/v1/admin/cron-jobs'),
    refetchInterval: 30_000,
  });

  const triggerMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest(`/api/v1/admin/cron-jobs/${name}/trigger`, { method: 'POST' }),
    onSuccess: (_, name) => {
      toast.success(`Job "${name}" triggered`);
      queryClient.invalidateQueries({ queryKey: ['admin-cron-jobs'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, action }: { name: string; action: 'start' | 'stop' }) =>
      apiRequest(`/api/v1/admin/cron-jobs/${name}/${action}`, { method: 'POST' }),
    onSuccess: (_, { name, action }) => {
      toast.success(`Job "${name}" ${action === 'start' ? 'started' : 'stopped'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-cron-jobs'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const modules = [...new Set(jobs.map((j) => j.module))].sort();

  const filtered = jobs.filter((job) => {
    if (filterModule !== 'all' && job.module !== filterModule) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        job.name.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.module.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const runningCount = jobs.filter((j) => j.running).length;
  const stoppedCount = jobs.filter((j) => !j.running).length;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Cron Jobs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage scheduled background tasks
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={clsx(
              'flex items-center gap-2 px-1 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'live'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
          >
            <Clock className="h-4 w-4" /> Live Jobs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={clsx(
              'flex items-center gap-2 px-1 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
          >
            <History className="h-4 w-4" /> Job Logs
          </button>
        </nav>
      </div>

      {activeTab === 'logs' ? (
        <JobLogsTab />
      ) : (
      <>
      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-gray-900">{jobs.length}</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Jobs</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span className="text-2xl font-bold text-emerald-700">{runningCount}</span>
          </div>
          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Active</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-gray-400" />
            <span className="text-2xl font-bold text-gray-500">{stoppedCount}</span>
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stopped</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full min-w-0 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterModule('all')}
            className={clsx(
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider',
              filterModule === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50',
            )}
          >
            All
          </button>
          {modules.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setFilterModule(mod)}
              className={clsx(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider',
                filterModule === mod
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50',
              )}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Job list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
          <Clock className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {search ? 'No jobs match your search' : 'No cron jobs registered'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((job) => (
            <div
              key={job.name}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 font-mono">
                      {job.name}
                    </span>
                    <span
                      className={clsx(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded',
                        MODULE_COLORS[job.module] ?? 'bg-gray-100 text-gray-700',
                      )}
                    >
                      {job.module}
                    </span>
                    {job.running ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                        Stopped
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{job.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatSchedule(job.schedule)}
                    </span>
                    {job.nextRun && (
                      <span>Next: {formatRelative(job.nextRun)}</span>
                    )}
                    {job.lastRun && (
                      <span>Last: {formatRelative(job.lastRun)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => triggerMutation.mutate(job.name)}
                    disabled={triggerMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    title="Run now"
                  >
                    {triggerMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Trigger
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toggleMutation.mutate({
                        name: job.name,
                        action: job.running ? 'stop' : 'start',
                      })
                    }
                    disabled={toggleMutation.isPending}
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-50',
                      job.running
                        ? 'border border-red-200 text-red-600 hover:bg-red-50'
                        : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50',
                    )}
                    title={job.running ? 'Stop' : 'Start'}
                  >
                    {job.running ? (
                      <Square className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    {job.running ? 'Stop' : 'Start'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}

// --- Job Logs Tab ---

const LOG_PAGE_SIZE = 20;

function JobLogsTab() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-job-logs', page],
    queryFn: () =>
      apiRequest<{ data: JobLog[]; total: number }>(
        `/api/v1/admin/jobs?limit=${LOG_PAGE_SIZE}&offset=${page * LOG_PAGE_SIZE}`,
      ),
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LOG_PAGE_SIZE);

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700';
      case 'failed': return 'bg-red-50 text-red-700';
      case 'running': return 'bg-blue-50 text-blue-700';
      case 'pending': return 'bg-amber-50 text-amber-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDuration = (start: string | null, end: string | null): string => {
    if (!start || !end) return '—';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60_000)}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
        <History className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">No job logs yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Job Type</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Started</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-medium text-gray-900">{log.job_type}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('inline-flex px-2 py-0.5 rounded text-xs font-medium', statusColor(log.status))}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {log.started_at
                      ? new Date(log.started_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {formatDuration(log.started_at, log.completed_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-600 max-w-[200px] truncate">
                    {log.errors ? String(typeof log.errors === 'object' ? JSON.stringify(log.errors) : log.errors) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LOG_PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-700">
              <span className="font-medium">{page * LOG_PAGE_SIZE + 1}</span> to{' '}
              <span className="font-medium">{Math.min((page + 1) * LOG_PAGE_SIZE, total)}</span>{' '}
              of <span className="font-medium">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/cron-jobs')({
  component: CronJobsPage,
});
