import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api-client';
import { DataTable } from '@/components/DataTable';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

function JobsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['job-logs', page],
    queryFn: () =>
      adminApi.getJobLogs(pageSize, (page - 1) * pageSize),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed_with_errors':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800',
      completed_with_errors: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          styles[status] || styles.pending
        }`}
      >
        {getStatusIcon(status)}
        <span className="capitalize">{status.replace(/_/g, ' ')}</span>
      </span>
    );
  };

  const columns = [
    {
      key: 'job_type',
      header: 'Type',
      render: (row: any) => (
        <span className="font-mono text-sm">{row.job_type}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => getStatusBadge(row.status),
    },
    {
      key: 'records_processed',
      header: 'Processed',
      render: (row: any) => row.records_processed || 0,
    },
    {
      key: 'records_created',
      header: 'Created',
      render: (row: any) => (
        <span className="text-green-600">{row.records_created || 0}</span>
      ),
    },
    {
      key: 'records_updated',
      header: 'Updated',
      render: (row: any) => (
        <span className="text-blue-600">{row.records_updated || 0}</span>
      ),
    },
    {
      key: 'records_skipped',
      header: 'Skipped',
      render: (row: any) => (
        <span className="text-gray-500">{row.records_skipped || 0}</span>
      ),
    },
    {
      key: 'duration_ms',
      header: 'Duration',
      render: (row: any) =>
        row.duration_ms ? `${(row.duration_ms / 1000).toFixed(2)}s` : '-',
    },
    {
      key: 'created_at',
      header: 'Started',
      render: (row: any) =>
        row.created_at
          ? format(new Date(row.created_at), 'MMM d, HH:mm:ss')
          : '-',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Logs</h1>
        <p className="text-gray-600">View import and seed job history</p>
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

export const Route = createFileRoute('/_authenticated/jobs')({
  component: JobsPage,
});
