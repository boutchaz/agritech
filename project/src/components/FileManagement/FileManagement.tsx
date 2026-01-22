import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Search,
  AlertTriangle, ExternalLink,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { filesApi, FileRegistry } from '@/lib/api/files';
import { useAuth } from '@/hooks/useAuth';
import { formatBytes } from '@/lib/utils';

export function FileManagement() {
  const { currentOrganization } = useAuth();
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

  // Mark orphaned files mutation
  const markOrphanedMutation = useMutation({
    mutationFn: () => filesApi.markOrphaned(currentOrganization?.id),
    onSuccess: (data) => {
      toast.success(`${data.marked_count} fichiers marqués comme orphelins`);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['orphaned-files'] });
      refetchOrphans();
    },
    onError: () => {
      toast.error('Erreur lors du marquage des fichiers orphelins');
    },
  });

  // Delete orphaned files mutation
  const deleteOrphanedMutation = useMutation({
    mutationFn: () => filesApi.deleteOrphaned(currentOrganization?.id),
    onSuccess: (result) => {
      toast.success(
        `${result.deleted} fichiers supprimés, ${result.failed} erreurs`,
      );
      if (result.errors.length > 0) {
        console.error('Erreurs de suppression:', result.errors);
      }
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file-stats'] });
      queryClient.invalidateQueries({ queryKey: ['orphaned-files'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression des fichiers orphelins');
    },
  });

  // Delete single file mutation
  const deleteSingleMutation = useMutation({
    mutationFn: (fileId: string) =>
      filesApi.deletePermanently(fileId, currentOrganization?.id),
    onSuccess: () => {
      toast.success('Fichier supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file-stats'] });
      setShowDeleteDialog(false);
      setFileToDelete(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du fichier');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion des fichiers</h2>
        <p className="text-muted-foreground">
          Gérez tous les fichiers stockés dans vos buckets Supabase
        </p>
      </div>

      {/* Storage Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total fichiers</CardTitle>
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
            <CardTitle className="text-sm font-medium">Fichiers orphelins</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalStats.orphan_count}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalStats.orphan_size_mb.toFixed(2)} MB à nettoyer
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

      {/* Orphan Detection Actions */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="text-orange-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Nettoyage des fichiers orphelins
          </CardTitle>
          <CardDescription>
            Les fichiers orphelins ne sont liés à aucune entité (produits, factures,
            etc.) et peuvent être supprimés en toute sécurité.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchOrphans()}
              disabled={markOrphanedMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Détecter les orphelins
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markOrphanedMutation.mutate()}
              disabled={markOrphanedMutation.isPending || orphanedFiles.length === 0}
            >
              Marquer pour suppression
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteOrphanedMutation.mutate()}
              disabled={
                deleteOrphanedMutation.isPending || totalStats.orphan_count === 0
              }
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer tous les orphelins
            </Button>
          </div>
          {orphanedFiles.length > 0 && (
            <p className="text-sm text-orange-600">
              {orphanedFiles.length} fichiers orphelins détectés
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Fichiers</CardTitle>
          <CardDescription>Liste de tous vos fichiers stockés</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un fichier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedBucket} onValueChange={setSelectedBucket}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sélectionner un bucket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les buckets</SelectItem>
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
              Orphelins seulement
            </Button>
          </div>

          {/* Files Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Date d'upload</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : filteredFiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Aucun fichier trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.mime_type)}
                          <span className="font-medium">{file.file_name}</span>
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
                            onClick={() => window.open(file.file_path, '_blank')}
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le fichier{' '}
              <strong>{fileToDelete?.file_name}</strong> ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
