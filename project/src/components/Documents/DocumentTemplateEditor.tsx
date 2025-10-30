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
import {
  useDocumentTemplate,
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
  type DocumentType,
} from '@/hooks/useDocumentTemplates';
import { toast } from 'sonner';
import { Loader2, FileText, ImageIcon, Palette, Ruler } from 'lucide-react';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
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
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface DocumentTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string | null;
  documentType: DocumentType;
}

export function DocumentTemplateEditor({
  isOpen,
  onClose,
  templateId,
  documentType,
}: DocumentTemplateEditorProps) {
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
      document_type: documentType,
      is_default: false,
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
      footer_enabled: true,
      footer_height: 60,
      footer_text: 'Page {page} of {totalPages}',
      footer_position: 'center',
      footer_include_company_info: true,
      footer_background_color: '#f9fafb',
      footer_text_color: '#6b7280',
      footer_border_top: true,
      footer_border_color: '#e5e7eb',
      footer_font_size: 9,
      page_margin_top: 20,
      page_margin_bottom: 20,
      page_margin_left: 15,
      page_margin_right: 15,
    },
  });

  const headerEnabled = watch('header_enabled');
  const footerEnabled = watch('footer_enabled');

  // Load template data when editing
  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        document_type: template.document_type as DocumentType,
        is_default: template.is_default,
        header_enabled: template.header_enabled,
        header_height: Number(template.header_height),
        header_logo_url: template.header_logo_url || '',
        header_logo_position: template.header_logo_position as 'left' | 'center' | 'right',
        header_logo_width: Number(template.header_logo_width),
        header_logo_height: Number(template.header_logo_height),
        header_company_name: template.header_company_name,
        header_company_info: template.header_company_info,
        header_custom_text: template.header_custom_text || '',
        header_background_color: template.header_background_color,
        header_text_color: template.header_text_color,
        header_border_bottom: template.header_border_bottom,
        header_border_color: template.header_border_color,
        footer_enabled: template.footer_enabled,
        footer_height: Number(template.footer_height),
        footer_text: template.footer_text,
        footer_position: template.footer_position as 'left' | 'center' | 'right',
        footer_include_company_info: template.footer_include_company_info,
        footer_custom_text: template.footer_custom_text || '',
        footer_background_color: template.footer_background_color,
        footer_text_color: template.footer_text_color,
        footer_border_top: template.footer_border_top,
        footer_border_color: template.footer_border_color,
        footer_font_size: Number(template.footer_font_size),
        page_margin_top: Number(template.page_margin_top),
        page_margin_bottom: Number(template.page_margin_bottom),
        page_margin_left: Number(template.page_margin_left),
        page_margin_right: Number(template.page_margin_right),
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
        toast.success('Template updated successfully');
      } else {
        await createTemplate.mutateAsync(data);
        toast.success('Template created successfully');
      }
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            {templateId ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogDescription>
            Customize the header and footer for your documents
          </DialogDescription>
        </DialogHeader>

        {loadingTemplate ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
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
                  <Label htmlFor="is_default">Set as default template</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tabs for Header, Footer, and Page Settings */}
            <Tabs defaultValue="header" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="header">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Header
                </TabsTrigger>
                <TabsTrigger value="footer">
                  <FileText className="h-4 w-4 mr-2" />
                  Footer
                </TabsTrigger>
                <TabsTrigger value="page">
                  <Ruler className="h-4 w-4 mr-2" />
                  Page Margins
                </TabsTrigger>
              </TabsList>

              {/* Header Tab */}
              <TabsContent value="header" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="header_enabled"
                    checked={watch('header_enabled')}
                    onCheckedChange={(checked) => setValue('header_enabled', checked)}
                  />
                  <Label htmlFor="header_enabled">Enable Header</Label>
                </div>

                {headerEnabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="header_height">Header Height (mm)</Label>
                        <Input
                          id="header_height"
                          type="number"
                          step="0.1"
                          {...register('header_height', { valueAsNumber: true })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="header_logo_position">Logo Position</Label>
                        <select
                          id="header_logo_position"
                          {...register('header_logo_position')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="header_logo_url">Logo URL</Label>
                      <Input id="header_logo_url" {...register('header_logo_url')} />
                      <p className="text-xs text-gray-500 mt-1">Enter a URL to your company logo</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="header_logo_width">Logo Width (mm)</Label>
                        <Input
                          id="header_logo_width"
                          type="number"
                          step="0.1"
                          {...register('header_logo_width', { valueAsNumber: true })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="header_logo_height">Logo Height (mm)</Label>
                        <Input
                          id="header_logo_height"
                          type="number"
                          step="0.1"
                          {...register('header_logo_height', { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="header_company_name"
                          checked={watch('header_company_name')}
                          onCheckedChange={(checked) => setValue('header_company_name', checked)}
                        />
                        <Label htmlFor="header_company_name">Show Company Name</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="header_company_info"
                          checked={watch('header_company_info')}
                          onCheckedChange={(checked) => setValue('header_company_info', checked)}
                        />
                        <Label htmlFor="header_company_info">Show Company Info</Label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="header_custom_text">Custom Header Text</Label>
                      <Textarea
                        id="header_custom_text"
                        {...register('header_custom_text')}
                        rows={2}
                        placeholder="Add custom text to appear in the header"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="header_background_color">Background Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="header_background_color"
                            type="color"
                            {...register('header_background_color')}
                            className="w-16 h-10"
                          />
                          <Input {...register('header_background_color')} placeholder="#ffffff" />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="header_text_color">Text Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="header_text_color"
                            type="color"
                            {...register('header_text_color')}
                            className="w-16 h-10"
                          />
                          <Input {...register('header_text_color')} placeholder="#000000" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="header_border_bottom"
                          checked={watch('header_border_bottom')}
                          onCheckedChange={(checked) => setValue('header_border_bottom', checked)}
                        />
                        <Label htmlFor="header_border_bottom">Bottom Border</Label>
                      </div>

                      {watch('header_border_bottom') && (
                        <div className="flex gap-2 items-center">
                          <Label>Border Color:</Label>
                          <Input
                            type="color"
                            {...register('header_border_color')}
                            className="w-16 h-10"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Footer Tab */}
              <TabsContent value="footer" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="footer_enabled"
                    checked={watch('footer_enabled')}
                    onCheckedChange={(checked) => setValue('footer_enabled', checked)}
                  />
                  <Label htmlFor="footer_enabled">Enable Footer</Label>
                </div>

                {footerEnabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="footer_height">Footer Height (mm)</Label>
                        <Input
                          id="footer_height"
                          type="number"
                          step="0.1"
                          {...register('footer_height', { valueAsNumber: true })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="footer_position">Text Position</Label>
                        <select
                          id="footer_position"
                          {...register('footer_position')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="footer_text">Footer Text</Label>
                      <Input
                        id="footer_text"
                        {...register('footer_text')}
                        placeholder="Page {page} of {totalPages}"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use {'{page}'} and {'{totalPages}'} for page numbers
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="footer_include_company_info"
                        checked={watch('footer_include_company_info')}
                        onCheckedChange={(checked) =>
                          setValue('footer_include_company_info', checked)
                        }
                      />
                      <Label htmlFor="footer_include_company_info">Include Company Info</Label>
                    </div>

                    <div>
                      <Label htmlFor="footer_custom_text">Custom Footer Text</Label>
                      <Textarea
                        id="footer_custom_text"
                        {...register('footer_custom_text')}
                        rows={2}
                        placeholder="Add custom text to appear in the footer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="footer_background_color">Background Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="footer_background_color"
                            type="color"
                            {...register('footer_background_color')}
                            className="w-16 h-10"
                          />
                          <Input {...register('footer_background_color')} placeholder="#f9fafb" />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="footer_text_color">Text Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="footer_text_color"
                            type="color"
                            {...register('footer_text_color')}
                            className="w-16 h-10"
                          />
                          <Input {...register('footer_text_color')} placeholder="#6b7280" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="footer_font_size">Font Size (pt)</Label>
                        <Input
                          id="footer_font_size"
                          type="number"
                          step="0.1"
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
                          <Label htmlFor="footer_border_top">Top Border</Label>
                        </div>

                        {watch('footer_border_top') && (
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              {...register('footer_border_color')}
                              className="w-16 h-10"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Page Margins Tab */}
              <TabsContent value="page" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="page_margin_top">Top Margin (mm)</Label>
                    <Input
                      id="page_margin_top"
                      type="number"
                      step="0.1"
                      {...register('page_margin_top', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="page_margin_bottom">Bottom Margin (mm)</Label>
                    <Input
                      id="page_margin_bottom"
                      type="number"
                      step="0.1"
                      {...register('page_margin_bottom', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="page_margin_left">Left Margin (mm)</Label>
                    <Input
                      id="page_margin_left"
                      type="number"
                      step="0.1"
                      {...register('page_margin_left', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="page_margin_right">Right Margin (mm)</Label>
                    <Input
                      id="page_margin_right"
                      type="number"
                      step="0.1"
                      {...register('page_margin_right', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {templateId ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
