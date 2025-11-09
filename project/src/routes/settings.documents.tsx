import { createFileRoute } from '@tanstack/react-router';
import { FileText, Plus, Edit2, Trash2, Star, StarOff, Eye } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useDocumentTemplates,
  useDeleteDocumentTemplate,
  useSetDefaultTemplate,
  type DocumentType,
} from '@/hooks/useDocumentTemplates';
import { DocumentTemplateEditor } from '@/components/Documents/DocumentTemplateEditor';
import { DocumentTemplatePreview } from '@/components/Documents/DocumentTemplatePreview';
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

export const Route = createFileRoute('/settings/documents')({
  component: DocumentSettingsPage,
});

function DocumentSettingsPage() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<DocumentType>('invoice');
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);

  const { data: templates, isLoading } = useDocumentTemplates(selectedType);
  const deleteTemplate = useDeleteDocumentTemplate();
  const setDefault = useSetDefaultTemplate();

  const documentTypes: { value: DocumentType; label: string; icon: typeof FileText }[] = [
    { value: 'invoice', label: t('documents.types.invoice'), icon: FileText },
    { value: 'quote', label: t('documents.types.quote'), icon: FileText },
    { value: 'sales_order', label: t('documents.types.salesOrder'), icon: FileText },
    { value: 'purchase_order', label: t('documents.types.purchaseOrder'), icon: FileText },
    { value: 'report', label: t('documents.types.report'), icon: FileText },
    { value: 'general', label: t('documents.types.general'), icon: FileText },
  ];

  const handleEdit = (templateId: string) => {
    setEditingTemplate(templateId);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handlePreview = (templateId: string) => {
    setPreviewTemplate(templateId);
    setPreviewOpen(true);
  };

  const handleDelete = (templateId: string) => {
    setDeletingTemplate(templateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingTemplate) return;

    try {
      await deleteTemplate.mutateAsync(deletingTemplate);
      toast.success(t('documents.delete.success'));
      setDeleteDialogOpen(false);
      setDeletingTemplate(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(t('documents.delete.failed'));
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      await setDefault.mutateAsync(templateId);
      toast.success(t('documents.setDefault.success'));
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error(t('documents.setDefault.failed'));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('documents.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('documents.description')}
        </p>
      </div>

      {/* Document Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {documentTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'default' : 'outline'}
              onClick={() => setSelectedType(type.value)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {type.label}
            </Button>
          );
        })}
      </div>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {t('documents.templates.title', { type: documentTypes.find((t) => t.value === selectedType)?.label })}
              </CardTitle>
              <CardDescription>
                {t('documents.templates.description', { type: documentTypes.find((t) => t.value === selectedType)?.label.toLowerCase() })}
              </CardDescription>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('documents.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-600 transition-colors bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-1">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {template.name}
                        </h3>
                        {template.is_default && (
                          <Badge variant="default" className="gap-1 flex-shrink-0">
                            <Star className="h-3 w-3 fill-current" />
                            {t('documents.default')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>{t('documents.header')}: {template.header_enabled ? t('documents.enabled') : t('documents.disabled')}</span>
                        <span>•</span>
                        <span>{t('documents.footer')}: {template.footer_enabled ? t('documents.enabled') : t('documents.disabled')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(template.id)}
                      className="gap-1.5"
                      title={t('documents.actions.preview')}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden lg:inline">{t('documents.actions.preview')}</span>
                    </Button>

                    {!template.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(template.id)}
                        className="gap-1.5"
                        title={t('documents.actions.setDefault')}
                      >
                        <StarOff className="h-4 w-4" />
                        <span className="hidden lg:inline">{t('documents.actions.setDefault')}</span>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template.id)}
                      className="gap-1.5"
                      title={t('documents.actions.edit')}
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="hidden lg:inline">{t('documents.actions.edit')}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title={t('documents.actions.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden lg:inline">{t('documents.actions.delete')}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('documents.empty.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('documents.empty.description')}
              </p>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('documents.create')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Editor Dialog */}
      <DocumentTemplateEditor
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingTemplate(null);
        }}
        templateId={editingTemplate}
        documentType={selectedType}
      />

      {/* Template Preview Dialog */}
      <DocumentTemplatePreview
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewTemplate(null);
        }}
        templateId={previewTemplate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('documents.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('documents.delete.confirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('documents.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('documents.delete.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
