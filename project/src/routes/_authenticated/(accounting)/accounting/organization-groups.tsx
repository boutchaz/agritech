import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import {
  useOrganizationGroups,
  useCreateOrganizationGroup,
  useUpdateOrganizationGroup,
  useDeleteOrganizationGroup,
  useGroupMembers,
  useAddGroupMember,
  useRemoveGroupMember,
} from '@/hooks/useOrganizationGroups';
import type { OrganizationGroup } from '@/lib/api/organization-groups';
import { PageLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Layers, Plus, Pencil, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

function OrganizationGroupsPage() {
  const { t } = useTranslation();
  const { currentOrganization, organizations } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<OrganizationGroup | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [membersGroupId, setMembersGroupId] = useState<string | null>(null);
  const [memberOrgToAdd, setMemberOrgToAdd] = useState<string>('');

  const { data: groups = [], isLoading } = useOrganizationGroups();
  const createGroup = useCreateOrganizationGroup();
  const updateGroup = useUpdateOrganizationGroup();
  const deleteGroup = useDeleteOrganizationGroup();
  const { data: members = [] } = useGroupMembers(membersGroupId);
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const schema = useMemo(() => {
    const required = t('validation.required', 'Required');
    return z.object({
      name: z.string().min(1, required),
      base_currency: z
        .string()
        .length(3, t('validation.currencyCode', 'Use a 3-letter currency code')),
    });
  }, [t]);

  type FormData = z.input<typeof schema>;
  type SubmitData = z.output<typeof schema>;
  const form = useForm<FormData, unknown, SubmitData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', base_currency: currentOrganization?.currency_code || 'MAD' },
  });

  const openCreate = () => {
    setEditTarget(null);
    form.reset({ name: '', base_currency: currentOrganization?.currency_code || 'MAD' });
    setShowForm(true);
  };

  const openEdit = (g: OrganizationGroup) => {
    setEditTarget(g);
    form.reset({ name: g.name, base_currency: g.base_currency });
    setShowForm(true);
  };

  const onSubmit = async (data: SubmitData) => {
    try {
      if (editTarget) {
        await updateGroup.mutateAsync({
          id: editTarget.id,
          data: { name: data.name, base_currency: data.base_currency.toUpperCase() },
        });
        toast.success(t('orgGroups.updateSuccess', 'Group updated'));
      } else {
        await createGroup.mutateAsync({
          name: data.name,
          base_currency: data.base_currency.toUpperCase(),
        });
        toast.success(t('orgGroups.createSuccess', 'Group created'));
      }
      setShowForm(false);
      setEditTarget(null);
    } catch (e: any) {
      toast.error(e?.message || t('orgGroups.saveError', 'Failed to save group'));
    }
  };

  const handleAddMember = async () => {
    if (!membersGroupId || !memberOrgToAdd) return;
    try {
      await addMember.mutateAsync({
        groupId: membersGroupId,
        memberOrganizationId: memberOrgToAdd,
      });
      setMemberOrgToAdd('');
      toast.success(t('orgGroups.memberAdded', 'Member added'));
    } catch (e: any) {
      toast.error(e?.message || t('orgGroups.memberAddError', 'Failed to add member'));
    }
  };

  const handleRemoveMember = async (memberOrgId: string) => {
    if (!membersGroupId) return;
    try {
      await removeMember.mutateAsync({
        groupId: membersGroupId,
        memberOrganizationId: memberOrgId,
      });
      toast.success(t('orgGroups.memberRemoved', 'Member removed'));
    } catch (e: any) {
      toast.error(e?.message || t('orgGroups.memberRemoveError', 'Failed to remove member'));
    }
  };

  if (!currentOrganization) return <PageLoader />;

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {t('orgGroups.title', 'Organization Groups')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t(
                'orgGroups.subtitle',
                'Group multiple organizations to consolidate financial reports (Group Company).',
              )}
            </p>
          </div>
          <Button variant="green" onClick={openCreate} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('orgGroups.newGroup', 'New Group')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('orgGroups.groups', 'Groups')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <PageLoader />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  {t('orgGroups.empty', 'No groups yet.')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('orgGroups.name', 'Name')}</TableHead>
                      <TableHead>{t('orgGroups.baseCurrency', 'Base Currency')}</TableHead>
                      <TableHead className="text-right">
                        {t('common.actions', 'Actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.name}</TableCell>
                        <TableCell>{g.base_currency}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMembersGroupId(g.id)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              {t('orgGroups.members', 'Members')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(g)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDeleteTarget(g.id);
                                setConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {membersGroupId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {t('orgGroups.memberOrgs', 'Member Organizations')}
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setMembersGroupId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-1">
                    {t('orgGroups.addMember', 'Add member organization')}
                  </label>
                  <NativeSelect
                    value={memberOrgToAdd}
                    onChange={(e) => setMemberOrgToAdd(e.target.value)}
                  >
                    <option value="">{t('common.select', 'Select...')}</option>
                    {organizations
                      .filter((o) => !members.some((m) => m.organization_id === o.id))
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                          {o.currency_code ? ` (${o.currency_code})` : ''}
                        </option>
                      ))}
                  </NativeSelect>
                </div>
                <Button
                  variant="green"
                  onClick={handleAddMember}
                  disabled={!memberOrgToAdd || addMember.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('common.add', 'Add')}
                </Button>
              </div>

              {members.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t('orgGroups.noMembers', 'No members yet.')}
                </p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between border rounded p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{m.organization?.name || m.organization_id}</Badge>
                        {m.organization?.currency_code && (
                          <span className="text-xs text-gray-500">
                            {m.organization.currency_code}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveMember(m.organization_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">
              {editTarget
                ? t('orgGroups.editGroup', 'Edit Group')
                : t('orgGroups.newGroup', 'New Group')}
            </h2>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('orgGroups.name', 'Name')}
                </label>
                <Input
                  {...form.register('name')}
                  className={form.formState.errors.name ? 'border-red-400' : ''}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('orgGroups.baseCurrency', 'Base Currency')}
                </label>
                <Input
                  maxLength={3}
                  {...form.register('base_currency')}
                  placeholder="MAD"
                  className={form.formState.errors.base_currency ? 'border-red-400' : ''}
                />
                {form.formState.errors.base_currency && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.base_currency.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" variant="green" disabled={form.formState.isSubmitting}>
                  {t('common.save', 'Save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('orgGroups.confirmDelete', 'Delete Group')}
        description={t(
          'orgGroups.confirmDeleteDescription',
          'Are you sure you want to delete this group? Members will be detached.',
        )}
        variant="destructive"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteGroup.mutateAsync(deleteTarget);
            toast.success(t('orgGroups.deleteSuccess', 'Group deleted'));
          } catch (e: any) {
            toast.error(e?.message || t('orgGroups.deleteError', 'Failed to delete group'));
          }
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/organization-groups')({
  component: withRouteProtection(OrganizationGroupsPage, 'read', 'JournalEntry'),
});
