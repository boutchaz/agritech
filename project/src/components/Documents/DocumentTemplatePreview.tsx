import { useMemo, type CSSProperties } from 'react';
import { useDocumentTemplate } from '@/hooks/useDocumentTemplates';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { sanitizeHtml } from '@/lib/sanitize';
import type { DocumentTemplate } from '@/lib/api/document-templates';
import { normalizeTemplateForPreview } from './document-template-preview-utils';

interface DocumentTemplatePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  /** Saved template id — ignored when draftTemplate is set */
  templateId: string | null;
  /** Unsaved form snapshot from the editor (live preview) */
  draftTemplate?: Record<string, unknown> | null;
}

export function DocumentTemplatePreview({
  isOpen,
  onClose,
  templateId,
  draftTemplate,
}: DocumentTemplatePreviewProps) {
  const { t } = useTranslation();
  const { data: fetchedTemplate, isLoading } = useDocumentTemplate(
    draftTemplate ? null : templateId,
  );
  const { currentOrganization } = useAuth();

  const template: DocumentTemplate | null = useMemo(() => {
    if (draftTemplate != null) {
      return normalizeTemplateForPreview(draftTemplate as Record<string, unknown>);
    }
    if (fetchedTemplate) {
      return normalizeTemplateForPreview(fetchedTemplate as unknown as Record<string, unknown>);
    }
    return null;
  }, [draftTemplate, fetchedTemplate]);

  const isBusy = draftTemplate == null && !!templateId && isLoading;

  const title =
    template &&
    t('documents.preview.title', 'Preview: {{name}}', {
      name: template.name,
    });

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const bodyStyle: CSSProperties = {
    fontFamily: template?.font_family || 'Helvetica',
    fontSize: `${template?.body_font_size ?? 10}pt`,
    color: '#374151',
  };

  const accent = template?.accent_color || '#10B981';

  // Calculate actual content height (mm) for info footer
  const contentHeight =
    template !== null
      ? 297 -
        (template.page_margin_top || 20) -
        (template.page_margin_bottom || 20) -
        (template.header_enabled ? template.header_height || 80 : 0) -
        (template.footer_enabled ? template.footer_height || 60 : 0)
      : 0;

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={title ?? t('documents.preview.loadingTitle', 'Template preview')}
      size="full"
      className="max-w-5xl"
      contentClassName="max-h-[90vh] overflow-y-auto"
    >
      {isBusy ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !template ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {t('documents.preview.notFound', 'Template could not be loaded.')}
        </p>
      ) : (
        <div className="space-y-4">
          {draftTemplate != null && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
              {t(
                'documents.preview.draftHint',
                'You are viewing unsaved changes from the editor.',
              )}
            </p>
          )}

          <div
            className="mx-auto bg-white shadow-lg relative overflow-hidden text-black"
            style={{
              width: '210mm',
              maxWidth: '100%',
              aspectRatio: '210 / 297',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {template.watermark_enabled && template.watermark_text && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center z-0"
                style={{
                  opacity: template.watermark_opacity ?? 0.1,
                }}
              >
                <span
                  className="text-4xl font-bold select-none"
                  style={{
                    transform: 'rotate(-32deg)',
                    color: accent,
                  }}
                >
                  {template.watermark_text}
                </span>
              </div>
            )}

            <div className="relative z-[1] flex flex-col flex-1 min-h-0">
              {template.header_html?.trim() ? (
                <div
                  className="border-b border-gray-200 text-sm leading-snug shrink-0 [&_img]:max-h-24 [&_img]:object-contain"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(template.header_html),
                  }}
                />
              ) : template.header_enabled ? (
                <div
                  className="flex items-center px-4 shrink-0"
                  style={{
                    height: `${template.header_height}mm`,
                    backgroundColor: template.header_background_color || '#ffffff',
                    color: template.header_text_color || '#000000',
                    borderBottom: template.header_border_bottom
                      ? `1px solid ${template.header_border_color || '#e5e7eb'}`
                      : 'none',
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    {template.header_logo_url && (
                      <div
                        className={`flex ${
                          template.header_logo_position === 'center'
                            ? 'justify-center'
                            : template.header_logo_position === 'right'
                              ? 'justify-end'
                              : 'justify-start'
                        } ${template.header_logo_position === 'center' ? 'w-full' : ''}`}
                      >
                        <img
                          src={template.header_logo_url}
                          alt=""
                          className="object-contain"
                          style={{
                            width: `${template.header_logo_width || 50}mm`,
                            height: `${template.header_logo_height || 30}mm`,
                          }}
                        />
                      </div>
                    )}

                    {!template.header_logo_url && (
                      <div className="flex-1">
                        {template.header_company_name && (
                          <div className="text-xl font-bold">
                            {currentOrganization?.name ||
                              t('documents.preview.sampleCompany', 'Company name')}
                          </div>
                        )}
                        {template.header_company_info && (
                          <div className="text-sm mt-1 text-muted-foreground">
                            <div>{t('documents.preview.sampleAddress', '123 Business Street')}</div>
                            <div>{t('documents.preview.sampleCity', 'City, Country')}</div>
                            <div>{t('documents.preview.sampleEmail', 'contact@example.com')}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {template.header_custom_text && (
                      <div
                        className={`text-2xl font-bold ${
                          template.header_logo_url ? 'flex-1 text-right' : ''
                        }`}
                      >
                        {template.header_custom_text}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div
                className="flex-1 overflow-hidden min-h-0"
                style={{
                  paddingTop: `${template.page_margin_top || 20}mm`,
                  paddingBottom: `${template.page_margin_bottom || 20}mm`,
                  paddingLeft: `${template.page_margin_left || 15}mm`,
                  paddingRight: `${template.page_margin_right || 15}mm`,
                }}
              >
                <div className="space-y-4" style={bodyStyle}>
                  <div className="space-y-2">
                    <h2
                      className="font-semibold text-gray-900"
                      style={{
                        fontSize: `${template.title_font_size ?? 24}pt`,
                        color: accent,
                      }}
                    >
                      {template.document_type === 'invoice' &&
                        t('documents.preview.sampleInvoiceTitle', 'Invoice #INV-2024-001')}
                      {template.document_type === 'quote' &&
                        t('documents.preview.sampleQuoteTitle', 'Quote #QUO-2024-001')}
                      {template.document_type === 'sales_order' &&
                        t('documents.preview.sampleSalesOrderTitle', 'Sales Order #SO-2024-001')}
                      {template.document_type === 'purchase_order' &&
                        t('documents.preview.samplePurchaseOrderTitle', 'Purchase Order #PO-2024-001')}
                      {template.document_type === 'report' &&
                        t('documents.preview.sampleReportTitle', 'Report title')}
                      {template.document_type === 'general' &&
                        t('documents.preview.sampleGeneralTitle', 'Document title')}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {t('documents.preview.sampleDate', 'Date: {{date}}', {
                        date: new Date().toLocaleDateString(),
                      })}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold" style={{ fontSize: `${template.heading_font_size ?? 14}pt` }}>
                      {t('documents.preview.sampleCustomer', 'Customer name')}
                    </p>
                    <p className="text-sm">{t('documents.preview.sampleCustomerStreet', '456 Customer Avenue')}</p>
                    <p className="text-sm">{t('documents.preview.sampleCustomerCity', 'City, Country')}</p>
                  </div>

                  {['invoice', 'quote', 'sales_order', 'purchase_order'].includes(
                    template.document_type,
                  ) && (
                    <Table
                      className="w-full mt-6 text-sm"
                      style={{ borderColor: template.table_border_color || '#e5e7eb' }}
                    >
                      <TableHeader>
                        <TableRow
                          className="border-b-2"
                          style={{
                            borderColor: template.table_border_color || '#e5e7eb',
                            backgroundColor: template.table_header_bg_color || '#10B981',
                            color: template.table_header_text_color || '#ffffff',
                          }}
                        >
                          <TableHead className="text-left py-2">
                            {t('documents.preview.colDescription', 'Description')}
                          </TableHead>
                          <TableHead className="text-right py-2">
                            {t('documents.preview.colQty', 'Qty')}
                          </TableHead>
                          <TableHead className="text-right py-2">
                            {t('documents.preview.colUnitPrice', 'Unit price')}
                          </TableHead>
                          <TableHead className="text-right py-2">
                            {t('documents.preview.colAmount', 'Amount')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow
                          className="border-b"
                          style={{
                            borderColor: template.table_border_color || '#e5e7eb',
                            backgroundColor: '#ffffff',
                          }}
                        >
                          <TableCell className="py-2">
                            {t('documents.preview.line1', 'Sample product A')}
                          </TableCell>
                          <TableCell className="text-right">2</TableCell>
                          <TableCell className="text-right">100 MAD</TableCell>
                          <TableCell className="text-right">200 MAD</TableCell>
                        </TableRow>
                        <TableRow
                          className="border-b"
                          style={{
                            borderColor: template.table_border_color || '#e5e7eb',
                            backgroundColor: template.table_row_alt_color || '#f9fafb',
                          }}
                        >
                          <TableCell className="py-2">
                            {t('documents.preview.line2', 'Sample product B')}
                          </TableCell>
                          <TableCell className="text-right">1</TableCell>
                          <TableCell className="text-right">75 MAD</TableCell>
                          <TableCell className="text-right">75 MAD</TableCell>
                        </TableRow>
                      </TableBody>
                      <TableFooter>
                        <TableRow className="font-semibold">
                          <TableCell colSpan={3} className="text-right py-2">
                            {t('documents.preview.total', 'Total')}
                          </TableCell>
                          <TableCell className="text-right py-2">275 MAD</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  )}

                  {template.document_type === 'report' && (
                    <div className="space-y-3 text-sm">
                      <p>
                        {t(
                          'documents.preview.reportSample1',
                          'This sample shows how report content will use your margins and typography.',
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        {t('documents.preview.reportSample2', 'Final text and figures come from generated reports.')}
                      </p>
                    </div>
                  )}

                  {template.document_type === 'general' && (
                    <div className="space-y-3 text-sm">
                      <p>
                        {t(
                          'documents.preview.generalSample',
                          'This sample shows how general documents will use your page layout and styles.',
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {template.footer_html?.trim() ? (
                <div
                  className="border-t border-gray-200 text-xs leading-snug mt-auto shrink-0"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(template.footer_html),
                  }}
                />
              ) : template.footer_enabled ? (
                <div
                  className="flex items-center justify-center px-4 shrink-0 mt-auto"
                  style={{
                    height: `${template.footer_height || 60}mm`,
                    backgroundColor: template.footer_background_color || '#f9fafb',
                    color: template.footer_text_color || '#6b7280',
                    fontSize: `${template.footer_font_size || 9}pt`,
                    borderTop: template.footer_border_top
                      ? `1px solid ${template.footer_border_color || '#e5e7eb'}`
                      : 'none',
                  }}
                >
                  <div
                    className={`w-full ${
                      template.footer_position === 'left'
                        ? 'text-left'
                        : template.footer_position === 'right'
                          ? 'text-right'
                          : 'text-center'
                    }`}
                  >
                    {template.footer_include_company_info && (
                      <div className="mb-2">
                        <div className="font-semibold">
                          {currentOrganization?.name ||
                            t('documents.preview.sampleCompany', 'Company name')}
                        </div>
                        <div className="text-xs opacity-90">
                          {t(
                            'documents.preview.footerContactLine',
                            'Address · Phone · Email (sample)',
                          )}
                        </div>
                      </div>
                    )}

                    {template.footer_custom_text && <div className="mb-1">{template.footer_custom_text}</div>}

                    <div>
                      {template.footer_text
                        ? template.footer_text.replace('{page}', '1').replace('{totalPages}', '3')
                        : t('documents.preview.pageOf', 'Page 1 of 3')}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              {t('documents.preview.contentHeight', 'Content area height: {{mm}} mm', {
                mm: contentHeight.toFixed(1),
              })}
            </p>
            <p>{t('documents.preview.note', 'Sample content only. Generated documents will use live data.')}</p>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
