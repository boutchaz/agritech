import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useItemGroups,
  useCreateItemGroup,
  useUpdateItemGroup,
  useDeleteItemGroup,
} from '@/hooks/useItems';
import { useAuth } from '@/hooks/useAuth';
import { useFormErrors } from '@/hooks/useFormErrors';
import { itemsApi } from '@/lib/api/items';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { FilterBar, ListPageLayout, ResponsiveList, DataTablePagination } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FolderOpen,
  Package,
  Download,
  ChevronDown,
  ChevronRightIcon,
  List,
  // GitBranchPlus,
  FolderTree,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ItemGroup } from '@/types/items';

const itemGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  parent_group_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || undefined),
  is_active: z.boolean(),
});

type ItemGroupFormValues = z.input<typeof itemGroupSchema>;
type ItemGroupFormData = z.output<typeof itemGroupSchema>;

type ViewMode = 'table' | 'tree';

interface TreeNode extends ItemGroup {
  children: TreeNode[];
}

function buildTree(groups: ItemGroup[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create tree nodes
  for (const group of groups) {
    map.set(group.id, { ...group, children: [] });
  }

  // Build parent-child relationships
  for (const group of groups) {
    const node = map.get(group.id)!;
    if (group.parent_group_id && map.has(group.parent_group_id)) {
      map.get(group.parent_group_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ─── Tree Node Component ─────────────────────────────────────────────────
interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (group: ItemGroup) => void;
  onDelete: (group: ItemGroup) => void;
  onAddChild: (parentId: string) => void;
  t: (key: string, defaultValue?: string) => string;
}

function TreeNodeRow({ node, depth, expanded, onToggle, onEdit, onDelete, onAddChild, t }: TreeNodeRowProps) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <>
      <TableRow className={cn(depth > 0 && 'bg-muted/30')}>
        <TableCell className="font-mono text-sm">{node.code || '-'}</TableCell>
        <TableCell>
          <div className="flex items-center" style={{ paddingInlineStart: `${depth * 1.5}rem` }}>
            {hasChildren ? (
              <Button
                onClick={() => onToggle(node.id)}
                className="mr-1.5 p-0.5 rounded hover:bg-muted transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ) : (
              <span className="mr-1.5 w-5" />
            )}
            <FolderOpen className={cn('h-4 w-4 mr-2 shrink-0', depth === 0 ? 'text-primary' : 'text-muted-foreground')} />
            <span className="font-medium">{node.name}</span>
            {hasChildren && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {node.children.length}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
          {node.description || '-'}
        </TableCell>
        <TableCell className="text-center">
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              node.is_active
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {node.is_active ? t('common:active') : t('common:inactive')}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddChild(node.id)}
              title={t('items.itemGroup.addSubGroup')}
            >
              <Plus className="h-4 w-4 text-primary" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(node)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(node)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            t={t}
          />
        ))}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function ItemGroupsManagement() {
  const { t } = useTranslation('stock');
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { data: itemGroups = [], isLoading } = useItemGroups({ is_active: true });
  const createItemGroup = useCreateItemGroup();
  const updateItemGroup = useUpdateItemGroup();
  const deleteItemGroup = useDeleteItemGroup();
  const { handleFormError } = useFormErrors<ItemGroupFormValues>();

  const [showDialog, setShowDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ItemGroup | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<ItemGroup | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 15;

  // Parent groups only (no parent themselves)
  const parentGroups = itemGroups.filter((g) => !g.parent_group_id);

  const groupNameById = useMemo(() => new Map(itemGroups.map((g) => [g.id, g.name])), [itemGroups]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return itemGroups;
    }

    const groupsById = new Map(itemGroups.map((group) => [group.id, group]));
    const matchingIds = new Set<string>();

    for (const group of itemGroups) {
      const matches = [
        group.name,
        group.code,
        group.description,
        group.parent_group_id ? groupNameById.get(group.parent_group_id) : undefined,
      ].some((value) => value?.toLowerCase().includes(term));

      if (!matches) continue;

      let current: ItemGroup | undefined = group;
      while (current) {
        matchingIds.add(current.id);
        current = current.parent_group_id ? groupsById.get(current.parent_group_id) : undefined;
      }
    }

    return itemGroups.filter((group) => matchingIds.has(group.id));
  }, [groupNameById, itemGroups, searchTerm]);

  // Build tree for tree view
  const tree = useMemo(() => buildTree(filteredGroups), [filteredGroups]);

  // Collect all IDs that have children for expand/collapse all
  const allParentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of filteredGroups) {
      if (group.parent_group_id) {
        ids.add(group.parent_group_id);
      }
    }
    return ids;
  }, [filteredGroups]);

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpanded(new Set(allParentIds));
  }, [allParentIds]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const [predefinedImported, setPredefinedImported] = useState(false);

  const seedMutation = useMutation({
    mutationFn: () => itemsApi.seedPredefinedGroups(currentOrganization?.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['item-groups'] });
      setCurrentPage(1);
      if (result.created === 0 && result.skipped > 0) {
        setPredefinedImported(true);
      }
      toast.success(
        t('items.itemGroup.seedSuccess', {
          created: result.created,
          skipped: result.skipped,
          defaultValue: `${result.created} groups created, ${result.skipped} already existing`,
        })
      );
    },
    onError: () => {
      toast.error(t('items.itemGroup.seedFailed'));
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ItemGroupFormValues, unknown, ItemGroupFormData>({
    resolver: zodResolver(itemGroupSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      parent_group_id: '',
      is_active: true,
    },
  });

  const selectedParentId = watch('parent_group_id');

  useEffect(() => {
    if (editingGroup) {
      reset({
        name: editingGroup.name || '',
        code: editingGroup.code || '',
        description: editingGroup.description || '',
        parent_group_id: editingGroup.parent_group_id || '',
        is_active: editingGroup.is_active ?? true,
      });
    } else {
      reset({
        name: '',
        code: '',
        description: '',
        parent_group_id: defaultParentId || '',
        is_active: true,
      });
    }
  }, [editingGroup, defaultParentId, reset]);

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setDefaultParentId(null);
    setShowDialog(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleAddChild = useCallback((parentId: string) => {
    setEditingGroup(null);
    setDefaultParentId(parentId);
    setShowDialog(true);
  }, []);

  const handleOpenEdit = (group: ItemGroup) => {
    setEditingGroup(group);
    setDefaultParentId(null);
    setShowDialog(true);
  };

  const onSubmit = async (formData: ItemGroupFormData) => {
    if (!currentOrganization) {
      toast.error(t('items.itemGroup.noOrganization'));
      return;
    }

    try {
      const cleanedData = {
        name: formData.name.trim(),
        code: formData.code?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        parent_group_id: formData.parent_group_id || undefined,
        is_active: formData.is_active,
      };

      if (editingGroup) {
        await updateItemGroup.mutateAsync({
          groupId: editingGroup.id,
          input: cleanedData,
        });
        toast.success(t('items.itemGroup.updated'));
      } else {
        await createItemGroup.mutateAsync({
          organization_id: currentOrganization.id,
          ...cleanedData,
        });
        toast.success(t('items.itemGroup.created'));
      }

      setShowDialog(false);
    } catch (error: unknown) {
      handleFormError(error, setError, {
        toastMessage: t(`items.itemGroup.${editingGroup ? 'update' : 'create'}Failed`),
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmGroup) return;

    try {
      await deleteItemGroup.mutateAsync(deleteConfirmGroup.id);
      toast.success(t('items.itemGroup.deleted'));
      setDeleteConfirmGroup(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('items.itemGroup.deleteFailed', { error: errorMessage }));
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
    <ListPageLayout
      header={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {t('items.itemGroup.title')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('items.itemGroup.manageDescription')}</p>
          </div>
          <div className="flex items-center gap-2">
            {!predefinedImported && (
              <Button
                variant="outline"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
              >
                {seedMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t('items.itemGroup.importPredefined')}
              </Button>
            )}
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('items.itemGroup.createNew')}
            </Button>
          </div>
        </div>
      }
    >
      <Card>
        <CardContent>
          {itemGroups.length === 0 ? (
            <EmptyState
              icon={Package}
              title={t('items.itemGroup.noGroups')}
              description={t('items.itemGroup.noGroupsDescription')}
              action={{
                label: t('items.itemGroup.createFirst'),
                onClick: handleOpenCreate,
              }}
              secondaryAction={!predefinedImported ? {
                label: t('items.itemGroup.importPredefined'),
                onClick: () => seedMutation.mutate(),
              } : undefined}
            />
          ) : (
            <>
              <div className="mb-4">
                <FilterBar
                  searchValue={searchTerm}
                  onSearchChange={handleSearchChange}
                  searchPlaceholder={t('items.itemGroup.searchPlaceholder', 'Search groups...')}
                />
              </div>

              {/* View mode toggle + tree controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/50">
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="gap-1.5"
                  >
                    <List className="h-4 w-4" />
                    {t('items.itemGroup.tableView')}
                  </Button>
                  <Button
                    variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('tree')}
                    className="gap-1.5"
                  >
                    <FolderTree className="h-4 w-4" />
                    {t('items.itemGroup.treeView')}
                  </Button>
                </div>
                {viewMode === 'tree' && allParentIds.size > 0 && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={handleExpandAll} className="gap-1.5">
                      <ChevronsUpDown className="h-4 w-4" />
                      {t('items.itemGroup.expandAll')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCollapseAll} className="gap-1.5">
                      <ChevronsDownUp className="h-4 w-4" />
                      {t('items.itemGroup.collapseAll')}
                    </Button>
                  </div>
                )}
              </div>

              {/* ─── TABLE VIEW ─────────────────────────── */}
              {viewMode === 'table' && (
                <>
                  <ResponsiveList
                    items={paginatedGroups}
                    keyExtractor={(group) => group.id}
                    emptyIcon={Package}
                    emptyTitle={searchTerm ? t('common:noResults', 'No results found') : t('items.itemGroup.noGroups')}
                    emptyMessage={searchTerm
                      ? t('items.itemGroup.noGroupsSearch', 'No groups match your search.')
                      : t('items.itemGroup.noGroupsDescription')}
                    renderCard={(group) => (
                      <Card className="border shadow-sm">
                        <CardContent className="space-y-4 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-primary" />
                                <p className="truncate font-semibold">{group.name}</p>
                              </div>
                              <p className="font-mono text-xs text-muted-foreground">{group.code || '-'}</p>
                            </div>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                group.is_active
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                              )}
                            >
                              {group.is_active ? t('common:active') : t('common:inactive')}
                            </span>
                          </div>

                          <div className="grid gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('items.itemGroup.parentGroup')}: </span>
                              {group.parent_group_id ? groupNameById.get(group.parent_group_id) || '-' : t('items.itemGroup.mainGroup')}
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('items.itemGroup.groupDescription')}: </span>
                              {group.description || '-'}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(group)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmGroup(group)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    renderTableHeader={(
                      <TableRow>
                        <TableHead>{t('items.itemGroup.code')}</TableHead>
                        <TableHead>{t('items.itemGroup.name')}</TableHead>
                        <TableHead>{t('items.itemGroup.parentGroup')}</TableHead>
                        <TableHead>{t('items.itemGroup.groupDescription')}</TableHead>
                        <TableHead className="text-center">{t('common:statusColumn')}</TableHead>
                        <TableHead className="text-right">{t('common:actionsColumn')}</TableHead>
                      </TableRow>
                    )}
                    renderTable={(group) => (
                      <>
                        <TableCell className="font-mono text-sm">{group.code || '-'}</TableCell>
                        <TableCell className="font-medium">
                          {group.parent_group_id && <span className="text-muted-foreground mr-1">↳</span>}
                          {group.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {group.parent_group_id
                            ? groupNameById.get(group.parent_group_id) || '-'
                            : (
                              <Badge variant="outline" className="border-blue-200 text-xs text-blue-600 dark:border-blue-800 dark:text-blue-400">
                                {t('items.itemGroup.mainGroup')}
                              </Badge>
                            )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {group.description || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                              group.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            )}
                          >
                            {group.is_active ? t('common:active') : t('common:inactive')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(group)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmGroup(group)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  />
                  {filteredGroups.length > PAGE_SIZE && (
                    <DataTablePagination
                      page={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      totalItems={filteredGroups.length}
                      pageSize={PAGE_SIZE}
                      onPageSizeChange={() => {}}
                    />
                  )}
                </>
              )}

              {/* ─── TREE VIEW ──────────────────────────── */}
              {viewMode === 'tree' && (
                filteredGroups.length === 0 ? (
                  <EmptyState
                    variant="inline"
                    icon={Package}
                    title={t('common:noResults', 'No results found')}
                    description={t('items.itemGroup.noGroupsSearch', 'No groups match your search.')}
                  />
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">{t('items.itemGroup.code')}</TableHead>
                          <TableHead>{t('items.itemGroup.name')}</TableHead>
                          <TableHead>{t('items.itemGroup.groupDescription')}</TableHead>
                          <TableHead className="text-center w-[100px]">{t('common:statusColumn')}</TableHead>
                          <TableHead className="text-right w-[100px]">{t('common:actionsColumn')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tree.map((node) => (
                          <TreeNodeRow
                            key={node.id}
                            node={node}
                            depth={0}
                            expanded={expanded}
                            onToggle={handleToggle}
                            onEdit={handleOpenEdit}
                            onDelete={setDeleteConfirmGroup}
                            onAddChild={handleAddChild}
                            t={(key, defaultValue) => defaultValue ? t(key, defaultValue) : t(key)}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

       {/* Create/Edit Dialog */}
       <ResponsiveDialog
         open={showDialog}
         onOpenChange={setShowDialog}
         title={editingGroup
           ? t('items.itemGroup.edit')
           : defaultParentId
             ? t('items.itemGroup.addSubGroup')
             : t('items.itemGroup.createNew')}
         description={editingGroup
           ? t('items.itemGroup.editDescription')
           : defaultParentId
             ? t('items.itemGroup.addSubGroupDescription', {
                 parent: groupNameById.get(defaultParentId) || '',
               })
             : t('items.itemGroup.description')}
         size="lg"
       >
           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
             <div>
               <Label htmlFor="name">{t('items.itemGroup.name')} *</Label>
               <Input
                 id="name"
                 {...register('name')}
                 invalid={!!errors.name}
                 placeholder={t('items.itemGroup.namePlaceholder')}
               />
               {errors.name && (
                 <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
               )}
             </div>
             <div>
               <Label htmlFor="parent_group_id">
                 {t('items.itemGroup.parentGroup')}
               </Label>
               <Select
                 value={selectedParentId || ''}
                 onValueChange={(value) =>
                   setValue('parent_group_id', value === '_none' ? '' : value)
                 }
               >
                 <SelectTrigger id="parent_group_id" className="mt-1">
                   <SelectValue
                     placeholder={t('items.itemGroup.noParent')}
                   />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="_none">
                     {t('items.itemGroup.noParent')}
                   </SelectItem>
                   {parentGroups.map((g) => (
                     <SelectItem key={g.id} value={g.id}>
                       {g.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               {errors.parent_group_id && (
                 <p className="text-red-600 text-sm mt-1">{errors.parent_group_id.message}</p>
               )}
             </div>
             <div>
               <Label htmlFor="code">{t('items.itemGroup.code')}</Label>
               <Input
                 id="code"
                 {...register('code')}
                 invalid={!!errors.code}
                 placeholder={t('items.itemGroup.codePlaceholder')}
               />
               {errors.code && (
                 <p className="text-red-600 text-sm mt-1">{errors.code.message}</p>
               )}
             </div>
             <div>
               <Label htmlFor="description">{t('items.itemGroup.groupDescription')}</Label>
               <Input
                 id="description"
                 {...register('description')}
                 invalid={!!errors.description}
                 placeholder={t('items.itemGroup.descriptionPlaceholder')}
               />
               {errors.description && (
                 <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
               )}
             </div>
             <div className="flex items-center space-x-2">
               <input
                 type="checkbox"
                 id="is_active"
                 {...register('is_active')}
                 className="rounded border-gray-300"
               />
               <Label htmlFor="is_active" className="font-normal">
                 {t('common:active')}
               </Label>
             </div>
             <div className="flex justify-end space-x-3 pt-4">
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => setShowDialog(false)}
                 disabled={isSubmitting}
               >
                 {t('common:cancel')}
               </Button>
               <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting ? (
                   <>
                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                     {editingGroup ? t('common:saving') : t('common:creating')}
                   </>
                 ) : editingGroup ? (
                   t('common:save')
                 ) : (
                   t('common:create')
                 )}
               </Button>
             </div>
           </form>
       </ResponsiveDialog>

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
             <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
             <AlertDialogAction
               onClick={handleDelete}
               disabled={deleteItemGroup.isPending}
               className="bg-red-600 hover:bg-red-700 text-white"
             >
               {deleteItemGroup.isPending ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   {t('common:deleting')}
                 </>
               ) : (
                 t('common:delete')
               )}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
        </AlertDialog>
    </ListPageLayout>
    </>
  );
}
