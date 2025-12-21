import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Users,
  MapPin,
  FileText,
  Activity,
  DollarSign,
} from 'lucide-react';

function OrgDetailPage() {
  const { orgId } = Route.useParams();

  const { data: org, isLoading, error } = useQuery({
    queryKey: ['org-usage', orgId],
    queryFn: () => adminApi.getOrgUsage(orgId),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="p-6">
        <Link
          to="/analytics/organizations"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Organizations
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Organization not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link
        to="/analytics/organizations"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Organizations
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
              <p className="text-gray-500">{org.countryCode}</p>
              <p className="text-sm text-gray-400">
                Created {format(new Date(org.createdAt), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                org.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {org.isActive ? 'Active' : 'Inactive'}
            </span>
            <p className="mt-2 text-sm text-gray-500">
              Plan:{' '}
              <span className="font-medium capitalize">
                {org.planType || 'Free'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Users</p>
              <p className="text-xl font-bold text-gray-900">{org.usersCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Farms</p>
              <p className="text-xl font-bold text-gray-900">{org.farmsCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Parcels</p>
              <p className="text-xl font-bold text-gray-900">{org.parcelsCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">MRR</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(org.mrr || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Events (7 days)</span>
              <span className="font-semibold">{org.events7d || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Events (30 days)</span>
              <span className="font-semibold">{org.events30d || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Last Activity</span>
              <span className="font-semibold">
                {org.lastActivityAt
                  ? format(new Date(org.lastActivityAt), 'MMM d, yyyy HH:mm')
                  : 'Never'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Storage Used</span>
              <span className="font-semibold">{org.storageUsedMb || 0} MB</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Plan Type</span>
              <span className="font-semibold capitalize">{org.planType || 'Free'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Status</span>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  org.subscriptionStatus === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                } capitalize`}
              >
                {org.subscriptionStatus || 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Monthly Revenue</span>
              <span className="font-semibold">{formatCurrency(org.mrr || 0)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Annual Revenue</span>
              <span className="font-semibold">{formatCurrency(org.arr || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/analytics/organizations/$orgId')({
  component: OrgDetailPage,
});
