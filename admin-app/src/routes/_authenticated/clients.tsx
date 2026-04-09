import { createFileRoute } from '@tanstack/react-router';
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
  Download,
  Users,
  Sprout,
  CreditCard,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 20;

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
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  // Fetch organizations
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-clients', page, search, statusFilter],
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
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">Organizations, contact info & subscriptions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={() => refetch()} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard icon={Building2} label="Total organizations" value={stats.total} color="emerald" />
          <StatCard icon={Users} label="Active organizations" value={stats.active} color="blue" />
          <StatCard icon={CreditCard} label="Active subscriptions" value={stats.withActiveSub} color="purple" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); refetch(); }} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, city..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </form>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hectares</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center"><RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No organizations found</td></tr>
              ) : (
                rows.map((org) => {
                  const sub = subscriptions?.[org.id];
                  const isExpanded = expandedOrg === org.id;
                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{org.name}</p>
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
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(org.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> à{' '}
              <span className="font-medium">{Math.min(page * PAGE_SIZE, total)}</span>{' '}
              sur <span className="font-medium">{total}</span>
            </p>
            <div className="flex items-center gap-2">
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
