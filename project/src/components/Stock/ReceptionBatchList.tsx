import React, { useState } from 'react';
import {
  useReceptionBatches,
  useReceptionBatchStats,
  useUpdateQualityControl,
  useMakeReceptionDecision,
  useCancelReceptionBatch,
  useDeleteReceptionBatch,
} from '@/hooks/useReceptionBatches';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Package,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Archive,
} from 'lucide-react';
import type {
  ReceptionBatch,
  ReceptionBatchFilters,
  ReceptionBatchStatus,
  ReceptionDecision,
  QualityGrade,
} from '@/types/reception';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReceptionBatchListProps {
  onCreateClick: () => void;
  onViewClick: (batch: ReceptionBatch) => void;
}

const STATUS_COLORS: Record<ReceptionBatchStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  quality_checked: 'bg-purple-100 text-purple-800',
  decision_made: 'bg-orange-100 text-orange-800',
  processed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const DECISION_COLORS: Record<ReceptionDecision, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  direct_sale: 'bg-green-100 text-green-800',
  storage: 'bg-blue-100 text-blue-800',
  transformation: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
};

const QUALITY_GRADE_COLORS: Record<QualityGrade, string> = {
  Extra: 'bg-emerald-100 text-emerald-800',
  A: 'bg-green-100 text-green-800',
  First: 'bg-green-100 text-green-800',
  B: 'bg-yellow-100 text-yellow-800',
  Second: 'bg-yellow-100 text-yellow-800',
  C: 'bg-orange-100 text-orange-800',
  Third: 'bg-orange-100 text-orange-800',
};

export default function ReceptionBatchList({
  onCreateClick,
  onViewClick,
}: ReceptionBatchListProps) {
  const [filters, setFilters] = useState<ReceptionBatchFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    batch: ReceptionBatch;
    action: 'cancel' | 'delete';
  } | null>(null);

  const { data: batches = [], isLoading } = useReceptionBatches(filters);
  const { data: stats } = useReceptionBatchStats(filters);
  const cancelBatch = useCancelReceptionBatch();
  const deleteBatch = useDeleteReceptionBatch();

  // Filter batches by search term
  const filteredBatches = batches.filter(
    (batch) =>
      batch.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.producer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.quality_notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCancel = async (batchId: string) => {
    try {
      await cancelBatch.mutateAsync(batchId);
      toast.success('Reception batch cancelled');
      setConfirmAction(null);
    } catch (error: any) {
      toast.error(`Failed to cancel batch: ${error.message}`);
    }
  };

  const handleDelete = async (batchId: string) => {
    try {
      await deleteBatch.mutateAsync(batchId);
      toast.success('Reception batch deleted');
      setConfirmAction(null);
    } catch (error: any) {
      toast.error(`Failed to delete batch: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading reception batches...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reception Batches</h2>
          <p className="text-gray-600">Track harvest reception and quality control</p>
        </div>
        <Button onClick={onCreateClick}>
          <Plus className="w-4 h-4 mr-2" />
          New Reception Batch
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Batches
              </CardTitle>
              <Package className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_batches}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Weight
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_weight.toFixed(0)} kg
              </div>
              <p className="text-xs text-gray-500 mt-1">Received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Quality
              </CardTitle>
              <ClipboardCheck className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.average_quality_score?.toFixed(1) || 'N/A'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Out of 10</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Decisions
              </CardTitle>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.by_decision.pending}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting decision</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by batch code, producer, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  status: value === 'all' ? undefined : (value as ReceptionBatchStatus),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="quality_checked">Quality Checked</SelectItem>
                <SelectItem value="decision_made">Decision Made</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Decision Filter */}
          <div>
            <Select
              value={filters.decision || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  decision: value === 'all' ? undefined : (value as ReceptionDecision),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Decisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Decisions</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
                <SelectItem value="direct_sale">Direct Sale</SelectItem>
                <SelectItem value="transformation">Transformation</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Code</TableHead>
              <TableHead>Reception Date</TableHead>
              <TableHead>Parcel</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No reception batches found</p>
                  <p className="text-sm mt-1">
                    Create your first reception batch to track harvest quality control
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.batch_code}</TableCell>
                  <TableCell>
                    {new Date(batch.reception_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{batch.parcel?.name || 'Unknown'}</p>
                      {batch.parcel?.farm && (
                        <p className="text-xs text-gray-500">
                          {batch.parcel.farm.name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {batch.weight.toFixed(2)} {batch.weight_unit}
                  </TableCell>
                  <TableCell>
                    {batch.quality_grade ? (
                      <div className="flex items-center gap-2">
                        <Badge
                          className={QUALITY_GRADE_COLORS[batch.quality_grade]}
                        >
                          {batch.quality_grade}
                        </Badge>
                        {batch.quality_score && (
                          <span className="text-sm text-gray-600">
                            {batch.quality_score}/10
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Not graded</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={DECISION_COLORS[batch.decision]}>
                      {batch.decision === 'direct_sale'
                        ? 'Direct Sale'
                        : batch.decision.charAt(0).toUpperCase() +
                          batch.decision.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[batch.status]}>
                      {batch.status === 'quality_checked'
                        ? 'Quality Checked'
                        : batch.status === 'decision_made'
                        ? 'Decision Made'
                        : batch.status.charAt(0).toUpperCase() +
                          batch.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewClick(batch)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>

                        {batch.status === 'received' && (
                          <>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirmAction({ batch, action: 'delete' })
                              }
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}

                        {batch.status !== 'cancelled' &&
                          batch.status !== 'processed' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmAction({ batch, action: 'cancel' })
                                }
                                className="text-orange-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Batch
                              </DropdownMenuItem>
                            </>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <AlertDialog
          open={!!confirmAction}
          onOpenChange={() => setConfirmAction(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction.action === 'cancel'
                  ? 'Cancel Reception Batch'
                  : 'Delete Reception Batch'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction.action === 'cancel'
                  ? 'This will mark the batch as cancelled. This action cannot be undone.'
                  : 'This will permanently delete the batch. Only batches in "received" status can be deleted.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const { batch, action } = confirmAction;
                  if (action === 'cancel') handleCancel(batch.id);
                  else if (action === 'delete') handleDelete(batch.id);
                }}
                className={
                  confirmAction.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }
              >
                {confirmAction.action === 'cancel' ? 'Cancel Batch' : 'Delete Batch'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
