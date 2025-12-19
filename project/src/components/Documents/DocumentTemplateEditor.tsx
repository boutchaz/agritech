import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useDocumentTemplate,
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
  type DocumentType,
} from '@/hooks/useDocumentTemplates';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Loader2, FileText, ImageIcon, Ruler, Palette, Table, Type, Droplets, Settings2 } from 'lucide-react';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  document_type: z.enum(['invoice', 'quote', 'sales_order', 'purchase_order', 'report', 'general']),
  is_default: z.boolean(),

  // Header
  header_enabled: z.boolean(),
  header_height: z.number().min(0).max(200),
  header_logo_url: z.string().optional(),
  header_logo_position: z.enum(['left', 'center', 'right']),
  header_logo_width: z.number().min(0).max(200),
  header_logo_height: z.number().min(0).max(200),
  header_company_name: z.boolean(),
  header_company_info: z.boolean(),
  header_custom_text: z.string().optional(),
  header_background_color: z.string(),
  header_text_color: z.string(),
  header_border_bottom: z.boolean(),
  header_border_color: z.string(),

  // Footer
  footer_enabled: z.boolean(),
  footer_height: z.number().min(0).max(200),
  footer_text: z.string(),
  footer_position: z.enum(['left', 'center', 'right']),
  footer_include_company_info: z.boolean(),
  footer_custom_text: z.string().optional(),
  footer_background_color: z.string(),
  footer_text_color: z.string(),
  footer_border_top: z.boolean(),
  footer_border_color: z.string(),
  footer_font_size: z.number().min(6).max(24),

  // Page margins
  page_margin_top: z.number().min(0).max(100),
  page_margin_bottom: z.number().min(0).max(100),
  page_margin_left: z.number().min(0).max(100),
  page_margin_right: z.number().min(0).max(100),

  // Document styling
  accent_color: z.string(),
  secondary_color: z.string(),

  // Typography
  font_family: z.string(),
  title_font_size: z.number().min(8).max(48),
  heading_font_size: z.number().min(8).max(36),
  body_font_size: z.number().min(6).max(24),

  // Table styling
  table_header_bg_color: z.string(),
  table_header_text_color: z.string(),
  table_row_alt_color: z.string(),
  table_border_color: z.string(),

  // Content display options
  show_tax_id: z.boolean(),
  show_terms: z.boolean(),
  show_notes: z.boolean(),
  show_payment_info: z.boolean(),
  show_bank_details: z.boolean(),
  show_qr_code: z.boolean(),

  // Custom sections
  terms_content: z.string().optional(),
  payment_terms_content: z.string().optional(),
  bank_details_content: z.string().optional(),

  // Watermark
  watermark_enabled: z.boolean(),
  watermark_text: z.string().optional(),
  watermark_opacity: z.number().min(0).max(1),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface DocumentTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string | null;
  documentType: DocumentType;
}

const fontFamilies = [
  { value: 'Helvetica', label: 'Helvetica (Default)' },
  { value: 'Times-Roman', label: 'Times New Roman' },
  { value: 'Courier', label: 'Courier' },
];

const ColorPicker = ({ label, value, onChange, id }: { label: string; value: string; onChange: (value: string) => void; id: string }) => (
  <div>
    <Label htmlFor={id}>{label}</Label>
    <div className="flex gap-2 mt-1">
      <Input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-14 h-10 p-1 cursor-pointer"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="flex-1"
      />
    </div>
  </div>
);

