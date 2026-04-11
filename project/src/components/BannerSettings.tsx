import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, EyeOff, Megaphone } from 'lucide-react';
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
  useAllBanners,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
} from '@/hooks/useBanners';
import type { Banner, BannerSeverity, BannerAudience, CreateBannerInput } from '@/lib/api/banners';

const severityColors: Record<BannerSeverity, string> = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const createSchema = (t: (key: string) => string) =>
  z.object({
    title: z.string().min(1, t('validation.required')),
    message: z.string().min(1, t('validation.required')),
    severity: z.enum(['info', 'success', 'warning', 'critical']),
    audience: z.enum(['all', 'admins', 'managers', 'growers']),
    enabled: z.boolean(),
    dismissible: z.boolean(),
    cta_label: z.string().optional(),
    cta_url: z.string().url(t('validation.invalidUrl')).optional().or(z.literal('')),
    priority: z.number().min(0).max(100),
    start_at: z.string().optional(),
    end_at: z.string().optional(),
  });

type FormData = z.infer<ReturnType<typeof createSchema>>;

const defaultValues: FormData = {
  title: '',
  message: '',
  severity: 'info',
  audience: 'all',
  enabled: true,
  dismissible: true,
  cta_label: '',
  cta_url: '',
  priority: 0,
  start_at: '',
  end_at: '',
};

const BannerSettings = () => {
  const { t } = useTranslation();
  const { data: banners, isLoading } = useAllBanners();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const schema = useState(() => createSchema(t))[0];
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleOpenCreate = () => {
    setEditingBanner(null);
    form.reset(defaultValues);
    setDialogOpen(true);
  };

  const handleOpenEdit = (banner: Banner) => {
    setEditingBanner(banner);
    form.reset({
      title: banner.title,
      message: banner.message,
      severity: banner.severity,
      audience: banner.audience,
      enabled: banner.enabled,
      dismissible: banner.dismissible,
      cta_label: banner.cta_label ?? '',
      cta_url: banner.cta_url ?? '',
      priority: banner.priority,
      start_at: banner.start_at ? banner.start_at.slice(0, 16) : '',
      end_at: banner.end_at ? banner.end_at.slice(0, 16) : '',
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload: CreateBannerInput = {
      ...data,
      cta_label: data.cta_label || undefined,
      cta_url: data.cta_url || undefined,
      start_at: data.start_at || undefined,
      end_at: data.end_at || undefined,
    };

    const mutation = editingBanner
      ? updateBanner
      : createBanner;

    const promise = editingBanner
      ? mutation.mutateAsync({ id: editingBanner.id, data: payload })
      : mutation.mutateAsync(payload);

    promise
      .then(() => {
        toast.success(editingBanner ? t('common.updated') : t('common.created'));
        setDialogOpen(false);
        form.reset(defaultValues);
        setEditingBanner(null);
      })
      .catch(() => {
        toast.error(t('common.error'));
      });
  };

  const handleDelete = (id: string) => {
    deleteBanner.mutateAsync(id).then(() => {
      toast.success(t('common.deleted'));
    }).catch(() => {
      toast.error(t('common.error'));
    });
  };

  const handleToggle = (banner: Banner) => {
    updateBanner.mutateAsync({
      id: banner.id,
      data: { enabled: !banner.enabled },
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
            <Megaphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('settings.banners.title', 'Banners')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('settings.banners.description', 'Temporary in-app messages for your organization')}
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('common.add', 'Add')}
        </Button>
      </div>

      {!banners || banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border rounded-lg border-dashed">
          <Megaphone className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('settings.banners.empty', 'No banners yet. Create one to notify your team.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <Card key={banner.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {banner.title}
                      </h3>
                      <Badge className={cn('text-[10px]', severityColors[banner.severity])}>
                        {banner.severity}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {banner.audience}
                      </Badge>
                      {!banner.enabled && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t('common.disabled', 'Disabled')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {banner.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>Priority: {banner.priority}</span>
                      <span>Starts: {formatDate(banner.start_at)}</span>
                      {banner.end_at && <span>Ends: {formatDate(banner.end_at)}</span>}
                      <span>{banner.impressions} views</span>
                      <span>{banner.dismissals} dismissed</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggle(banner)}
                      title={banner.enabled ? t('common.disable') : t('common.enable')}
                    >
                      {banner.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(banner)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(banner.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? t('common.edit') : t('common.add')}{' '}
              {t('settings.banners.title', 'Banner')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.banners.title', 'Title')}</Label>
              <Input {...form.register('title')} placeholder="Maintenance scheduled" />
              {form.formState.errors.title && (
                <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('settings.banners.message', 'Message')}</Label>
              <textarea
                {...form.register('message')}
                className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="We'll be performing maintenance on Saturday from 2am to 4am."
              />
              {form.formState.errors.message && (
                <p className="text-xs text-red-500">{form.formState.errors.message.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={form.watch('severity')} onValueChange={(v) => form.setValue('severity', v as BannerSeverity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={form.watch('audience')} onValueChange={(v) => form.setValue('audience', v as BannerAudience)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="admins">Admins</SelectItem>
                    <SelectItem value="managers">Managers</SelectItem>
                    <SelectItem value="growers">Growers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority (0-100)</Label>
              <Input type="number" min={0} max={100} {...form.register('priority', { valueAsNumber: true })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start at</Label>
                <Input type="datetime-local" {...form.register('start_at')} />
              </div>
              <div className="space-y-2">
                <Label>End at</Label>
                <Input type="datetime-local" {...form.register('end_at')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTA Label</Label>
                <Input {...form.register('cta_label')} placeholder="Learn more" />
              </div>
              <div className="space-y-2">
                <Label>CTA URL</Label>
                <Input {...form.register('cta_url')} placeholder="https://..." />
                {form.formState.errors.cta_url && (
                  <p className="text-xs text-red-500">{form.formState.errors.cta_url.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.watch('enabled')} onCheckedChange={(v) => form.setValue('enabled', v)} />
                <Label>{t('common.enabled', 'Enabled')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.watch('dismissible')} onCheckedChange={(v) => form.setValue('dismissible', v)} />
                <Label>{t('settings.banners.dismissible', 'Dismissible')}</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createBanner.isPending || updateBanner.isPending}>
                {createBanner.isPending || updateBanner.isPending
                  ? t('common.saving', 'Saving...')
                  : editingBanner ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BannerSettings;
