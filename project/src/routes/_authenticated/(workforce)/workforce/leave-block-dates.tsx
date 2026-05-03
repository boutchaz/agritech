import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Pencil, Calendar, Ban } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import {
  useLeaveBlockDates,
  useCreateLeaveBlockDate,
  useUpdateLeaveBlockDate,
  useDeleteLeaveBlockDate,
  useLeaveTypes,
} from '@/hooks/useLeaveManagement';
import type { LeaveBlockDate, CreateLeaveBlockDateInput } from '@/lib/api/leave-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const Route = createFileRoute(
  '/_authenticated/(workforce)/workforce/leave-block-dates',
)({
  component: withRouteProtection(LeaveBlockDatesPage, 'manage', 'LeaveBlockDate'),
});

function LeaveBlockDatesPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<LeaveBlockDate | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const blockDatesQuery = useLeaveBlockDates(orgId);
  const leaveTypesQuery = useLeaveTypes(orgId);
  const createMutation = useCreateLeaveBlockDate();
  const updateMutation = useUpdateLeaveBlockDate();
  const deleteMutation = useDeleteLeaveBlockDate();

  if (!orgId) return null;

  const blockDates = blockDatesQuery.data?.data ?? [];
  const leaveTypes = leaveTypesQuery.data?.data ?? [];

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button onClick={() => { setEditing(null); setShowDialog(true); }}>
          <Plus className="h-4 w-4 me-2" />
          {t('leaveBlockDates.add', 'Add Block Date')}
        </Button>
      </div>

      {blockDatesQuery.isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : blockDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <Ban className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">{t('leaveBlockDates.empty', 'No block dates defined')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {blockDates.map((bd) => (
            <Card key={bd.id}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    {format(new Date(bd.block_date), 'd MMM yyyy', { locale: fr })}
                  </span>
                  {bd.leave_type ? (
                    <Badge variant="outline">{bd.leave_type.name}</Badge>
                  ) : (
                    <Badge variant="secondary">{t('leaveBlockDates.allTypes', 'All types')}</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{bd.reason}</p>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditing(bd); setShowDialog(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5 me-1.5" />
                    {t('common.edit', 'Edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setDeleting(bd.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 me-1.5" />
                    {t('common.delete', 'Delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showDialog && (
        <BlockDateDialog
          leaveTypes={leaveTypes}
          editing={editing}
          onClose={() => { setShowDialog(false); setEditing(null); }}
          onSubmit={(data) => {
            const promise = editing
              ? updateMutation.mutateAsync({ orgId, id: editing.id, data })
              : createMutation.mutateAsync({ orgId, data });
            promise
              .then(() => {
                setShowDialog(false);
                setEditing(null);
                toast.success(
                  editing
                    ? t('leaveBlockDates.updated', 'Block date updated')
                    : t('leaveBlockDates.created', 'Block date created'),
                );
              })
              .catch(() => {});
          }}
          submitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {deleting && (
        <ResponsiveDialog
          open
          onOpenChange={() => setDeleting(null)}
          size="sm"
          title={t('leaveBlockDates.deleteTitle', 'Delete Block Date')}
          footer={
            <>
              <Button variant="outline" onClick={() => setDeleting(null)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteMutation.mutate(
                    { orgId, id: deleting },
                    { onSettled: () => setDeleting(null) },
                  );
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.delete', 'Delete')}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('leaveBlockDates.deleteConfirm', 'Are you sure? Workers will be able to request leave on this date again.')}
          </p>
        </ResponsiveDialog>
      )}
    </>
  );
}

function BlockDateDialog({
  leaveTypes,
  editing,
  onClose,
  onSubmit,
  submitting,
}: {
  leaveTypes: { id: string; name: string }[];
  editing: LeaveBlockDate | null;
  onClose: () => void;
  onSubmit: (data: CreateLeaveBlockDateInput) => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState(editing?.block_date ?? '');
  const [reason, setReason] = useState(editing?.reason ?? '');
  const [leaveTypeId, setLeaveTypeId] = useState<string>(editing?.leave_type_id ?? '_all');

  const handleSubmit = () => {
    if (!date || !reason.trim()) {
      toast.error(t('validation.allFieldsRequired', 'All fields are required'));
      return;
    }
    onSubmit({
      block_date: date,
      reason: reason.trim(),
      leave_type_id: leaveTypeId === '_all' ? undefined : leaveTypeId,
    });
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title={editing
        ? t('leaveBlockDates.editTitle', 'Edit Block Date')
        : t('leaveBlockDates.addTitle', 'Add Block Date')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="h-4 w-4 me-2" />}
            {editing ? t('common.save', 'Save') : t('common.create', 'Create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label>{t('leaveBlockDates.date', 'Block Date')}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t('leaveBlockDates.reason', 'Reason')}</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('leaveBlockDates.reasonPlaceholder', 'e.g., Peak harvest period')}
          />
        </div>
        <div className="space-y-1">
          <Label>{t('leaveBlockDates.leaveType', 'Leave Type')}</Label>
          <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('leaveBlockDates.allTypes', 'All types')}</SelectItem>
              {leaveTypes.map((lt) => (
                <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
