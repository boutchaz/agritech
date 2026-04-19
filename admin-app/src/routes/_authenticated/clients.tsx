import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  RefreshCw,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Download,
  Users,
  Sprout,
  Clock,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  is_active: boolean;
  account_type: string;
  created_at: string;
  approval_status: ApprovalStatus;
  approved_at: string | null;
}

interface Subscription {
  id: string;
  organization_id: string;
  status: string;
  formula: string | null;
  billing_cycle: string | null;
  contracted_hectares: number | null;
  amount_ttc: number | null;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  selected_modules: unknown[] | null;
  max_farms: number;
  max_users: number;
}

function ClientsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalStatus | ''>('pending');
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  // Fetch organizations
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-clients', page, search, statusFilter, approvalFilter],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%`,
        );
      }

      if (statusFilter === 'active') query = query.eq('is_active', true);
      if (statusFilter === 'inactive') query = query.eq('is_active', false);
      if (approvalFilter) query = query.eq('approval_status', approvalFilter);

      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as Organization[], total: count ?? 0 };
    },
  });

  // Fetch subscriptions for all visible orgs
  const orgIds = data?.rows.map((o) => o.id) ?? [];
  const { data: subscriptions } = useQuery({
    queryKey: ['admin-subscriptions', orgIds],
    queryFn: async () => {
      if (!orgIds.length) return {};
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .in('organization_id', orgIds);
      if (error) throw error;
      const map: Record<string, Subscription> = {};
      (data ?? []).forEach((s: Subscription) => {
        map[s.organization_id] = s;
      });
      return map;
    },
    enabled: orgIds.length > 0,
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['admin-clients-stats'],
    queryFn: async () => {
      const { count: total } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      const { count: active } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      const { count: withSub } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return {
        total: total ?? 0,
        active: active ?? 0,
        withActiveSub: withSub ?? 0,
      };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = ['Nom', 'Email', 'Tél', 'Ville', 'Type', 'Actif', 'Formule', 'Hectares', 'Statut Sub', 'Date création'];
    const csvRows = rows.map((o) => {
      const sub = subscriptions?.[o.id];
      return [
        o.name, o.email ?? '', o.phone ?? '', o.city ?? '', o.account_type,
        o.is_active ? 'Oui' : 'Non',
        sub?.formula ?? '', sub?.contracted_hectares ?? '',
        sub?.status ?? 'none',
        new Date(o.created_at).toLocaleDateString('fr-FR'),
      ];
    });
    const csv = [headers, ...csvRows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    ).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Clients</h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">Organizations, contact info & subscriptions</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          <button type="button" onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="h-4 w-4 shrink-0" /> Export CSV
          </button>
          <button type="button" onClick={() => refetch()} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard icon={Building2} label="Total organizations" value={stats.total} color="emerald" />
          <StatCard icon={Users} label="Active organizations" value={stats.active} color="blue" />
          <StatCard icon={CreditCard} label="Active subscriptions" value={stats.withActiveSub} color="purple" />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); refetch(); }} className="relative w-full min-w-0 sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, city..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </form>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-auto">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={approvalFilter}
          onChange={(e) => { setApprovalFilter(e.target.value as ApprovalStatus | ''); setPage(1); }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-auto"
        >
          <option value="">All approvals</option>
          <option value="pending">Pending approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="-mx-px overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">Organization</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">Contact</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">Location</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">Subscription</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">Hectares</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">Status</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">Approval</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center"><RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No organizations found</td></tr>
              ) : (
                rows.map((org) => {
                  const sub = subscriptions?.[org.id];
                  const isExpanded = expandedOrg === org.id;
                  return (
                    <OrgRow
                      key={org.id}
                      org={org}
                      sub={sub}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedOrg(isExpanded ? null : org.id)}
                      onRefresh={() => refetch()}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-center text-xs text-gray-700 sm:text-left sm:text-sm">
              <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> à{' '}
              <span className="font-medium">{Math.min(page * PAGE_SIZE, total)}</span>{' '}
              sur <span className="font-medium">{total}</span>
            </p>
            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- OrgRow with expandable subscription management ---

function OrgRow({ org, sub, isExpanded, onToggle, onRefresh }: {
  org: Organization;
  sub: Subscription | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [extendDays, setExtendDays] = useState(30);
  const [isExtending, setIsExtending] = useState(false);

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      const { apiRequest } = await import('@/lib/api-client');
      await apiRequest(`/api/v1/admin/subscriptions/${org.id}/extend`, {
        method: 'POST',
        body: JSON.stringify({ days: extendDays, reason: 'Admin extension' }),
      });
      toast.success(`Subscription extended by ${extendDays} days`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to extend');
    }
    setIsExtending(false);
  };

  return (
    <>
      <tr className="group hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <div>
            <Link
              to="/clients/$orgId"
              params={{ orgId: org.id }}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1"
            >
              {org.name}
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100" />
            </Link>
            <p className="text-xs text-gray-400">{org.account_type}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-0.5">
            {org.email && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Mail className="h-3 w-3" /> {org.email}
              </span>
            )}
            {org.phone && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Phone className="h-3 w-3" /> {org.phone}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          {org.city ? (
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {org.city}</span>
          ) : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3">
          {sub ? (
            <div>
              <SubStatusBadge status={sub.status} />
              {sub.formula && (
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{sub.formula} · {sub.billing_cycle}</p>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400">No subscription</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm">
          {sub?.contracted_hectares ? (
            <span className="flex items-center gap-1">
              <Sprout className="h-3.5 w-3.5 text-emerald-500" />
              {sub.contracted_hectares} ha
            </span>
          ) : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            org.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {org.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <ApprovalBadge status={org.approval_status} />
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {new Date(org.created_at).toLocaleDateString('fr-FR')}
        </td>
      </tr>

      {/* Expanded subscription panel */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-4 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Subscription details */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Subscription Details</h4>
                {sub ? (
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Status</dt>
                      <dd><SubStatusBadge status={sub.status} /></dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Formula</dt>
                      <dd className="capitalize font-medium">{sub.formula ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Billing</dt>
                      <dd className="capitalize">{sub.billing_cycle ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Hectares</dt>
                      <dd>{sub.contracted_hectares ?? '—'} ha</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Amount TTC</dt>
                      <dd className="font-mono">{sub.amount_ttc ? `${sub.amount_ttc} ${sub.currency}` : '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Period end</dt>
                      <dd>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('fr-FR') : '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Limits</dt>
                      <dd className="text-xs">{sub.max_farms} farms · {sub.max_users} users</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-gray-400">No subscription</p>
                )}
              </div>

              {/* Extend subscription */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Extend Subscription</h4>
                {sub ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Days to add</label>
                      <div className="flex gap-2">
                        {[7, 14, 30, 90, 365].map((d) => (
                          <button
                            key={d}
                            onClick={(e) => { e.stopPropagation(); setExtendDays(d); }}
                            className={`px-2 py-1 rounded text-xs ${
                              extendDays === d
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      value={extendDays}
                      onChange={(e) => setExtendDays(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExtend(); }}
                      disabled={isExtending}
                      className="w-full px-3 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isExtending ? 'Extending...' : `Extend by ${extendDays} days`}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Create a subscription first</p>
                )}
              </div>

              {/* Quick actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  {org.approval_status !== 'approved' && (
                    <ApprovalActionButton
                      orgId={org.id}
                      action="approve"
                      label="Approve organization"
                      onDone={onRefresh}
                    />
                  )}
                  {org.approval_status !== 'rejected' && (
                    <ApprovalActionButton
                      orgId={org.id}
                      action="reject"
                      label="Reject organization"
                      onDone={onRefresh}
                    />
                  )}
                  {sub && sub.status !== 'active' && (
                    <ActionButton
                      orgId={org.id}
                      label="Activate"
                      payload={{ status: 'active' }}
                      color="emerald"
                      onDone={onRefresh}
                    />
                  )}
                  {sub && sub.status === 'active' && (
                    <ActionButton
                      orgId={org.id}
                      label="Suspend"
                      payload={{ status: 'suspended' }}
                      color="amber"
                      onDone={onRefresh}
                    />
                  )}
                  {!sub && (
                    <ActionButton
                      orgId={org.id}
                      label="Create Trial (14 days)"
                      action="create"
                      payload={{ formula: 'starter', billing_cycle: 'monthly', contracted_hectares: 50, days: 14, status: 'trialing' }}
                      color="blue"
                      onDone={onRefresh}
                    />
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ActionButton({ orgId, label, payload, color, onDone, action = 'update' }: {
  orgId: string;
  label: string;
  payload: any;
  color: string;
  onDone: () => void;
  action?: 'update' | 'create';
}) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const { apiRequest } = await import('@/lib/api-client');
      const url = action === 'create'
        ? `/api/v1/admin/subscriptions/${orgId}/create`
        : `/api/v1/admin/subscriptions/${orgId}`;
      const method = action === 'create' ? 'POST' : 'PUT';
      await apiRequest(url, { method, body: JSON.stringify(payload) });
      toast.success(`${label} — done`);
      onDone();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
    setLoading(false);
  };

  const colors: Record<string, string> = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    red: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handle(); }}
      disabled={loading}
      className={`w-full px-3 py-2 rounded text-sm disabled:opacity-50 ${colors[color] ?? colors.emerald}`}
    >
      {loading ? '...' : label}
    </button>
  );
}

function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const config: Record<ApprovalStatus, { label: string; className: string; Icon: any }> = {
    pending: {
      label: 'Pending',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
      Icon: Clock,
    },
    approved: {
      label: 'Approved',
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      Icon: CheckCircle2,
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-50 text-red-700 border border-red-200',
      Icon: XCircle,
    },
  };
  const c = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
      <c.Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function ApprovalActionButton({ orgId, action, label, onDone }: {
  orgId: string;
  action: 'approve' | 'reject';
  label: string;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const { apiRequest } = await import('@/lib/api-client');
      await apiRequest(`/api/v1/admin/orgs/${orgId}/${action}`, { method: 'POST' });
      toast.success(`${label} — done`);
      onDone();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
    setLoading(false);
  };

  const color = action === 'approve'
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
    : 'bg-red-600 hover:bg-red-700 text-white';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handle(); }}
      disabled={loading}
      className={`w-full px-3 py-2 rounded text-sm disabled:opacity-50 ${color}`}
    >
      {loading ? '...' : label}
    </button>
  );
}

function SubStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    trialing: 'bg-blue-50 text-blue-700',
    past_due: 'bg-amber-50 text-amber-700',
    suspended: 'bg-red-50 text-red-700',
    canceled: 'bg-gray-100 text-gray-500',
    terminated: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  };
  const c = colorMap[color] ?? colorMap.emerald;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/clients')({
  component: ClientsPage,
});
