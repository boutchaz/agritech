import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Download, Trash2, Calendar, Building2, Users } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import {
  useAddHolidays,
  useCreateHolidayList,
  useDeleteHolidayList,
  useHolidayLists,
  usePullRegionalHolidays,
} from '@/hooks/useLeaveManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { format } from 'date-fns';

export const Route = createFileRoute(
  '/_authenticated/(workforce)/workforce/holidays',
)({
  component: withRouteProtection(HolidaysPage, 'manage', 'Holiday'),
});

function HolidaysPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const listsQuery = useHolidayLists(orgId);
  const createList = useCreateHolidayList();
  const deleteList = useDeleteHolidayList();
  const pull = usePullRegionalHolidays();

  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  if (!orgId) return null;
  const lists = listsQuery.data ?? [];

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: Calendar, label: t('holidays.title', 'Holidays'), isActive: true },
        ]}
        title={t('holidays.title', 'Holidays')}
        subtitle={t(
          'holidays.subtitle',
          'Manage holiday lists by year. Holidays counted as paid days during payroll runs.',
        )}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('holidays.createList', 'New list')}
          </Button>
        }
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {listsQuery.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('holidays.empty', 'No holiday lists yet — create one for the current year.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <Card key={list.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {list.name}
                    <Badge variant="outline">{list.year}</Badge>
                    {!list.is_active && (
                      <Badge variant="outline">{t('common.inactive', 'Inactive')}</Badge>
                    )}
                  </CardTitle>
                  {list.description && (
                    <p className="text-sm text-gray-500 mt-1">{list.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {list.year && list.organization_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pull.isPending}
                      onClick={() => {
                        if (
                          !confirm(
                            t(
                              'holidays.confirmPull',
                              'Pull standard Moroccan public holidays for {{year}}?',
                              { year: list.year },
                            ),
                          )
                        )
                          return;
                        pull.mutate(
                          { orgId, listId: list.id, year: list.year },
                          {
                            onSuccess: () =>
                              toast.success(t('holidays.pulled', 'Pulled regional holidays')),
                            onError: (err: any) =>
                              toast.error(err?.message ?? t('common.errorOccurred', 'An error occurred')),
                          },
                        );
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {t('holidays.pullRegional', 'Pull MA holidays')}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setAdding(list.id)}>
                    <Plus className="w-4 h-4 mr-1" />
                    {t('holidays.addHoliday', 'Add')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!confirm(t('holidays.confirmDelete', 'Delete this list and all its holidays?'))) return;
                      deleteList.mutate(
                        { orgId, listId: list.id },
                        { onSuccess: () => toast.success(t('common.deleted', 'Deleted')) },
                      );
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(list.holidays?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    {t('holidays.noEntries', 'No holidays in this list yet.')}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded border dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">{t('common.date', 'Date')}</th>
                          <th className="px-3 py-2 font-medium">{t('common.name', 'Name')}</th>
                          <th className="px-3 py-2 font-medium">{t('common.type', 'Type')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...(list.holidays ?? [])]
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map((h) => (
                            <tr key={h.id} className="border-t dark:border-gray-700">
                              <td className="px-3 py-2">{format(new Date(h.date), 'PP')}</td>
                              <td className="px-3 py-2">
                                {h.name}
                                {h.name_fr && (
                                  <span className="text-xs text-gray-500 ml-2">/ {h.name_fr}</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant="outline">{h.holiday_type}</Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {creating && (
        <CreateListDialog
          onClose={() => setCreating(false)}
          onSubmit={async (data) => {
            await createList.mutateAsync({ orgId, data });
            toast.success(t('common.created', 'Created'));
            setCreating(false);
          }}
        />
      )}
      {adding && (
        <AddHolidayDialog
          orgId={orgId}
          listId={adding}
          onClose={() => setAdding(null)}
        />
      )}
      </div>
    </>
  );
}

function CreateListDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { name: string; year: number; description?: string }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('validation.nameRequired', 'Name is required'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ name, year, description: description || undefined });
    } catch (err: any) {
      toast.error(err?.message ?? t('common.errorOccurred', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title={t('holidays.createList', 'New holiday list')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.create', 'Create')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>{t('common.name', 'Name')}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Morocco National Holidays 2026"
          />
        </div>
        <div className="space-y-1">
          <Label>{t('common.year', 'Year')}</Label>
          <Input
            type="number"
            min={1900}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label>{t('common.description', 'Description')}</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function AddHolidayDialog({
  orgId,
  listId,
  onClose,
}: {
  orgId: string;
  listId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const add = useAddHolidays();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [name, setName] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState<'public' | 'optional' | 'weekly_off'>('public');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('validation.nameRequired', 'Name is required'));
      return;
    }
    setSubmitting(true);
    try {
      await add.mutateAsync({
        orgId,
        listId,
        data: {
          holidays: [
            {
              date,
              name,
              name_fr: nameFr || undefined,
              name_ar: nameAr || undefined,
              holiday_type: type,
            },
          ],
        },
      });
      toast.success(t('common.added', 'Added'));
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? t('common.errorOccurred', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title={t('holidays.addHoliday', 'Add holiday')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.add', 'Add')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>{t('common.date', 'Date')}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t('common.name', 'Name')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>FR</Label>
            <Input value={nameFr} onChange={(e) => setNameFr(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>AR</Label>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>{t('common.type', 'Type')}</Label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="public">{t('holidays.type.public', 'Public')}</option>
            <option value="optional">{t('holidays.type.optional', 'Optional')}</option>
            <option value="weekly_off">{t('holidays.type.weekly_off', 'Weekly off')}</option>
          </select>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
