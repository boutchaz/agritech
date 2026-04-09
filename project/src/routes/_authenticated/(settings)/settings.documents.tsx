import { createFileRoute } from '@tanstack/react-router';
import { FileText, Plus, Edit2, Trash2, Star, StarOff, Eye } from 'lucide-react';
import { useState, useMemo } from 'react';
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
import { FilterBar, ListPageLayout, ListPageHeader, ResponsiveList } from '@/components/ui/data-table';

export const Route = createFileRoute('/_authenticated/(settings)/settings/documents')({
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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return templates;
    const q = searchTerm.toLowerCase();
    return templates?.filter((t) => t.name.toLowerCase().includes(q)) ?? [];
  }, [templates, searchTerm]);
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
    <>
    <ListPageLayout
      header={
        <ListPageHeader
          variant="shell"
          actions={
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('documents.create')}
            </Button>
          }
        />
      }
      filters={
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={t('documents.searchPlaceholder', 'Search templates...')}
          statusFilters={documentTypes.map((type) => ({
            value: type.value,
            label: type.label,
          }))}
          activeStatus={selectedType}
          onStatusChange={(v) => setSelectedType(v as DocumentType)}
          onClear={() => { setSearchTerm(''); }}
        />
      }
    >

      {/* Templates List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {t('documents.templates.title', { type: documentTypes.find((dt) => dt.value === selectedType)?.label })}
              </CardTitle>
              <CardDescription>
                {t('documents.templates.description', { type: documentTypes.find((dt) => dt.value === selectedType)?.label.toLowerCase() })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveList
            items={filteredTemplates ?? []}
            isLoading={isLoading}
            keyExtractor={(template) => template.id}
            emptyIcon={FileText}
            emptyMessage={t('documents.empty.description')}
            emptyAction={{
              label: t('documents.create'),
              onClick: handleCreate,
            }}
            renderCard={(template) => (
                <div className="flex flex-col gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-600 transition-colors bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-3 min-w-0">
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
                      <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                        <span>{t('documents.header')}: {template.header_html ? t('documents.enabled') : t('documents.disabled')}</span>
                        <span>•</span>
                        <span>{t('documents.footer')}: {template.footer_html ? t('documents.enabled') : t('documents.disabled')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(template.id)}
                      className="gap-1.5"
                      title={t('documents.actions.preview')}
                    >
                      <Eye className="h-4 w-4" />
                      <span>{t('documents.actions.preview')}</span>
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
                        <span>{t('documents.actions.setDefault')}</span>
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
                      <span>{t('documents.actions.edit')}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title={t('documents.actions.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{t('documents.actions.delete')}</span>
                    </Button>
                  </div>
                </div>
              )}
              renderTableHeader={
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">{t('documents.templates.name', 'Name')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">{t('documents.templates.settings', 'Settings')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">{t('documents.templates.actions', 'Actions')}</th>
                </tr>
              }
              renderTable={(template) => (
                <>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white truncate">{template.name}</span>
                          {template.is_default && (
                            <Badge variant="default" className="gap-1 flex-shrink-0">
                              <Star className="h-3 w-3 fill-current" />
                              {t('documents.default')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col gap-1">
                      <span>{t('documents.header')}: {template.header_html ? t('documents.enabled') : t('documents.disabled')}</span>
                      <span>{t('documents.footer')}: {template.footer_html ? t('documents.enabled') : t('documents.disabled')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end items-center gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(template.id)}
                        className="gap-1.5"
                        title={t('documents.actions.preview')}
                      >
                        <Eye className="h-4 w-4" />
                        <span>{t('documents.actions.preview')}</span>
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
                          <span>{t('documents.actions.setDefault')}</span>
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
                        <span>{t('documents.actions.edit')}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title={t('documents.actions.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{t('documents.actions.delete')}</span>
                      </Button>
                    </div>
                  </td>
                </>
              )}
            />
        </CardContent>
      </Card>
    </ListPageLayout>

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
    </>
  );
}
