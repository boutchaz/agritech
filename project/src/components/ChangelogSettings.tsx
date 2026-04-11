import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Globe, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { Switch } from '@/components/ui/switch';
import {
  useChangelogs,
  useCreateChangelog,
  useUpdateChangelog,
  useDeleteChangelog,
} from '@/hooks/useChangelogs';
import type { Changelog, ChangelogCategory, CreateChangelogInput } from '@/lib/api/changelogs';

const categoryConfig: Record<ChangelogCategory, { label: string; color: string }> = {
  feature: { label: 'Feature', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  improvement: { label: 'Improvement', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  fix: { label: 'Fix', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  breaking: { label: 'Breaking', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  infra: { label: 'Infra', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300' },
};

const createSchema = (t: (key: string) => string) =>
  z.object({
    title: z.string().min(1, t('validation.required')),
    description: z.string().min(1, t('validation.required')),
    version: z.string().optional(),
    category: z.enum(['feature', 'improvement', 'fix', 'breaking', 'infra']),
    published_at: z.string().optional(),
    is_global: z.boolean(),
  });

type FormData = z.infer<ReturnType<typeof createSchema>>;

const defaultValues: FormData = {
  title: '',
  description: '',
  version: '',
  category: 'feature',
  published_at: new Date().toISOString().slice(0, 16),
  is_global: false,
};

const ChangelogSettings = () => {
  const { t } = useTranslation();
  const { data: changelogs, isLoading } = useChangelogs();
  const createChangelog = useCreateChangelog();
  const updateChangelog = useUpdateChangelog();
  const deleteChangelog = useDeleteChangelog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChangelog, setEditingChangelog] = useState<Changelog | null>(null);

  const schema = useState(() => createSchema(t))[0];
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleOpenCreate = () => {
    setEditingChangelog(null);
    form.reset(defaultValues);
    setDialogOpen(true);
  };

  const handleOpenEdit = (changelog: Changelog) => {
    setEditingChangelog(changelog);
    form.reset({
      title: changelog.title,
      description: changelog.description,
      version: changelog.version ?? '',
      category: changelog.category,
      published_at: changelog.published_at ? changelog.published_at.slice(0, 16) : '',
      is_global: changelog.is_global,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload: CreateChangelogInput = {
      ...data,
      version: data.version || undefined,
      published_at: data.published_at || undefined,
    };

    const mutation = editingChangelog ? updateChangelog : createChangelog;
    const promise = editingChangelog
      ? mutation.mutateAsync({ id: editingChangelog.id, data: payload })
      : mutation.mutateAsync(payload);

    promise
      .then(() => {
        toast.success(editingChangelog ? t('common.updated') : t('common.created'));
        setDialogOpen(false);
        form.reset(defaultValues);
        setEditingChangelog(null);
      })
      .catch(() => toast.error(t('common.error')));
  };

  const handleDelete = (id: string) => {
    deleteChangelog.mutateAsync(id).then(() => {
      toast.success(t('common.deleted'));
    }).catch(() => toast.error(t('common.error')));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
            <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('settings.changelog.title', 'Changelog')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('settings.changelog.description', 'Public history of product changes')}
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('common.add', 'Add')}
        </Button>
      </div>

      {!changelogs || changelogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border rounded-lg border-dashed">
          <Globe className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('settings.changelog.empty', 'No changelog entries yet. Document your first release.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {changelogs.map((entry) => {
            const cat = categoryConfig[entry.category] ?? categoryConfig.feature;
            return (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {entry.is_global ? (
                          <Globe className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Building2 className="h-4 w-4 text-slate-400" />
                        )}
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {entry.title}
                        </h3>
                        <Badge className={cn('text-[10px]', cat.color)}>
                          {cat.label}
                        </Badge>
                        {entry.version && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            v{entry.version}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 whitespace-pre-line">
                        {entry.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {formatDate(entry.published_at)}
                        {entry.is_global ? ' - Global' : ' - Organization'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingChangelog ? t('common.edit') : t('common.add')}{' '}
              {t('settings.changelog.title', 'Changelog')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...form.register('title')} placeholder="New parcel analytics dashboard" />
              {form.formState.errors.title && (
                <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                {...form.register('description')}
                className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Describe what changed in user-friendly language..."
              />
              {form.formState.errors.description && (
                <p className="text-xs text-red-500">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Version</Label>
                <Input {...form.register('version')} placeholder="2.1.0" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.watch('category')} onValueChange={(v) => form.setValue('category', v as ChangelogCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                    <SelectItem value="fix">Fix</SelectItem>
                    <SelectItem value="breaking">Breaking</SelectItem>
                    <SelectItem value="infra">Infra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Published at</Label>
              <Input type="datetime-local" {...form.register('published_at')} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.watch('is_global')} onCheckedChange={(v) => form.setValue('is_global', v)} />
              <Label>Global (visible to all organizations)</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createChangelog.isPending || updateChangelog.isPending}>
                {createChangelog.isPending || updateChangelog.isPending
                  ? t('common.saving', 'Saving...')
                  : editingChangelog ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChangelogSettings;