export function DocumentTemplateEditor({
  isOpen,
  onClose,
  templateId,
  documentType,
}: DocumentTemplateEditorProps) {
  const { t } = useTranslation();
  const { data: template, isLoading: loadingTemplate } = useDocumentTemplate(templateId);
  const createTemplate = useCreateDocumentTemplate();
  const updateTemplate = useUpdateDocumentTemplate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      document_type: documentType,
      is_default: false,

      // Header defaults
      header_enabled: true,
      header_height: 80,
      header_logo_position: 'left',
      header_logo_width: 50,
      header_logo_height: 30,
      header_company_name: true,
      header_company_info: true,
      header_background_color: '#ffffff',
      header_text_color: '#000000',
      header_border_bottom: true,
      header_border_color: '#e5e7eb',

      // Footer defaults
      footer_enabled: true,
      footer_height: 60,
      footer_text: 'Thank you for your business! | Page {page} of {totalPages}',
      footer_position: 'center',
      footer_include_company_info: true,
      footer_background_color: '#f9fafb',
      footer_text_color: '#6b7280',
      footer_border_top: true,
      footer_border_color: '#e5e7eb',
      footer_font_size: 9,

      // Page margins
      page_margin_top: 20,
      page_margin_bottom: 20,
      page_margin_left: 15,
      page_margin_right: 15,

      // Document styling
      accent_color: '#10B981',
      secondary_color: '#6B7280',

      // Typography
      font_family: 'Helvetica',
      title_font_size: 24,
      heading_font_size: 14,
      body_font_size: 10,

      // Table styling
      table_header_bg_color: '#10B981',
      table_header_text_color: '#ffffff',
      table_row_alt_color: '#f9fafb',
      table_border_color: '#e5e7eb',

      // Content display
      show_tax_id: true,
      show_terms: true,
      show_notes: true,
      show_payment_info: true,
      show_bank_details: false,
      show_qr_code: false,

      // Custom sections
      terms_content: '',
      payment_terms_content: '',
      bank_details_content: '',

      // Watermark
      watermark_enabled: false,
      watermark_text: '',
      watermark_opacity: 0.1,
    },
  });

  const headerEnabled = watch('header_enabled');
  const footerEnabled = watch('footer_enabled');
  const watermarkEnabled = watch('watermark_enabled');

  // Load template data when editing
  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        description: template.description || '',
        document_type: template.document_type as DocumentType,
        is_default: template.is_default,
        header_enabled: template.header_enabled ?? true,
        header_height: Number(template.header_height) || 80,
        header_logo_url: template.header_logo_url || '',
        header_logo_position: (template.header_logo_position as 'left' | 'center' | 'right') || 'left',
        header_logo_width: Number(template.header_logo_width) || 50,
        header_logo_height: Number(template.header_logo_height) || 30,
        header_company_name: template.header_company_name ?? true,
        header_company_info: template.header_company_info ?? true,
        header_custom_text: template.header_custom_text || '',
        header_background_color: template.header_background_color || '#ffffff',
        header_text_color: template.header_text_color || '#000000',
        header_border_bottom: template.header_border_bottom ?? true,
        header_border_color: template.header_border_color || '#e5e7eb',
        footer_enabled: template.footer_enabled ?? true,
        footer_height: Number(template.footer_height) || 60,
        footer_text: template.footer_text || 'Thank you for your business!',
        footer_position: (template.footer_position as 'left' | 'center' | 'right') || 'center',
        footer_include_company_info: template.footer_include_company_info ?? true,
        footer_custom_text: template.footer_custom_text || '',
        footer_background_color: template.footer_background_color || '#f9fafb',
        footer_text_color: template.footer_text_color || '#6b7280',
        footer_border_top: template.footer_border_top ?? true,
        footer_border_color: template.footer_border_color || '#e5e7eb',
        footer_font_size: Number(template.footer_font_size) || 9,
        page_margin_top: Number(template.page_margin_top) || 20,
        page_margin_bottom: Number(template.page_margin_bottom) || 20,
        page_margin_left: Number(template.page_margin_left) || 15,
        page_margin_right: Number(template.page_margin_right) || 15,
        accent_color: template.accent_color || '#10B981',
        secondary_color: template.secondary_color || '#6B7280',
        font_family: template.font_family || 'Helvetica',
        title_font_size: Number(template.title_font_size) || 24,
        heading_font_size: Number(template.heading_font_size) || 14,
        body_font_size: Number(template.body_font_size) || 10,
        table_header_bg_color: template.table_header_bg_color || '#10B981',
        table_header_text_color: template.table_header_text_color || '#ffffff',
        table_row_alt_color: template.table_row_alt_color || '#f9fafb',
        table_border_color: template.table_border_color || '#e5e7eb',
        show_tax_id: template.show_tax_id ?? true,
        show_terms: template.show_terms ?? true,
        show_notes: template.show_notes ?? true,
        show_payment_info: template.show_payment_info ?? true,
        show_bank_details: template.show_bank_details ?? false,
        show_qr_code: template.show_qr_code ?? false,
        terms_content: template.terms_content || '',
        payment_terms_content: template.payment_terms_content || '',
        bank_details_content: template.bank_details_content || '',
        watermark_enabled: template.watermark_enabled ?? false,
        watermark_text: template.watermark_text || '',
        watermark_opacity: Number(template.watermark_opacity) || 0.1,
      });
    }
  }, [template, reset]);

  const onSubmit = async (data: TemplateFormData) => {
    try {
      if (templateId) {
        await updateTemplate.mutateAsync({
          id: templateId,
          updates: data,
        });
        toast.success(t('documents.editor.updateSuccess', 'Template updated successfully'));
      } else {
        await createTemplate.mutateAsync(data);
        toast.success(t('documents.editor.createSuccess', 'Template created successfully'));
      }
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(t('documents.editor.saveFailed', 'Failed to save template'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            {templateId ? t('documents.editor.editTitle', 'Edit Template') : t('documents.editor.createTitle', 'Create Template')}
          </DialogTitle>
          <DialogDescription>
            {t('documents.editor.description', 'Customize the appearance and content of your documents')}
          </DialogDescription>
        </DialogHeader>

        {loadingTemplate ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <ScrollArea className="h-[calc(95vh-180px)] px-6">
              <div className="space-y-6 pb-6">
                {/* Basic Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    {t('documents.editor.basicSettings', 'Basic Settings')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">{t('documents.editor.templateName', 'Template Name')} *</Label>
                      <Input id="name" {...register('name')} />
                      {errors.name && (
                        <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                      <Switch
                        id="is_default"
                        checked={watch('is_default')}
                        onCheckedChange={(checked) => setValue('is_default', checked)}
                      />
                      <Label htmlFor="is_default">{t('documents.editor.setDefault', 'Set as default template')}</Label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">{t('documents.editor.description_label', 'Description')}</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      rows={2}
                      placeholder={t('documents.editor.descriptionPlaceholder', 'Optional description for this template')}
                    />
                  </div>
                </div>

                <Separator />

                {/* Tabs for different settings */}
                <Tabs defaultValue="colors" className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="colors" className="text-xs sm:text-sm">
                      <Palette className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t('documents.editor.tabs.colors', 'Colors')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="header" className="text-xs sm:text-sm">
                      <ImageIcon className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t('documents.editor.tabs.header', 'Header')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="footer" className="text-xs sm:text-sm">
                      <FileText className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t('documents.editor.tabs.footer', 'Footer')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="typography" className="text-xs sm:text-sm">
                      <Type className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t('documents.editor.tabs.typography', 'Typography')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="table" className="text-xs sm:text-sm">
                      <Table className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t('documents.editor.tabs.table', 'Table')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="content" className="text-xs sm:text-sm">
                      <Ruler className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t('documents.editor.tabs.content', 'Content')}</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Colors & Branding Tab */}
                  <TabsContent value="colors" className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ColorPicker
                        id="accent_color"
                        label={t('documents.editor.accentColor', 'Accent Color (Primary)')}
                        value={watch('accent_color')}
                        onChange={(value) => setValue('accent_color', value)}
                      />
                      <ColorPicker
                        id="secondary_color"
                        label={t('documents.editor.secondaryColor', 'Secondary Color')}
                        value={watch('secondary_color')}
                        onChange={(value) => setValue('secondary_color', value)}
                      />
                    </div>

                    <Separator />

                    {/* Page Margins */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        {t('documents.editor.pageMargins', 'Page Margins (mm)')}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="page_margin_top">{t('documents.editor.marginTop', 'Top')}</Label>
                          <Input
                            id="page_margin_top"
                            type="number"
                            step="1"
                            {...register('page_margin_top', { valueAsNumber: true })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="page_margin_bottom">{t('documents.editor.marginBottom', 'Bottom')}</Label>
                          <Input
                            id="page_margin_bottom"
                            type="number"
                            step="1"
                            {...register('page_margin_bottom', { valueAsNumber: true })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="page_margin_left">{t('documents.editor.marginLeft', 'Left')}</Label>
                          <Input
                            id="page_margin_left"
                            type="number"
                            step="1"
                            {...register('page_margin_left', { valueAsNumber: true })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="page_margin_right">{t('documents.editor.marginRight', 'Right')}</Label>
                          <Input
                            id="page_margin_right"
                            type="number"
                            step="1"
                            {...register('page_margin_right', { valueAsNumber: true })}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Watermark */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Droplets className="h-4 w-4" />
                        {t('documents.editor.watermark', 'Watermark')}
                      </h4>
                      <div className="flex items-center space-x-2 mb-4">
                        <Switch
                          id="watermark_enabled"
                          checked={watch('watermark_enabled')}
                          onCheckedChange={(checked) => setValue('watermark_enabled', checked)}
                        />
                        <Label htmlFor="watermark_enabled">{t('documents.editor.enableWatermark', 'Enable Watermark')}</Label>
                      </div>
                      {watermarkEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="watermark_text">{t('documents.editor.watermarkText', 'Watermark Text')}</Label>
                            <Input
                              id="watermark_text"
                              {...register('watermark_text')}
                              placeholder="DRAFT, CONFIDENTIAL, etc."
                            />
                          </div>
                          <div>
                            <Label htmlFor="watermark_opacity">{t('documents.editor.watermarkOpacity', 'Opacity')} ({(watch('watermark_opacity') * 100).toFixed(0)}%)</Label>
                            <Input
                              id="watermark_opacity"
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              {...register('watermark_opacity', { valueAsNumber: true })}
                              className="mt-2"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Header Tab */}
                  <TabsContent value="header" className="space-y-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="header_enabled"
                        checked={watch('header_enabled')}
                        onCheckedChange={(checked) => setValue('header_enabled', checked)}
                      />
                      <Label htmlFor="header_enabled">{t('documents.editor.enableHeader', 'Enable Header')}</Label>
                    </div>

                    {headerEnabled && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="header_height">{t('documents.editor.headerHeight', 'Header Height (mm)')}</Label>
                            <Input
                              id="header_height"
                              type="number"
                              step="1"
                              {...register('header_height', { valueAsNumber: true })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="header_logo_position">{t('documents.editor.logoPosition', 'Logo Position')}</Label>
                            <select
                              id="header_logo_position"
                              {...register('header_logo_position')}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                            >
                              <option value="left">{t('documents.editor.position.left', 'Left')}</option>
                              <option value="center">{t('documents.editor.position.center', 'Center')}</option>
                              <option value="right">{t('documents.editor.position.right', 'Right')}</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="header_logo_url">{t('documents.editor.logoUrl', 'Logo URL')}</Label>
                          <Input id="header_logo_url" {...register('header_logo_url')} placeholder="https://..." />
                          <p className="text-xs text-gray-500 mt-1">{t('documents.editor.logoUrlHint', 'Enter a URL to your company logo')}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="header_logo_width">{t('documents.editor.logoWidth', 'Logo Width (mm)')}</Label>
                            <Input
                              id="header_logo_width"
                              type="number"
                              step="1"
                              {...register('header_logo_width', { valueAsNumber: true })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="header_logo_height">{t('documents.editor.logoHeight', 'Logo Height (mm)')}</Label>
                            <Input
                              id="header_logo_height"
                              type="number"
                              step="1"
                              {...register('header_logo_height', { valueAsNumber: true })}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="header_company_name"
                              checked={watch('header_company_name')}
                              onCheckedChange={(checked) => setValue('header_company_name', checked)}
                            />
                            <Label htmlFor="header_company_name">{t('documents.editor.showCompanyName', 'Show Company Name')}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="header_company_info"
                              checked={watch('header_company_info')}
                              onCheckedChange={(checked) => setValue('header_company_info', checked)}
                            />
                            <Label htmlFor="header_company_info">{t('documents.editor.showCompanyInfo', 'Show Company Info')}</Label>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="header_custom_text">{t('documents.editor.customHeaderText', 'Custom Header Text')}</Label>
                          <Textarea
                            id="header_custom_text"
                            {...register('header_custom_text')}
                            rows={2}
                            placeholder={t('documents.editor.customHeaderTextPlaceholder', 'Add custom text to appear in the header')}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorPicker
                            id="header_background_color"
                            label={t('documents.editor.backgroundColor', 'Background Color')}
                            value={watch('header_background_color')}
                            onChange={(value) => setValue('header_background_color', value)}
                          />
                          <ColorPicker
                            id="header_text_color"
                            label={t('documents.editor.textColor', 'Text Color')}
                            value={watch('header_text_color')}
                            onChange={(value) => setValue('header_text_color', value)}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="header_border_bottom"
                              checked={watch('header_border_bottom')}
                              onCheckedChange={(checked) => setValue('header_border_bottom', checked)}
                            />
                            <Label htmlFor="header_border_bottom">{t('documents.editor.bottomBorder', 'Bottom Border')}</Label>
                          </div>
                          {watch('header_border_bottom') && (
                            <div className="flex gap-2 items-center">
                              <Label>{t('documents.editor.borderColor', 'Border Color')}:</Label>
                              <Input
                                type="color"
                                value={watch('header_border_color')}
                                onChange={(e) => setValue('header_border_color', e.target.value)}
                                className="w-14 h-10 p-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Footer Tab */}
                  <TabsContent value="footer" className="space-y-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="footer_enabled"
                        checked={watch('footer_enabled')}
                        onCheckedChange={(checked) => setValue('footer_enabled', checked)}
                      />
                      <Label htmlFor="footer_enabled">{t('documents.editor.enableFooter', 'Enable Footer')}</Label>
                    </div>

                    {footerEnabled && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="footer_height">{t('documents.editor.footerHeight', 'Footer Height (mm)')}</Label>
                            <Input
                              id="footer_height"
                              type="number"
                              step="1"
                              {...register('footer_height', { valueAsNumber: true })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="footer_position">{t('documents.editor.textPosition', 'Text Position')}</Label>
                            <select
                              id="footer_position"
                              {...register('footer_position')}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                            >
                              <option value="left">{t('documents.editor.position.left', 'Left')}</option>
                              <option value="center">{t('documents.editor.position.center', 'Center')}</option>
                              <option value="right">{t('documents.editor.position.right', 'Right')}</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="footer_text">{t('documents.editor.footerText', 'Footer Text')}</Label>
                          <Input
                            id="footer_text"
                            {...register('footer_text')}
                            placeholder="Thank you for your business!"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('documents.editor.footerTextHint', 'Use {page} and {totalPages} for page numbers')}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="footer_include_company_info"
                            checked={watch('footer_include_company_info')}
                            onCheckedChange={(checked) => setValue('footer_include_company_info', checked)}
                          />
                          <Label htmlFor="footer_include_company_info">{t('documents.editor.includeCompanyInfo', 'Include Company Info')}</Label>
                        </div>

                        <div>
                          <Label htmlFor="footer_custom_text">{t('documents.editor.customFooterText', 'Custom Footer Text')}</Label>
                          <Textarea
                            id="footer_custom_text"
                            {...register('footer_custom_text')}
                            rows={2}
                            placeholder={t('documents.editor.customFooterTextPlaceholder', 'Add custom text to appear in the footer')}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorPicker
                            id="footer_background_color"
                            label={t('documents.editor.backgroundColor', 'Background Color')}
                            value={watch('footer_background_color')}
                            onChange={(value) => setValue('footer_background_color', value)}
                          />
                          <ColorPicker
                            id="footer_text_color"
                            label={t('documents.editor.textColor', 'Text Color')}
                            value={watch('footer_text_color')}
                            onChange={(value) => setValue('footer_text_color', value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="footer_font_size">{t('documents.editor.fontSize', 'Font Size (pt)')}</Label>
                            <Input
                              id="footer_font_size"
                              type="number"
                              step="1"
                              {...register('footer_font_size', { valueAsNumber: true })}
                            />
                          </div>
                          <div className="flex items-center space-x-4 pt-6">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="footer_border_top"
                                checked={watch('footer_border_top')}
                                onCheckedChange={(checked) => setValue('footer_border_top', checked)}
                              />
                              <Label htmlFor="footer_border_top">{t('documents.editor.topBorder', 'Top Border')}</Label>
                            </div>
                            {watch('footer_border_top') && (
                              <Input
                                type="color"
                                value={watch('footer_border_color')}
                                onChange={(e) => setValue('footer_border_color', e.target.value)}
                                className="w-14 h-10 p-1"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Typography Tab */}
                  <TabsContent value="typography" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="font_family">{t('documents.editor.fontFamily', 'Font Family')}</Label>
                      <select
                        id="font_family"
                        {...register('font_family')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      >
                        {fontFamilies.map((font) => (
                          <option key={font.value} value={font.value}>{font.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="title_font_size">{t('documents.editor.titleFontSize', 'Title Font Size (pt)')}</Label>
                        <Input
                          id="title_font_size"
                          type="number"
                          step="1"
                          {...register('title_font_size', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="heading_font_size">{t('documents.editor.headingFontSize', 'Heading Font Size (pt)')}</Label>
                        <Input
                          id="heading_font_size"
                          type="number"
                          step="1"
                          {...register('heading_font_size', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="body_font_size">{t('documents.editor.bodyFontSize', 'Body Font Size (pt)')}</Label>
                        <Input
                          id="body_font_size"
                          type="number"
                          step="1"
                          {...register('body_font_size', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Table Tab */}
                  <TabsContent value="table" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ColorPicker
                        id="table_header_bg_color"
                        label={t('documents.editor.tableHeaderBg', 'Table Header Background')}
                        value={watch('table_header_bg_color')}
                        onChange={(value) => setValue('table_header_bg_color', value)}
                      />
                      <ColorPicker
                        id="table_header_text_color"
                        label={t('documents.editor.tableHeaderText', 'Table Header Text')}
                        value={watch('table_header_text_color')}
                        onChange={(value) => setValue('table_header_text_color', value)}
                      />
                      <ColorPicker
                        id="table_row_alt_color"
                        label={t('documents.editor.tableRowAlt', 'Alternating Row Color')}
                        value={watch('table_row_alt_color')}
                        onChange={(value) => setValue('table_row_alt_color', value)}
                      />
                      <ColorPicker
                        id="table_border_color"
                        label={t('documents.editor.tableBorder', 'Table Border Color')}
                        value={watch('table_border_color')}
                        onChange={(value) => setValue('table_border_color', value)}
                      />
                    </div>
                  </TabsContent>

                  {/* Content Tab */}
                  <TabsContent value="content" className="space-y-6 mt-4">
                    {/* Display Options */}
                    <div>
                      <h4 className="font-medium mb-3">{t('documents.editor.displayOptions', 'Display Options')}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show_tax_id"
                            checked={watch('show_tax_id')}
                            onCheckedChange={(checked) => setValue('show_tax_id', checked)}
                          />
                          <Label htmlFor="show_tax_id">{t('documents.editor.showTaxId', 'Show Tax ID')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show_terms"
                            checked={watch('show_terms')}
                            onCheckedChange={(checked) => setValue('show_terms', checked)}
                          />
                          <Label htmlFor="show_terms">{t('documents.editor.showTerms', 'Show Terms')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show_notes"
                            checked={watch('show_notes')}
                            onCheckedChange={(checked) => setValue('show_notes', checked)}
                          />
                          <Label htmlFor="show_notes">{t('documents.editor.showNotes', 'Show Notes')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show_payment_info"
                            checked={watch('show_payment_info')}
                            onCheckedChange={(checked) => setValue('show_payment_info', checked)}
                          />
                          <Label htmlFor="show_payment_info">{t('documents.editor.showPaymentInfo', 'Show Payment Info')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show_bank_details"
                            checked={watch('show_bank_details')}
                            onCheckedChange={(checked) => setValue('show_bank_details', checked)}
                          />
                          <Label htmlFor="show_bank_details">{t('documents.editor.showBankDetails', 'Show Bank Details')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show_qr_code"
                            checked={watch('show_qr_code')}
                            onCheckedChange={(checked) => setValue('show_qr_code', checked)}
                          />
                          <Label htmlFor="show_qr_code">{t('documents.editor.showQrCode', 'Show QR Code')}</Label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Custom Sections */}
                    <div className="space-y-4">
                      <h4 className="font-medium">{t('documents.editor.customSections', 'Custom Sections')}</h4>

                      <div>
                        <Label htmlFor="terms_content">{t('documents.editor.termsContent', 'Terms & Conditions')}</Label>
                        <Textarea
                          id="terms_content"
                          {...register('terms_content')}
                          rows={3}
                          placeholder={t('documents.editor.termsContentPlaceholder', 'Enter your standard terms and conditions...')}
                        />
                      </div>

                      <div>
                        <Label htmlFor="payment_terms_content">{t('documents.editor.paymentTerms', 'Payment Terms')}</Label>
                        <Textarea
                          id="payment_terms_content"
                          {...register('payment_terms_content')}
                          rows={2}
                          placeholder={t('documents.editor.paymentTermsPlaceholder', 'E.g., Net 30, Due upon receipt...')}
                        />
                      </div>

                      <div>
                        <Label htmlFor="bank_details_content">{t('documents.editor.bankDetails', 'Bank Details')}</Label>
                        <Textarea
                          id="bank_details_content"
                          {...register('bank_details_content')}
                          rows={3}
                          placeholder={t('documents.editor.bankDetailsPlaceholder', 'Bank name, account number, IBAN, etc.')}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('documents.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {templateId ? t('documents.update', 'Update Template') : t('documents.create', 'Create Template')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
