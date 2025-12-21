import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';

function EventsPage() {
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState('');
  const pageSize = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['events', page, eventType],
    queryFn: () =>
      adminApi.getEvents({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        ...(eventType && { event_type: eventType }),
      }),
  });

  const { data: distribution } = useQuery({
    queryKey: ['event-distribution'],
    queryFn: () => adminApi.getEventDistribution(30),
  });

  const columns = [
    {
      key: 'event_type',
      header: 'Event Type',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-400" />
          <span className="font-mono text-sm">{row.event_type}</span>
        </div>
      ),
    },
    {
      key: 'organization_id',
      header: 'Organization',
      render: (row: any) =>
        row.organization_id ? (
          <span className="text-xs font-mono text-gray-500">
            {row.organization_id.slice(0, 8)}...
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'user_id',
      header: 'User',
      render: (row: any) =>
        row.user_id ? (
          <span className="text-xs font-mono text-gray-500">
            {row.user_id.slice(0, 8)}...
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row: any) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          {row.source || 'app'}
        </span>
      ),
    },
    {
      key: 'occurred_at',
      header: 'Time',
      render: (row: any) =>
        row.occurred_at
          ? format(new Date(row.occurred_at), 'MMM d, HH:mm:ss')
          : '-',
    },
  ];

  const eventTypes = distribution?.map((d: any) => d.event_type) || [];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600">View all tracked events</p>
        </div>
        <div>
          <select
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Event Types</option>
            {eventTypes.map((type: string) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        total={data?.total || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRefresh={() => refetch()}
        isLoading={isLoading}
      />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/analytics/events')({
  component: EventsPage,
});
