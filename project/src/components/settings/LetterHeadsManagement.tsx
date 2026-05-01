import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Star, StarOff, Copy, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { FilterBar } from '@/components/ui/data-table';
import {
  useLetterHeads,
  useCreateLetterHead,
  useUpdateLetterHead,
  useDeleteLetterHead,
  useSetDefaultLetterHead,
  useDuplicateLetterHead,
  type LetterHead,
} from '@/hooks/useLetterHeads';

const createSchema = (tr: (key: string, fallback: string) => string) =>
  z.object({
    name: z.string().min(1, tr('validation.required', 'Required')),
    content: z.string().optional().default(''),
    footer_content: z.string().optional().default(''),
    company_name: z.string().optional().default(''),
    company_info: z.string().optional().default(''),
    logo_url: z.string().optional().default(''),
    logo_position: z.string().optional().default('left'),
    custom_text: z.string().optional().default(''),
    font_family: z.string().optional().default('Helvetica'),
    font_size: z.coerce.number().min(6).max(36).optional().default(10),
    text_color: z.string().optional().default('#333333'),
    accent_color: z.string().optional().default('#1a5d1a'),
    background_color: z.string().optional().default(''),
    is_default: z.boolean().optional().default(false),
    is_active: z.boolean().optional().default(true),
    disable_default: z.boolean().optional().default(false),
  });

type FormData = z.infer<ReturnType<typeof createSchema>>;

