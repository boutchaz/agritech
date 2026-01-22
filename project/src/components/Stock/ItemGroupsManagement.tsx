import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useItemGroups,
  useCreateItemGroup,
  useUpdateItemGroup,
  useDeleteItemGroup,
} from '@/hooks/useItems';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Loader2, FolderOpen, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ItemGroup } from '@/types/items';

interface ItemGroupFormData {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

export default function ItemGroupsManagement() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { data: itemGroups = [], isLoading } = useItemGroups({ is_active: true });
  const createItemGroup = useCreateItemGroup();
  const updateItemGroup = useUpdateItemGroup();
  const deleteItemGroup = useDeleteItemGroup();

  const [showDialog, setShowDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ItemGroup | null>(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<ItemGroup | null>(null);

  const [formData, setFormData] = useState<ItemGroupFormData>({
    name: '',
    code: '',
    description: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      is_active: true,
    });
    setEditingGroup(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleOpenEdit = (group: ItemGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      code: group.code || '',
      description: group.description || '',
      is_active: group.is_active ?? true,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentOrganization || !formData.name.trim()) {
      toast.error(t('items.itemGroup.nameRequired'));
      return;
    }

    try {
      if (editingGroup) {
        await updateItemGroup.mutateAsync({
          groupId: editingGroup.id,
          input: {
            name: formData.name.trim(),
            code: formData.code.trim() || undefined,
            description: formData.description.trim() || undefined,
            is_active: formData.is_active,
          },
        });
        toast.success(t('items.itemGroup.updated'));
      } else {
        await createItemGroup.mutateAsync({
          organization_id: currentOrganization.id,
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          description: formData.description.trim() || undefined,
          is_active: formData.is_active,
        });
        toast.success(t('items.itemGroup.created'));
      }
      setShowDialog(false);
      resetForm();
    } catch (error: any) {
      toast.error(`Failed to ${editingGroup ? 'update' : 'create'} item group: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmGroup) return;

    try {
      await deleteItemGroup.mutateAsync(deleteConfirmGroup.id);
      toast.success(t('items.itemGroup.deleted'));
      setDeleteConfirmGroup(null);
    } catch (error: any) {
      toast.error(`Failed to delete item group: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                {t('items.itemGroup.title')}
              </CardTitle>
              <CardDescription>{t('items.itemGroup.manageDescription')}</CardDescription>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('items.itemGroup.createNew')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {itemGroups.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('items.itemGroup.noGroups')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('items.itemGroup.noGroupsDescription')}
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {t('items.itemGroup.createFirst')}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('items.itemGroup.code')}</TableHead>
                    <TableHead>{t('items.itemGroup.name')}</TableHead>
                    <TableHead>{t('items.itemGroup.groupDescription')}</TableHead>
                    <TableHead className="text-center">{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-mono text-sm">{group.code || '-'}</TableCell>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {group.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            group.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {group.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmGroup(group)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? t('items.itemGroup.edit') : t('items.itemGroup.createNew')}
            </DialogTitle>
            <DialogDescription>
              {editingGroup
                ? t('items.itemGroup.editDescription')
                : t('items.itemGroup.description')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('items.itemGroup.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('items.itemGroup.namePlaceholder')}
                required
              />
            </div>
            <div>
              <Label htmlFor="code">{t('items.itemGroup.code')}</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder={t('items.itemGroup.codePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="description">{t('items.itemGroup.groupDescription')}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('items.itemGroup.descriptionPlaceholder')}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="font-normal">
                {t('common.active')}
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createItemGroup.isPending || updateItemGroup.isPending}
              >
                {createItemGroup.isPending || updateItemGroup.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingGroup ? t('common.saving') : t('common.creating')}
                  </>
                ) : editingGroup ? (
                  t('common.save')
                ) : (
                  t('common.create')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmGroup}
        onOpenChange={(open) => !open && setDeleteConfirmGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.itemGroup.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.itemGroup.deleteConfirmation', {
                name: deleteConfirmGroup?.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteItemGroup.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItemGroup.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.deleting')}
                </>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
