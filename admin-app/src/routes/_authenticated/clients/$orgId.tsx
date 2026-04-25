import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  RefreshCw,
  Building2,
  Users,
  Sprout,
  MapPin,
  HardDrive,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  XCircle,
  CreditCard,
  Database,
  Download,
  Upload,
  Trash2,
  Loader2,
  Save,
  Sliders,
  Power,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import clsx from 'clsx';

interface OrgUsage {
  id: string;
  name: string;
  countryCode: string;
  createdAt: string;
  isActive: boolean;
  planType: string;
  subscriptionStatus: string;
  mrr: number;
  arr: number;
  farmsCount: number;
  parcelsCount: number;
  usersCount: number;
  storageUsedMb: number;
  lastActivityAt: string;
  events7d: number;
  events30d: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedAt?: string | null;
  email?: string | null;
  phone?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
}

interface OrgUser {
  id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
  roles: {
    name: string;
  } | null;
}

interface DemoDataStats {
  organizationId: string;
  stats: Record<string, number>;
  total: number;
}

function OrgDetailPage() {
  const { orgId } = Route.useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'demo-data'>('overview');

  // Org usage from admin endpoint
  const { data: usage, isLoading, refetch } = useQuery({
    queryKey: ['admin-org-usage', orgId],
    queryFn: () => apiRequest<OrgUsage>(`/api/v1/admin/orgs/${orgId}/usage`),
  });

  // Org details from Supabase
  const { data: org } = useQuery({
    queryKey: ['admin-org-detail', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Subscription
  const { data: subscription } = useQuery({
    queryKey: ['admin-org-subscription', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Users
  const { data: users = [] } = useQuery({
    queryKey: ['admin-org-users', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_users')
        .select('id, user_id, is_active, created_at, profiles(full_name, email), roles(name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrgUser[];
    },
    enabled: activeTab === 'users',
  });

  // Demo data stats
  const { data: demoStats, refetch: refetchDemoStats } = useQuery({
    queryKey: ['admin-org-demo-stats', orgId],
    queryFn: () => apiRequest<DemoDataStats>(`/api/v1/organizations/${orgId}/demo-data/stats`),
    enabled: activeTab === 'demo-data',
  });

  // Extend subscription
  const [extendDays, setExtendDays] = useState(30);
  const extendMutation = useMutation({
    mutationFn: (days: number) =>
      apiRequest(`/api/v1/admin/subscriptions/${orgId}/extend`, {
        method: 'POST',
        body: JSON.stringify({ days, reason: 'Admin extension' }),
      }),
    onSuccess: () => {
      toast.success(`Subscription extended by ${extendDays} days`);
      queryClient.invalidateQueries({ queryKey: ['admin-org-subscription', orgId] });
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Canonical modules list for the picker
  const { data: modulesCatalog } = useQuery({
    queryKey: ['admin-modules'],
    queryFn: () => apiRequest<Array<{ id: string; slug: string; name: string; category: string | null; is_required?: boolean }>>('/api/v1/admin/modules'),
  });

  // Enabled modules for this org (organization_modules table — source of truth)
  const { data: enabledModulesResp } = useQuery({
    queryKey: ['admin-org-modules', orgId],
    queryFn: () =>
      apiRequest<{ enabled: string[] }>(`/api/v1/admin/orgs/${orgId}/modules`),
  });
  const enabledModuleSlugs = enabledModulesResp?.enabled ?? [];

  // Demo data mutations
  const seedMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/v1/organizations/${orgId}/demo-data/seed`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Demo data seeded successfully');
      refetchDemoStats();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/v1/organizations/${orgId}/demo-data/clear`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('All data cleared');
      refetchDemoStats();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clearDemoOnlyMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/v1/organizations/${orgId}/demo-data/clear-demo-only`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Demo data cleared');
      refetchDemoStats();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const data = await apiRequest<unknown>(`/api/v1/organizations/${orgId}/demo-data/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `org-export-${orgId}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success('Data exported'),
    onError: (err: Error) => toast.error(err.message),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      return new Promise<void>((resolve, reject) => {
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return resolve();
          try {
            const text = await file.text();
            const json = JSON.parse(text);
            await apiRequest(`/api/v1/organizations/${orgId}/demo-data/import`, {
              method: 'POST',
              body: JSON.stringify(json),
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        input.click();
      });
    },
    onSuccess: () => {
      toast.success('Data imported');
      refetchDemoStats();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'users' as const, label: 'Users' },
    { key: 'demo-data' as const, label: 'Demo Data' },
  ];

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                {usage?.name ?? org?.name ?? 'Loading...'}
              </h1>
              {(usage?.isActive ?? org?.is_active) != null && (
                <span
                  className={clsx(
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                    (usage?.isActive ?? org?.is_active)
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {(usage?.isActive ?? org?.is_active) ? 'Active' : 'Inactive'}
                </span>
              )}
            </div>
            {org?.city && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" /> {org.city}{org.country ? `, ${org.country}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Approval + Contact */}
      {usage && (
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <ApprovalCard
            orgId={orgId}
            status={usage.approvalStatus ?? 'pending'}
            approvedAt={usage.approvedAt ?? null}
            onChange={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['admin-org-detail', orgId] });
              queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
            }}
          />
          <ContactCard
            email={usage.email ?? org?.email ?? null}
            phone={usage.phone ?? org?.phone ?? null}
            ownerName={usage.ownerName ?? null}
            ownerEmail={usage.ownerEmail ?? null}
            ownerPhone={usage.ownerPhone ?? null}
          />
        </div>
      )}

      {/* Usage Stats Cards */}
      {usage && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Sprout} label="Farms" value={usage.farmsCount} />
          <StatCard icon={MapPin} label="Parcels" value={usage.parcelsCount} />
          <StatCard icon={Users} label="Users" value={usage.usersCount} />
          <StatCard icon={HardDrive} label="Storage" value={`${usage.storageUsedMb.toFixed(1)} MB`} />
          <StatCard icon={Activity} label="Events (7d)" value={usage.events7d} />
          <StatCard icon={Activity} label="Events (30d)" value={usage.events30d} />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-1 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : activeTab === 'overview' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contract Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
              <CreditCard className="h-4 w-4" /> Contract
            </h3>
            {subscription ? (
              <dl className="space-y-2.5 text-sm">
                <Row label="Status">
                  <SubBadge status={subscription.status} />
                </Row>
                <Row label="Hectares">{subscription.contracted_hectares ?? '—'} ha</Row>
                <Row label="Period Start">
                  {subscription.current_period_start
                    ? new Date(subscription.current_period_start).toLocaleDateString('fr-FR')
                    : '—'}
                </Row>
                <Row label="Period End">
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString('fr-FR')
                    : '—'}
                </Row>
                <Row label="Limits">
                  {subscription.max_farms} farms / {subscription.max_users} users
                </Row>
                <Row label={`Modules (${enabledModuleSlugs.length})`}>
                  {enabledModuleSlugs.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {enabledModuleSlugs.map((m) => (
                        <span key={m} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          {m}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">none enabled yet</span>
                  )}
                </Row>
                <p className="pt-2 text-[11px] text-gray-400 border-t border-gray-100 mt-3">
                  Pricing is negotiated per customer. Limits and modules are edited below.
                </p>
              </dl>
            ) : (
              <p className="text-sm text-gray-400">No subscription</p>
            )}
          </div>

          {/* Extend Subscription Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
              <Calendar className="h-4 w-4" /> Extend Subscription
            </h3>
            {subscription ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Days to add</label>
                  <div className="flex flex-wrap gap-2">
                    {[7, 14, 30, 90, 365].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setExtendDays(d)}
                        className={clsx(
                          'px-3 py-1.5 rounded text-xs font-medium',
                          extendDays === d
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                        )}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => extendMutation.mutate(extendDays)}
                  disabled={extendMutation.isPending}
                  className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {extendMutation.isPending ? 'Extending...' : `Extend by ${extendDays} days`}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Create a subscription first</p>
            )}
          </div>

          {/* Subscription quick actions */}
          <div className="lg:col-span-2">
            <SubscriptionActionsCard orgId={orgId} subscription={subscription} />
          </div>

          {/* Hard Limits & Modules (case-by-case) */}
          <div className="lg:col-span-2">
            <HardLimitsCard
              orgId={orgId}
              subscription={subscription}
              modulesCatalog={modulesCatalog ?? []}
            />
          </div>

          {/* Revenue Card */}
          {usage && (
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
                <Building2 className="h-4 w-4" /> Revenue
              </h3>
              <dl className="space-y-2.5 text-sm">
                <Row label="MRR">
                  <span className="font-mono font-medium">{usage.mrr.toFixed(2)} MAD</span>
                </Row>
                <Row label="ARR">
                  <span className="font-mono font-medium">{usage.arr.toFixed(2)} MAD</span>
                </Row>
                <Row label="Plan">
                  <span className="capitalize">{usage.planType ?? '—'}</span>
                </Row>
                <Row label="Sub Status">
                  <SubBadge status={usage.subscriptionStatus} />
                </Row>
                <Row label="Last Activity">
                  {usage.lastActivityAt
                    ? new Date(usage.lastActivityAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </Row>
              </dl>
            </div>
          )}

          {/* Org Info Card */}
          {org && (
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
                <Building2 className="h-4 w-4" /> Organization Info
              </h3>
              <dl className="space-y-2.5 text-sm">
                <Row label="Slug">{org.slug}</Row>
                <Row label="Email">{org.email ?? '—'}</Row>
                <Row label="Phone">{org.phone ?? '—'}</Row>
                <Row label="Account Type">
                  <span className="capitalize">{org.account_type}</span>
                </Row>
                <Row label="Created">
                  {new Date(org.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Row>
              </dl>
            </div>
          )}
        </div>
      ) : activeTab === 'users' ? (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {u.profiles?.full_name ?? 'Unnamed'}
                      </p>
                      <p className="text-xs text-gray-500">{u.profiles?.email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {u.roles?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={clsx(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Demo Data Tab */
        <div className="space-y-6">
          {/* Stats */}
          {demoStats && (
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
                <Database className="h-4 w-4" /> Data Statistics
              </h3>
              <div className="mb-3 text-sm text-gray-500">
                Total records: <span className="font-semibold text-gray-900">{demoStats.total}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(demoStats.stats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([table, count]) => (
                    <div
                      key={table}
                      className="rounded border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <p className="text-xs text-gray-500 truncate">{table}</p>
                      <p className="text-sm font-semibold text-gray-900">{count}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Actions</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DemoButton
                icon={Sprout}
                label="Seed Demo Data"
                description="Generate sample farms, parcels, tasks, and more"
                onClick={() => seedMutation.mutate()}
                loading={seedMutation.isPending}
                color="emerald"
              />
              <DemoButton
                icon={Download}
                label="Export Data"
                description="Download all organization data as JSON"
                onClick={() => exportMutation.mutate()}
                loading={exportMutation.isPending}
                color="blue"
              />
              <DemoButton
                icon={Upload}
                label="Import Data"
                description="Import data from a JSON export file"
                onClick={() => importMutation.mutate()}
                loading={importMutation.isPending}
                color="blue"
              />
              <DemoButton
                icon={Trash2}
                label="Clear Demo Data Only"
                description="Remove only seeded demo data, keep real data"
                onClick={() => {
                  if (confirm('Clear demo data only? Real data will be preserved.')) {
                    clearDemoOnlyMutation.mutate();
                  }
                }}
                loading={clearDemoOnlyMutation.isPending}
                color="amber"
              />
              <DemoButton
                icon={Trash2}
                label="Clear ALL Data"
                description="Remove all data for this organization"
                onClick={() => {
                  if (confirm('This will delete ALL data for this organization. Are you sure?')) {
                    clearMutation.mutate();
                  }
                }}
                loading={clearMutation.isPending}
                color="red"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function SubBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    trialing: 'bg-blue-50 text-blue-700',
    past_due: 'bg-amber-50 text-amber-700',
    suspended: 'bg-red-50 text-red-700',
    canceled: 'bg-gray-100 text-gray-500',
    terminated: 'bg-red-100 text-red-800',
  };
  return (
    <span
      className={clsx(
        'inline-flex px-2 py-0.5 rounded text-xs font-medium',
        colors[status] ?? 'bg-gray-100 text-gray-600',
      )}
    >
      {status}
    </span>
  );
}

const limitsSchema = z.object({
  max_farms: z.number().int().min(0).max(10000),
  max_users: z.number().int().min(0).max(10000),
  max_parcels: z.number().int().min(0).max(100000),
  contracted_hectares: z.number().min(0).max(1_000_000),
  selected_modules: z.array(z.string()),
});

type LimitsFormData = z.infer<typeof limitsSchema>;

function HardLimitsCard({
  orgId,
  subscription,
  modulesCatalog,
}: {
  orgId: string;
  subscription: any;
  modulesCatalog: Array<{ id: string; slug: string; name: string; category: string | null; is_required?: boolean }>;
}) {
  const queryClient = useQueryClient();

  // Source of truth for enabled modules: organization_modules (populated at onboarding)
  const { data: enabledModulesResp } = useQuery({
    queryKey: ['admin-org-modules', orgId],
    queryFn: () =>
      apiRequest<{ enabled: string[] }>(`/api/v1/admin/orgs/${orgId}/modules`),
  });
  const enabledModules = enabledModulesResp?.enabled ?? [];

  const defaultValues: LimitsFormData = {
    max_farms: subscription?.max_farms ?? 0,
    max_users: subscription?.max_users ?? 0,
    max_parcels: subscription?.max_parcels ?? 0,
    contracted_hectares: Number(subscription?.contracted_hectares ?? 0),
    selected_modules: enabledModules,
  };

  const form = useForm<LimitsFormData>({
    resolver: zodResolver(limitsSchema),
    defaultValues,
  });

  // Re-sync defaults when subscription row / enabled modules arrive
  useEffect(() => {
    form.reset({
      max_farms: subscription?.max_farms ?? 0,
      max_users: subscription?.max_users ?? 0,
      max_parcels: subscription?.max_parcels ?? 0,
      contracted_hectares: Number(subscription?.contracted_hectares ?? 0),
      selected_modules: enabledModules,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription?.id, enabledModulesResp]);

  const mutation = useMutation({
    mutationFn: async (data: LimitsFormData) => {
      const { selected_modules, ...limits } = data;

      // Always include required slugs — the backend rejects payloads that
      // omit them, and the UI disables the checkbox anyway.
      const enabled = Array.from(new Set([...selected_modules, ...Array.from(requiredSlugs)]));

      await apiRequest(`/api/v1/admin/orgs/${orgId}/contract`, {
        method: 'PUT',
        body: JSON.stringify({
          ...limits,
          enabled,
        }),
      });
    },
    onSuccess: () => {
      toast.success('Hard limits saved');
      queryClient.invalidateQueries({ queryKey: ['admin-org-subscription', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-usage', orgId] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-modules', orgId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save'),
  });

  const selected = form.watch('selected_modules');

  const requiredSlugs = useMemo(
    () => new Set((modulesCatalog ?? []).filter((m) => m.is_required).map((m) => m.slug)),
    [modulesCatalog],
  );

  const toggleModule = (slug: string) => {
    // Required modules cannot be unchecked — back-end rejects this anyway,
    // and the UI disables the input (defense in depth).
    if (requiredSlugs.has(slug)) return;
    const next = selected.includes(slug)
      ? selected.filter((s) => s !== slug)
      : [...selected, slug];
    form.setValue('selected_modules', next, { shouldDirty: true });
  };

  // Group modules by category for readability
  const byCategory = (modulesCatalog ?? []).reduce<Record<string, typeof modulesCatalog>>(
    (acc, mod) => {
      const key = mod.category || 'general';
      if (!acc[key]) acc[key] = [];
      acc[key].push(mod);
      return acc;
    },
    {},
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
        <Sliders className="h-4 w-4" /> Hard Limits & Modules (case-by-case)
      </h3>

      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-5"
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max farms</label>
            <input
              type="number"
              min={0}
              {...form.register('max_farms', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max users</label>
            <input
              type="number"
              min={0}
              {...form.register('max_users', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max parcels</label>
            <input
              type="number"
              min={0}
              {...form.register('max_parcels', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Contracted hectares</label>
            <input
              type="number"
              min={0}
              step="0.01"
              {...form.register('contracted_hectares', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
            Enabled modules ({selected.length})
          </p>
          {modulesCatalog.length === 0 ? (
            <p className="text-sm text-gray-400">No module catalog loaded.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byCategory).map(([category, mods]) => (
                <div key={category}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                    {category}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
                    {mods.map((mod) => {
                      const key = mod.slug || mod.id;
                      const isOn = selected.includes(key);
                      const isRequired = !!mod.is_required;
                      return (
                        <label
                          key={mod.id}
                          title={isRequired ? 'Module requis — ne peut pas être désactivé' : undefined}
                          className={clsx(
                            'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm select-none',
                            isRequired ? 'cursor-not-allowed' : 'cursor-pointer',
                            isOn
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 bg-white hover:bg-gray-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isOn}
                            disabled={isRequired}
                            onChange={() => toggleModule(key)}
                            className="h-4 w-4 text-emerald-600 disabled:opacity-60"
                          />
                          <span className="truncate">
                            {mod.name}
                            {isRequired && <span className="ml-1 text-[10px] text-gray-400">(requis)</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">
            {subscription
              ? 'Updates the existing subscription row.'
              : 'No subscription yet — saving creates one (14-day trial).'}
          </p>
          <button
            type="submit"
            disabled={mutation.isPending || !form.formState.isDirty}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save limits
          </button>
        </div>
      </form>
    </div>
  );
}

function ApprovalCard({
  orgId,
  status,
  approvedAt,
  onChange,
}: {
  orgId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt: string | null;
  onChange: () => void;
}) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  const run = async (action: 'approve' | 'reject') => {
    setLoading(action);
    try {
      await apiRequest(`/api/v1/admin/orgs/${orgId}/${action}`, { method: 'POST' });
      toast.success(action === 'approve' ? 'Organization approved' : 'Organization rejected');
      onChange();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
    setLoading(null);
  };

  const badge = {
    pending: { Icon: Clock, label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { Icon: CheckCircle2, label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { Icon: XCircle, label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
  }[status];
  const Badge = badge.Icon;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="flex items-center justify-between gap-2 text-sm font-semibold text-gray-700 mb-3">
        <span>Approval</span>
        <span
          className={clsx(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
            badge.cls,
          )}
        >
          <Badge className="h-3 w-3" />
          {badge.label}
        </span>
      </h3>
      {approvedAt && (
        <p className="text-xs text-gray-500 mb-3">
          Last decision: {new Date(approvedAt).toLocaleString('fr-FR')}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={status === 'approved' || loading !== null}
          onClick={() => run('approve')}
          className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {loading === 'approve' ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={status === 'rejected' || loading !== null}
          onClick={() => run('reject')}
          className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
        >
          {loading === 'reject' ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

function ContactCard({
  email,
  phone,
  ownerName,
  ownerEmail,
  ownerPhone,
}: {
  email: string | null;
  phone: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
}) {
  const hasAny = email || phone || ownerName || ownerEmail || ownerPhone;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
        <Mail className="h-4 w-4" /> Contact
      </h3>
      {!hasAny ? (
        <p className="text-sm text-gray-400">No contact info provided yet.</p>
      ) : (
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Organization</p>
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-emerald-700">
                <Mail className="h-3.5 w-3.5 text-gray-400" /> {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:text-emerald-700">
                <Phone className="h-3.5 w-3.5 text-gray-400" /> {phone}
              </a>
            )}
            {!email && !phone && <p className="text-gray-400">—</p>}
          </div>
          <div className="border-t pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Owner</p>
            {ownerName && <p className="font-medium">{ownerName}</p>}
            {ownerEmail && (
              <a href={`mailto:${ownerEmail}`} className="flex items-center gap-2 hover:text-emerald-700">
                <Mail className="h-3.5 w-3.5 text-gray-400" /> {ownerEmail}
              </a>
            )}
            {ownerPhone && (
              <a href={`tel:${ownerPhone.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:text-emerald-700">
                <Phone className="h-3.5 w-3.5 text-gray-400" /> {ownerPhone}
              </a>
            )}
            {!ownerName && !ownerEmail && !ownerPhone && <p className="text-gray-400">—</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="text-lg font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function DemoButton({
  icon: Icon,
  label,
  description,
  onClick,
  loading,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  color: 'emerald' | 'blue' | 'amber' | 'red';
}) {
  const colorMap = {
    emerald: 'border-emerald-200 hover:bg-emerald-50 text-emerald-700',
    blue: 'border-blue-200 hover:bg-blue-50 text-blue-700',
    amber: 'border-amber-200 hover:bg-amber-50 text-amber-700',
    red: 'border-red-200 hover:bg-red-50 text-red-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={clsx(
        'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors disabled:opacity-50',
        colorMap[color],
      )}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin shrink-0 mt-0.5" />
      ) : (
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}

function SubscriptionActionsCard({
  orgId,
  subscription,
}: {
  orgId: string;
  subscription: any;
}) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-org-subscription', orgId] });
    queryClient.invalidateQueries({ queryKey: ['admin-org-usage', orgId] });
  };

  const updateStatus = useMutation({
    mutationFn: (status: 'active' | 'suspended') =>
      apiRequest(`/api/v1/admin/subscriptions/${orgId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_d, status) => {
      toast.success(status === 'active' ? 'Subscription activated' : 'Subscription suspended');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed'),
  });

  const createTrial = useMutation({
    mutationFn: () =>
      apiRequest(`/api/v1/admin/subscriptions/${orgId}/create`, {
        method: 'POST',
        body: JSON.stringify({
          formula: 'starter',
          billing_cycle: 'monthly',
          contracted_hectares: 50,
          days: 14,
          status: 'trialing',
        }),
      }),
    onSuccess: () => {
      toast.success('Trial subscription created (14 days)');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed'),
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
        <Power className="h-4 w-4" /> Subscription Actions
      </h3>
      <div className="flex flex-wrap gap-2">
        {!subscription && (
          <button
            type="button"
            onClick={() => createTrial.mutate()}
            disabled={createTrial.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createTrial.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Create Trial (14 days)
          </button>
        )}
        {subscription && subscription.status !== 'active' && (
          <button
            type="button"
            onClick={() => updateStatus.mutate('active')}
            disabled={updateStatus.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Activate
          </button>
        )}
        {subscription && subscription.status === 'active' && (
          <button
            type="button"
            onClick={() => updateStatus.mutate('suspended')}
            disabled={updateStatus.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
            Suspend
          </button>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/clients/$orgId')({
  component: OrgDetailPage,
});