export default function LetterHeadsManagement() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<LetterHead | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: letterHeads, isLoading } = useLetterHeads();
  const createMutation = useCreateLetterHead();
  const updateMutation = useUpdateLetterHead();
  const deleteMutation = useDeleteLetterHead();
  const setDefaultMutation = useSetDefaultLetterHead();
  const duplicateMutation = useDuplicateLetterHead();

  const schema = useMemo(
    () => createSchema((k, f) => t(k, { defaultValue: f })),
    [t],
  );
  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '',
      content: '',
      footer_content: '',
      company_name: '',
      company_info: '',
      logo_url: '',
      logo_position: 'left',
      custom_text: '',
      font_family: 'Helvetica',
      font_size: 10,
      text_color: '#333333',
      accent_color: '#1a5d1a',
      background_color: '',
      is_default: false,
      is_active: true,
      disable_default: false,
    },
  });

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return letterHeads;
    const q = searchTerm.toLowerCase();
    return letterHeads?.filter((lh) => lh.name.toLowerCase().includes(q)) ?? [];
  }, [letterHeads, searchTerm]);

  const openCreate = () => {
    setEditingId(null);
    form.reset({
      name: '',
      content: '',
      footer_content: '',
      company_name: '',
      company_info: '',
      logo_url: '',
      logo_position: 'left',
      custom_text: '',
      font_family: 'Helvetica',
      font_size: 10,
      text_color: '#333333',
      accent_color: '#1a5d1a',
      background_color: '',
      is_default: false,
      is_active: true,
      disable_default: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (lh: LetterHead) => {
    setEditingId(lh.id);
    form.reset({
      name: lh.name,
      content: lh.content ?? '',
      footer_content: lh.footer_content ?? '',
      company_name: lh.company_name ?? '',
      company_info: lh.company_info ?? '',
      logo_url: lh.logo_url ?? '',
      logo_position: lh.logo_position ?? 'left',
      custom_text: lh.custom_text ?? '',
      font_family: lh.font_family ?? 'Helvetica',
      font_size: lh.font_size ?? 10,
      text_color: lh.text_color ?? '#333333',
      accent_color: lh.accent_color ?? '#1a5d1a',
      background_color: lh.background_color ?? '',
      is_default: lh.is_default,
      is_active: lh.is_active,
      disable_default: lh.disable_default,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, updates: data },
        {
          onSuccess: () => {
            setDialogOpen(false);
            toast.success(t('letterHeads.updated', 'Letter head updated'));
          },
          onError: () =>
            toast.error(t('letterHeads.updateError', 'Failed to update letter head')),
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setDialogOpen(false);
          toast.success(t('letterHeads.created', 'Letter head created'));
        },
        onError: () =>
          toast.error(t('letterHeads.createError', 'Failed to create letter head')),
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeletingId(null);
        toast.success(t('letterHeads.deleted', 'Letter head deleted'));
      },
      onError: () =>
        toast.error(t('letterHeads.deleteError', 'Failed to delete letter head')),
    });
  };

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id, {
      onSuccess: () =>
        toast.success(t('letterHeads.setDefault', 'Default letter head set')),
      onError: () =>
        toast.error(t('letterHeads.setDefaultError', 'Failed to set default')),
    });
  };

  const handleDuplicate = (lh: LetterHead) => {
    duplicateMutation.mutate(
      { id: lh.id, newName: `${lh.name} (Copy)` },
      {
        onSuccess: () =>
          toast.success(t('letterHeads.duplicated', 'Letter head duplicated')),
        onError: () =>
          toast.error(t('letterHeads.duplicateError', 'Failed to duplicate')),
      },
    );
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={t('letterHeads.search', 'Search letter heads...')}
        />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('letterHeads.create', 'New Letter Head')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredItems && filteredItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((lh) => (
            <Card key={lh.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{lh.name}</CardTitle>
                    {lh.is_default && (
                      <Badge
                        variant="default"
                        className="bg-amber-500 hover:bg-amber-600"
                      >
                        <Star className="mr-1 h-3 w-3" />
                        {t('common.default', 'Default')}
                      </Badge>
                    )}
                    {!lh.is_active && (
                      <Badge
                        variant="secondary"
                        className="text-muted-foreground"
                      >
                        {t('common.inactive', 'Inactive')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSetDefault(lh.id)}
                      title={
                        lh.is_default
                          ? t('letterHeads.unsetDefault', 'Unset default')
                          : t('letterHeads.setDefault', 'Set as default')
                      }
                    >
                      {lh.is_default ? (
                        <StarOff className="h-4 w-4" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPreviewItem(lh);
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(lh)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicate(lh)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletingId(lh.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground space-y-1">
                  {lh.company_name && (
                    <p className="font-medium">{lh.company_name}</p>
                  )}
                  {lh.company_info && (
                    <p className="text-xs whitespace-pre-line line-clamp-2">
                      {lh.company_info}
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    {lh.logo_url && (
                      <span className="text-xs">
                        {t('letterHeads.hasLogo', 'Has logo')}
                      </span>
                    )}
                    {lh.content && (
                      <span className="text-xs">
                        {t('letterHeads.hasHeader', 'Custom header')}
                      </span>
                    )}
                    {lh.footer_content && (
                      <span className="text-xs">
                        {t('letterHeads.hasFooter', 'Custom footer')}
                      </span>
                    )}
                    {lh.accent_color && (
                      <span className="flex items-center gap-1 text-xs">
                        <span
                          className="inline-block w-3 h-3 rounded-sm border"
                          style={{ backgroundColor: lh.accent_color }}
                        />
                        {lh.accent_color}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? t('letterHeads.noResults', 'No letter heads match your search')
              : t('letterHeads.empty', 'No letter heads yet')}
          </p>
          {!searchTerm && (
            <Button variant="outline" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('letterHeads.createFirst', 'Create your first letter head')}
            </Button>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t('letterHeads.editTitle', 'Edit Letter Head')
                : t('letterHeads.createTitle', 'New Letter Head')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lh-name">
                  {t('letterHeads.name', 'Name')} *
                </Label>
                <Input
                  id="lh-name"
                  {...form.register('name')}
                  placeholder={t(
                    'letterHeads.namePlaceholder',
                    'e.g. Company Letter Head',
                  )}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lh-company-name">
                  {t('letterHeads.companyName', 'Company Name')}
                </Label>
                <Input
                  id="lh-company-name"
                  {...form.register('company_name')}
                  placeholder={t(
                    'letterHeads.companyNamePlaceholder',
                    'AgroGina SARL',
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lh-company-info">
                  {t('letterHeads.companyInfo', 'Company Info')}
                </Label>
                <Textarea
                  id="lh-company-info"
                  {...form.register('company_info')}
                  rows={3}
                  placeholder={t(
                    'letterHeads.companyInfoPlaceholder',
                    'Address, phone, email, ICE...',
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lh-content">
                  {t('letterHeads.headerContent', 'Header Content')}
                </Label>
                <Textarea
                  id="lh-content"
                  {...form.register('content')}
                  rows={4}
                  placeholder={t(
                    'letterHeads.headerContentPlaceholder',
                    'HTML or text for the header area',
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lh-footer">
                  {t('letterHeads.footerContent', 'Footer Content')}
                </Label>
                <Textarea
                  id="lh-footer"
                  {...form.register('footer_content')}
                  rows={3}
                  placeholder={t(
                    'letterHeads.footerContentPlaceholder',
                    'HTML or text for the footer area',
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lh-logo-url">
                    {t('letterHeads.logoUrl', 'Logo URL')}
                  </Label>
                  <Input
                    id="lh-logo-url"
                    {...form.register('logo_url')}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lh-logo-position">
                    {t('letterHeads.logoPosition', 'Logo Position')}
                  </Label>
                  <select
                    id="lh-logo-position"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...form.register('logo_position')}
                  >
                    <option value="left">
                      {t('letterHeads.positionLeft', 'Left')}
                    </option>
                    <option value="center">
                      {t('letterHeads.positionCenter', 'Center')}
                    </option>
                    <option value="right">
                      {t('letterHeads.positionRight', 'Right')}
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lh-custom-text">
                  {t('letterHeads.customText', 'Custom Text')}
                </Label>
                <Textarea
                  id="lh-custom-text"
                  {...form.register('custom_text')}
                  rows={2}
                  placeholder={t(
                    'letterHeads.customTextPlaceholder',
                    'Additional custom text...',
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lh-font-family">
                    {t('letterHeads.fontFamily', 'Font Family')}
                  </Label>
                  <Input
                    id="lh-font-family"
                    {...form.register('font_family')}
                    placeholder="Helvetica"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lh-font-size">
                    {t('letterHeads.fontSize', 'Font Size')}
                  </Label>
                  <Input
                    id="lh-font-size"
                    type="number"
                    min={6}
                    max={36}
                    {...form.register('font_size')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lh-text-color">
                    {t('letterHeads.textColor', 'Text Color')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-9 rounded border cursor-pointer"
                      {...form.register('text_color')}
                    />
                    <Input
                      id="lh-text-color"
                      className="flex-1"
                      {...form.register('text_color')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lh-accent-color">
                    {t('letterHeads.accentColor', 'Accent Color')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-9 rounded border cursor-pointer"
                      {...form.register('accent_color')}
                    />
                    <Input
                      id="lh-accent-color"
                      className="flex-1"
                      {...form.register('accent_color')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lh-bg-color">
                    {t('letterHeads.bgColor', 'Background')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-9 rounded border cursor-pointer"
                      {...form.register('background_color')}
                    />
                    <Input
                      id="lh-bg-color"
                      className="flex-1"
                      {...form.register('background_color')}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4 mt-2">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="lh-is-default"
                      checked={form.watch('is_default')}
                      onCheckedChange={(v) => form.setValue('is_default', v)}
                    />
                    <Label htmlFor="lh-is-default" className="text-sm">
                      {t('letterHeads.isDefault', 'Default')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="lh-is-active"
                      checked={form.watch('is_active')}
                      onCheckedChange={(v) => form.setValue('is_active', v)}
                    />
                    <Label htmlFor="lh-is-active" className="text-sm">
                      {t('letterHeads.isActive', 'Active')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="lh-disable-default"
                      checked={form.watch('disable_default')}
                      onCheckedChange={(v) =>
                        form.setValue('disable_default', v)
                      }
                    />
                    <Label htmlFor="lh-disable-default" className="text-sm">
                      {t(
                        'letterHeads.disableDefaultHeader',
                        'Disable default header',
                      )}
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t('common.saving', 'Saving...')
                  : editingId
                    ? t('common.save', 'Save')
                    : t('common.create', 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewItem?.name}</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-2">
                  {t('letterHeads.headerPreview', 'Header Preview')}
                </div>
                <div className="min-h-[60px] flex items-start gap-3">
                  {previewItem.logo_url && (
                    <img
                      src={previewItem.logo_url}
                      alt="Logo"
                      className="h-12 w-auto object-contain"
                    />
                  )}
                  <div
                    style={{
                      fontFamily: previewItem.font_family ?? 'Helvetica',
                    }}
                  >
                    {previewItem.company_name && (
                      <p
                        className="font-bold text-sm"
                        style={{
                          color: previewItem.accent_color ?? '#1a5d1a',
                        }}
                      >
                        {previewItem.company_name}
                      </p>
                    )}
                    {previewItem.company_info && (
                      <p
                        className="text-xs whitespace-pre-line mt-1"
                        style={{
                          color: previewItem.text_color ?? '#333333',
                        }}
                      >
                        {previewItem.company_info}
                      </p>
                    )}
                    {previewItem.custom_text && (
                      <p
                        className="text-xs mt-1 italic"
                        style={{
                          color: previewItem.text_color ?? '#333333',
                        }}
                      >
                        {previewItem.custom_text}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {previewItem.content && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-2">
                    {t(
                      'letterHeads.customHeaderContent',
                      'Custom Header Content',
                    )}
                  </div>
                  <div
                    className="text-sm"
                    style={{
                      fontFamily: previewItem.font_family ?? 'Helvetica',
                      color: previewItem.text_color ?? '#333333',
                    }}
                  >
                    {previewItem.content}
                  </div>
                </div>
              )}

              {previewItem.footer_content && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-2">
                    {t('letterHeads.footerPreview', 'Footer Preview')}
                  </div>
                  <div
                    className="text-sm"
                    style={{
                      fontFamily: previewItem.font_family ?? 'Helvetica',
                      color: previewItem.text_color ?? '#333333',
                    }}
                  >
                    {previewItem.footer_content}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{t('letterHeads.logoPosition', 'Logo position')}:</span>
                  <Badge variant="outline">
                    {previewItem.logo_position ?? 'left'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>{t('letterHeads.fontSize', 'Font size')}:</span>
                  <Badge variant="outline">
                    {previewItem.font_size ?? 10}pt
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>{t('letterHeads.isDefault', 'Default')}:</span>
                  <Badge variant={previewItem.is_default ? 'default' : 'outline'}>
                    {previewItem.is_default
                      ? t('common.yes', 'Yes')
                      : t('common.no', 'No')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>{t('letterHeads.isActive', 'Active')}:</span>
                  <Badge variant={previewItem.is_active ? 'default' : 'outline'}>
                    {previewItem.is_active
                      ? t('common.yes', 'Yes')
                      : t('common.no', 'No')}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('letterHeads.deleteConfirm', 'Delete Letter Head')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'letterHeads.deleteConfirmDesc',
                'This action cannot be undone. This will permanently delete the letter head.',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
