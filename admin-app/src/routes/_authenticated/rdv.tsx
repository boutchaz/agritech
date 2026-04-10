import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  RefreshCw,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  Sprout,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 20;

interface RdvLead {
  id: string;
  nom: string;
  entreprise: string | null;
  tel: string;
  email: string | null;
  surface: string | null;
  region: string | null;
  cultures: string[] | null;
  creneau: string;
  source: string | null;
  email_sent: boolean;
  created_at: string;
}

function RdvPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['rdv-leads', page, search, regionFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('siam_rdv_leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.or(
          `nom.ilike.%${search.trim()}%,entreprise.ilike.%${search.trim()}%,tel.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`,
        );
      }

      if (regionFilter) {
        query = query.eq('region', regionFilter);
      }

      if (dateFilter) {
        query = query.ilike('creneau', `${dateFilter}%`);
      }

      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as RdvLead[], total: count ?? 0 };
    },
  });

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['rdv-stats'],
    queryFn: async () => {
      const { count: total } = await supabase
        .from('siam_rdv_leads')
        .select('*', { count: 'exact', head: true });

      const { count: emailsSent } = await supabase
        .from('siam_rdv_leads')
        .select('*', { count: 'exact', head: true })
        .eq('email_sent', true);

      const { data: regionData } = await supabase
        .from('siam_rdv_leads')
        .select('region');

      const regions = new Map<string, number>();
      regionData?.forEach((r: any) => {
        const key = r.region || 'Non renseigné';
        regions.set(key, (regions.get(key) ?? 0) + 1);
      });

      const { data: dateData } = await supabase
        .from('siam_rdv_leads')
        .select('creneau');

      const dates = new Map<string, number>();
      dateData?.forEach((r: any) => {
        const day = r.creneau?.split('-')[0] ?? 'Unknown';
        dates.set(day, (dates.get(day) ?? 0) + 1);
      });

      return {
        total: total ?? 0,
        emailsSent: emailsSent ?? 0,
        regions: Object.fromEntries(regions),
        dates: Object.fromEntries(
          [...dates.entries()].sort((a, b) => a[0].localeCompare(b[0])),
        ),
      };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const uniqueRegions = stats
    ? Object.keys(stats.regions).sort()
    : [];
  const uniqueDates = stats
    ? Object.keys(stats.dates).sort()
    : [];

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = ['Nom', 'Entreprise', 'Tél', 'Email', 'Surface', 'Région', 'Cultures', 'Créneau', 'Source', 'Email envoyé', 'Date'];
    const csvRows = rows.map((r) => [
      r.nom,
      r.entreprise ?? '',
      r.tel,
      r.email ?? '',
      r.surface ?? '',
      r.region ?? '',
      (r.cultures ?? []).join('; '),
      r.creneau,
      r.source ?? '',
      r.email_sent ? 'Oui' : 'Non',
      new Date(r.created_at).toLocaleString('fr-FR'),
    ]);

    const csv = [headers, ...csvRows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rdv-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">RDV SIAM</h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">Leads rendez-vous salon SIAM 2026</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4 shrink-0" />
            Export CSV
          </button>
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
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total leads</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.emailsSent}</p>
                <p className="text-xs text-gray-500">Emails envoyés</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.regions).length}
                </p>
                <p className="text-xs text-gray-500">Régions</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.dates).length}
                </p>
                <p className="text-xs text-gray-500">Jours avec RDV</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            refetch();
          }}
          className="relative w-full min-w-0 sm:max-w-sm sm:flex-1"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, entreprise, tél..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </form>

        <select
          value={regionFilter}
          onChange={(e) => {
            setRegionFilter(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-auto sm:min-w-[10rem]"
        >
          <option value="">Toutes régions</option>
          {uniqueRegions.map((r) => (
            <option key={r} value={r}>
              {r} ({stats?.regions[r]})
            </option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-auto sm:min-w-[10rem]"
        >
          <option value="">Tous les jours</option>
          {uniqueDates.map((d) => (
            <option key={d} value={d}>
              {d} ({stats?.dates[d]} RDV)
            </option>
          ))}
        </select>

        {(search || regionFilter || dateFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setRegionFilter('');
              setDateFilter('');
              setPage(1);
            }}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 sm:w-auto"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="-mx-px overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">
                  Contact
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">
                  Entreprise
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">
                  Région
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">
                  Surface
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">
                  Créneau
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">
                  Cultures
                </th>
                <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">
                  Email
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase text-gray-500 sm:px-4 sm:py-3 sm:text-xs">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    Aucun lead trouvé
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedRow(expandedRow === row.id ? null : row.id)
                    }
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {row.nom}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="h-3 w-3" />
                            {row.tel}
                          </span>
                          {row.email && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail className="h-3 w-3" />
                              {row.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {row.entreprise ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          {row.entreprise}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {row.region ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {row.region}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {row.surface || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">
                        <Calendar className="h-3 w-3" />
                        {row.creneau}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.cultures?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {row.cultures.map((c, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              <Sprout className="h-3 w-3" />
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.email_sent ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(row.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-center text-xs text-gray-700 sm:text-left sm:text-sm">
              <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> à{' '}
              <span className="font-medium">
                {Math.min(page * PAGE_SIZE, total)}
              </span>{' '}
              sur <span className="font-medium">{total}</span>
            </p>
            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
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

export const Route = createFileRoute('/_authenticated/rdv')({
  component: RdvPage,
});
