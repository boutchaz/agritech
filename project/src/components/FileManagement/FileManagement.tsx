import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterBar, ListPageLayout, ResponsiveList } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
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
import { toast } from 'sonner';
import {
  FileText,
  Image,
  File,
  Trash2,
  AlertTriangle, ExternalLink,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { filesApi, FileRegistry } from '@/lib/api/files';
import { useAuth } from '@/hooks/useAuth';
import { formatBytes } from '@/lib/utils';

export function FileManagement() {
  const { currentOrganization } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOrphansOnly, setShowOrphansOnly] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileRegistry | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch files
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['files', currentOrganization?.id, selectedBucket, showOrphansOnly],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      return filesApi.getAll(
        {
          bucket: selectedBucket === 'all' ? undefined : selectedBucket,
          orphansOnly: showOrphansOnly,
        },
        currentOrganization.id,
      );
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch storage stats
  const { data: stats = [] } = useQuery({
    queryKey: ['file-stats', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      return filesApi.getStats(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch orphaned files
  const { data: orphanedFiles = [], refetch: refetchOrphans } = useQuery({
    queryKey: ['orphaned-files', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      return filesApi.detectOrphaned(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id && showOrphansOnly,
  });

  // Sync existing files mutation
  const syncFilesMutation = useMutation({
    mutationFn: () => filesApi.syncExisting(currentOrganization?.id),
    onSuccess: (data) => {
      toast.success(
        t('fileManagement.toast.syncSuccess', {
          defaultValue: `${data.synced} files synchronized, ${data.skipped} skipped`,
          synced: data.synced,
          skipped: data.skipped,
        }),
      );
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file-stats'] });
    },
    onError: () => {
      toast.error(
        t('fileManagement.toast.syncError', 'Error syncing files'),
      );
    },
  });

  // Mark orphaned files mutation
  const markOrphanedMutation = useMutation({
    mutationFn: () => filesApi.markOrphaned(currentOrganization?.id),
    onSuccess: (data) => {
      toast.success(
        t('fileManagement.toast.markOrphanedSuccess', {
          defaultValue: `${data.marked_count} files marked as orphaned`,
          count: data.marked_count,
        }),
      );
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['orphaned-files'] });
      refetchOrphans();
    },
    onError: () => {
      toast.error(
        t('fileManagement.toast.markOrphanedError', 'Error marking orphaned files'),
      );
    },
  });

  // Delete orphaned files mutation
  const deleteOrphanedMutation = useMutation({
    mutationFn: () => filesApi.deleteOrphaned(currentOrganization?.id),
    onSuccess: (result) => {
      toast.success(
        t('fileManagement.toast.deleteOrphanedSuccess', {
          defaultValue: `${result.deleted} files deleted, ${result.failed} errors`,
          deleted: result.deleted,
          failed: result.failed,
        }),
      );
      if (result.errors.length > 0) {
        console.error('Erreurs de suppression:', result.errors);
      }
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file-stats'] });
      queryClient.invalidateQueries({ queryKey: ['orphaned-files'] });
    },
    onError: () => {
      toast.error(
        t('fileManagement.toast.deleteOrphanedError', 'Error deleting orphaned files'),
      );
    },
  });

  // Delete single file mutation
  const deleteSingleMutation = useMutation({
    mutationFn: (fileId: string) =>
      filesApi.deletePermanently(fileId, currentOrganization?.id),
    onSuccess: () => {
      toast.success(
        t('fileManagement.toast.deleteFileSuccess', 'File deleted successfully'),
      );
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file-stats'] });
      setShowDeleteDialog(false);
      setFileToDelete(null);
    },
    onError: () => {
      toast.error(
        t('fileManagement.toast.deleteFileError', 'Error deleting file'),
      );
    },
  });

  const handleDeleteFile = (file: FileRegistry) => {
    setFileToDelete(file);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      deleteSingleMutation.mutate(fileToDelete.id);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const resolveFileOpenUrl = (file: FileRegistry): string | null => {
    if (file.public_url && /^https?:\/\//i.test(file.public_url)) {
      return file.public_url;
    }
    return null;
  };

  const filteredFiles = files.filter((file) =>
    file.file_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalStats = stats.reduce(
    (acc, stat) => ({
      file_count: acc.file_count + stat.file_count,
      total_size_mb: acc.total_size_mb + stat.total_size_mb,
      orphan_count: acc.orphan_count + stat.orphan_count,
      orphan_size_mb: acc.orphan_size_mb + stat.orphan_size_mb,
    }),
    { file_count: 0, total_size_mb: 0, orphan_count: 0, orphan_size_mb: 0 },
  );

  const renderFileCard = (file: FileRegistry) => {
    const fileUrl = resolveFileOpenUrl(file);

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {file.mime_type.startsWith('image/') && fileUrl ? (
                <img
                  src={fileUrl}
                  alt=""
                  className="h-12 w-12 rounded-md object-cover border border-border shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted shrink-0">
                  {getFileIcon(file.mime_type)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">{file.file_name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline">{file.bucket_name}</Badge>
                  {file.is_orphan ? (
                    <Badge variant="destructive">{t('fileManagement.status.orphaned', 'Orphaned')}</Badge>
                  ) : file.marked_for_deletion ? (
                    <Badge variant="outline" className="text-orange-600">
                      {t('fileManagement.status.markedForDeletion', 'Marked for deletion')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t('fileManagement.status.active', 'Active')}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                disabled={!fileUrl}
                onClick={() => {
                  if (fileUrl) window.open(fileUrl, '_blank', 'noopener,noreferrer');
                }}
                title={fileUrl ? undefined : t('fileManagement.publicUrlUnavailable', 'Public URL unavailable (check API / bucket config)')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteFile(file)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t('fileManagement.labels.entity', 'Entity')}</p>
              {file.entity_type ? (
                <div>
                  <p className="font-medium">{file.entity_type}</p>
                  {file.field_name && (
                    <p className="text-muted-foreground">{file.field_name}</p>
                  )}
                </div>
              ) : (
                <p>—</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">{t('fileManagement.labels.size', 'Size')}</p>
              <p>{formatBytes(file.file_size)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('fileManagement.labels.uploadedAt', 'Upload date')}</p>
              <p>{new Date(file.uploaded_at).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('fileManagement.labels.type', 'Type')}</p>
              <p className="truncate">{file.mime_type}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTableHeader = (
      <TableRow>
      <TableHead>{t('fileManagement.table.file', 'File')}</TableHead>
      <TableHead>{t('fileManagement.table.bucket', 'Bucket')}</TableHead>
      <TableHead>{t('fileManagement.table.entity', 'Entity')}</TableHead>
      <TableHead>{t('fileManagement.table.size', 'Size')}</TableHead>
      <TableHead>{t('fileManagement.table.uploadedAt', 'Upload date')}</TableHead>
      <TableHead>{t('fileManagement.table.status', 'Status')}</TableHead>
      <TableHead className="text-right">{t('fileManagement.table.actions', 'Actions')}</TableHead>
    </TableRow>
  );

  const renderTable = (file: FileRegistry) => {
    const fileUrl = resolveFileOpenUrl(file);

    return (
      <>
        <TableCell>
          <div className="flex items-center gap-2 min-w-0">
            {file.mime_type.startsWith('image/') && fileUrl ? (
              <img
                src={fileUrl}
                alt=""
                className="h-9 w-9 rounded-md object-cover border border-border shrink-0"
                loading="lazy"
              />
            ) : (
              getFileIcon(file.mime_type)
            )}
            <span className="font-medium truncate">{file.file_name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{file.bucket_name}</Badge>
        </TableCell>
        <TableCell>
          {file.entity_type ? (
            <div className="text-sm">
              <div className="font-medium">{file.entity_type}</div>
              {file.field_name && (
                <div className="text-muted-foreground">
                  {file.field_name}
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>{formatBytes(file.file_size)}</TableCell>
        <TableCell>
          {new Date(file.uploaded_at).toLocaleDateString('fr-FR')}
        </TableCell>
        <TableCell>
          {file.is_orphan ? (
            <Badge variant="destructive">Orphelin</Badge>
          ) : file.marked_for_deletion ? (
            <Badge variant="outline" className="text-orange-600">
              À supprimer
            </Badge>
          ) : (
            <Badge variant="secondary">Actif</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!fileUrl}
              onClick={() => {
                if (fileUrl) window.open(fileUrl, '_blank', 'noopener,noreferrer');
              }}
              title={fileUrl ? undefined : 'URL publique indisponible (vérifiez la config API / bucket)'}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteFile(file)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </>
    );
  };

  return (
    <ListPageLayout
      header={
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t('fileManagement.title', 'File management')}</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('fileManagement.description', 'Manage all files stored in your Supabase buckets')}
          </p>
        </div>
      }
      filters={
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex-1">
              <FilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t('fileManagement.searchPlaceholder', 'Search files...')}
                isSearching={filesLoading}
              />
            </div>
            <Select value={selectedBucket} onValueChange={setSelectedBucket}>
              <SelectTrigger className="w-full lg:w-[240px]">
                <SelectValue placeholder={t('fileManagement.bucketPlaceholder', 'Select a bucket')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fileManagement.allBuckets', 'All buckets')}</SelectItem>
                {stats.map((stat) => (
                  <SelectItem key={stat.bucket_name} value={stat.bucket_name}>
                    {stat.bucket_name} ({stat.file_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showOrphansOnly ? 'default' : 'outline'}
              onClick={() => setShowOrphansOnly(!showOrphansOnly)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {t('fileManagement.orphansOnly', 'Orphans only')}
            </Button>
          </div>
        </div>
      }
      stats={
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('fileManagement.stats.totalFiles', 'Total files')}</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.file_count}</div>
                <p className="text-xs text-muted-foreground">
                  {totalStats.total_size_mb.toFixed(2)} MB
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('fileManagement.stats.orphanFiles', 'Orphan files')}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {totalStats.orphan_count}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('fileManagement.stats.orphanCleanupCount', {
                    defaultValue: `${totalStats.orphan_size_mb.toFixed(2)} MB to clean up`,
                    count: totalStats.orphan_size_mb.toFixed(2),
                  })}
                </p>
              </CardContent>
            </Card>

            {stats.map((stat) => (
              <Card key={stat.bucket_name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {stat.bucket_name}
                  </CardTitle>
                  <File className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.file_count}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.total_size_mb.toFixed(2)} MB
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader>
              <CardTitle className="text-orange-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t('fileManagement.cleanup.title', 'Orphan file cleanup')}
              </CardTitle>
              <CardDescription>
                {t('fileManagement.cleanup.description', 'Orphan files are not linked to any entity (products, invoices, etc.) and can be safely deleted.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncFilesMutation.mutate()}
                  disabled={syncFilesMutation.isPending}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('fileManagement.actions.syncFiles', 'Sync files')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchOrphans()}
                  disabled={markOrphanedMutation.isPending}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('fileManagement.actions.detectOrphans', 'Detect orphans')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markOrphanedMutation.mutate()}
                  disabled={markOrphanedMutation.isPending || orphanedFiles.length === 0}
                >
                  {t('fileManagement.actions.markForDeletion', 'Mark for deletion')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteOrphanedMutation.mutate()}
                  disabled={deleteOrphanedMutation.isPending || totalStats.orphan_count === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('fileManagement.actions.deleteAllOrphans', 'Delete all orphans')}
                </Button>
              </div>
              {orphanedFiles.length > 0 && (
                <p className="text-sm text-orange-600">
                  {t('fileManagement.orphanedDetected', {
                    defaultValue: `${orphanedFiles.length} orphan files detected`,
                    count: orphanedFiles.length,
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      }
    >
      <ResponsiveList
        items={filteredFiles}
        isLoading={filesLoading}
        isFetching={filesLoading}
        keyExtractor={(file) => file.id}
        renderCard={renderFileCard}
        renderTableHeader={renderTableHeader}
        renderTable={renderTable}
        emptyIcon={FileText}
        emptyTitle={t('fileManagement.empty.title', 'No files found')}
        emptyMessage={searchQuery.trim() || selectedBucket !== 'all' || showOrphansOnly
          ? t('fileManagement.empty.filtered', 'No files match the current filters.')
          : t('fileManagement.empty.default', 'No files available yet.')}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('fileManagement.deleteDialog.title', 'Confirm deletion')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('fileManagement.deleteDialog.description', {
                defaultValue: 'Are you sure you want to permanently delete the file {{fileName}}? This action cannot be undone.',
                fileName: fileToDelete?.file_name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('fileManagement.deleteDialog.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t('fileManagement.deleteDialog.confirm', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListPageLayout>
  );
}
