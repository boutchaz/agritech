import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Calendar, Filter, Package } from 'lucide-react';
import { PieceWorkEntry, PieceWorkList } from '@/components/Workers/PieceWorkEntry';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { format, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Piece-Work Management Page
 *
 * View and manage all piece-work records for the farm.
 * Allows recording new work, viewing history, and filtering.
 *
 * Access: Farm managers and admins
 * Route: /workers/piece-work
 */
function PieceWorkPage() {
  const { currentFarm } = useAuth();

  // Date filter state
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Build filters object
  const filters = {
    startDate,
    endDate,
    ...(statusFilter !== 'all' && { status: statusFilter }),
  };

  if (!currentFarm) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            Please select a farm to view piece-work records
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8" />
            Piece-Work Records
          </h1>
          <p className="text-muted-foreground mt-2">
            Track work completed by units (trees, boxes, kg, etc.)
          </p>
        </div>
        <PieceWorkEntry />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Start Date */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Payment Status
              </label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="disputed">Disputed</option>
              </Select>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
              }}
            >
              <Calendar className="h-4 w-4 mr-1" />
              This Month
            </Button>
          </div>
        </div>
      </Card>

      {/* Statistics Cards (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Records</div>
          <div className="text-2xl font-bold mt-1">-</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold mt-1">-</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Amount</div>
          <div className="text-2xl font-bold mt-1">-</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Workers</div>
          <div className="text-2xl font-bold mt-1">-</div>
        </Card>
      </div>

      {/* Piece-Work List */}
      <PieceWorkList filters={filters} />
    </div>
  );
}

// Protect route - require farm manager or admin
export const Route = createFileRoute('/workers/piece-work')({
  component: withRouteProtection(
    PieceWorkPage,
    'read', // action
    'Worker' // resource
  ),
});
