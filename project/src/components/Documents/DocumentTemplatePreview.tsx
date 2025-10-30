import { useDocumentTemplate } from '@/hooks/useDocumentTemplates';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DocumentTemplatePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string | null;
}

export function DocumentTemplatePreview({
  isOpen,
  onClose,
  templateId,
}: DocumentTemplatePreviewProps) {
  const { data: template, isLoading } = useDocumentTemplate(templateId);
  const { currentOrganization } = useAuth();

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!template) {
    return null;
  }

  // Calculate actual content height based on page height minus margins and header/footer
  const pageHeight = 297; // A4 height in mm
  const contentHeight =
    pageHeight -
    (template.page_margin_top || 20) -
    (template.page_margin_bottom || 20) -
    (template.header_enabled ? template.header_height || 80 : 0) -
    (template.footer_enabled ? template.footer_height || 60 : 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview: {template.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview container - A4 aspect ratio */}
          <div
            className="mx-auto bg-white shadow-lg"
            style={{
              width: '210mm',
              maxWidth: '100%',
              aspectRatio: '210 / 297',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            {template.header_enabled && (
              <div
                className="flex items-center px-4"
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
                  {/* Logo section */}
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
                        alt="Company Logo"
                        style={{
                          width: `${template.header_logo_width || 50}mm`,
                          height: `${template.header_logo_height || 30}mm`,
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  )}

                  {/* Company info section */}
                  {!template.header_logo_url && (
                    <div className="flex-1">
                      {template.header_company_name && (
                        <div className="text-xl font-bold">
                          {currentOrganization?.name || 'Company Name'}
                        </div>
                      )}
                      {template.header_company_info && (
                        <div className="text-sm mt-1">
                          <div>123 Business Street</div>
                          <div>City, Country 12345</div>
                          <div>contact@company.com</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom text section */}
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
            )}

            {/* Content area with margins */}
            <div
              className="flex-1 overflow-hidden"
              style={{
                paddingTop: `${template.page_margin_top || 20}mm`,
                paddingBottom: `${template.page_margin_bottom || 20}mm`,
                paddingLeft: `${template.page_margin_left || 15}mm`,
                paddingRight: `${template.page_margin_right || 15}mm`,
              }}
            >
              {/* Sample content */}
              <div className="space-y-4 text-gray-700">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {template.document_type === 'invoice' && 'Invoice #INV-2024-001'}
                    {template.document_type === 'quote' && 'Quote #QUO-2024-001'}
                    {template.document_type === 'sales_order' && 'Sales Order #SO-2024-001'}
                    {template.document_type === 'purchase_order' &&
                      'Purchase Order #PO-2024-001'}
                    {template.document_type === 'report' && 'Report Title'}
                    {template.document_type === 'general' && 'Document Title'}
                  </h2>
                  <p className="text-sm text-gray-600">Date: October 30, 2024</p>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold">Customer Name</p>
                  <p className="text-sm">456 Customer Avenue</p>
                  <p className="text-sm">City, Country 54321</p>
                </div>

                {/* Sample table for invoices/orders */}
                {['invoice', 'quote', 'sales_order', 'purchase_order'].includes(
                  template.document_type
                ) && (
                  <table className="w-full mt-6 text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Quantity</th>
                        <th className="text-right py-2">Unit Price</th>
                        <th className="text-right py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-2">Product/Service Item 1</td>
                        <td className="text-right">2</td>
                        <td className="text-right">$50.00</td>
                        <td className="text-right">$100.00</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2">Product/Service Item 2</td>
                        <td className="text-right">1</td>
                        <td className="text-right">$75.00</td>
                        <td className="text-right">$75.00</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-2">Product/Service Item 3</td>
                        <td className="text-right">3</td>
                        <td className="text-right">$25.00</td>
                        <td className="text-right">$75.00</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td colSpan={3} className="text-right py-2">
                          Total:
                        </td>
                        <td className="text-right py-2">$250.00</td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {/* Sample text for reports */}
                {template.document_type === 'report' && (
                  <div className="space-y-3 text-sm">
                    <p>
                      This is a sample report document to demonstrate how your template will
                      appear. The content area is adjusted based on your margin settings.
                    </p>
                    <p>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
                      tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <p>
                      Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                      aliquip ex ea commodo consequat.
                    </p>
                  </div>
                )}

                {/* Sample text for general documents */}
                {template.document_type === 'general' && (
                  <div className="space-y-3 text-sm">
                    <p>
                      This is a sample document to demonstrate how your template will appear. The
                      header and footer will be consistent across all pages.
                    </p>
                    <p>
                      You can customize the appearance of the header, footer, and page margins to
                      match your brand identity and document requirements.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {template.footer_enabled && (
              <div
                className="flex items-center justify-center px-4"
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
                  {/* Company info in footer */}
                  {template.footer_include_company_info && (
                    <div className="mb-2">
                      <div className="font-semibold">
                        {currentOrganization?.name || 'Company Name'}
                      </div>
                      <div className="text-xs">
                        123 Business Street | City, Country 12345 | contact@company.com
                      </div>
                    </div>
                  )}

                  {/* Custom footer text */}
                  {template.footer_custom_text && (
                    <div className="mb-1">{template.footer_custom_text}</div>
                  )}

                  {/* Page numbers */}
                  <div>
                    {template.footer_text
                      ? template.footer_text.replace('{page}', '1').replace('{totalPages}', '3')
                      : 'Page 1 of 3'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Template info */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Content Height:</strong> {contentHeight.toFixed(1)}mm (after header, footer,
              and margins)
            </p>
            <p>
              <strong>Note:</strong> This is a preview showing how your template will be applied to
              documents. Actual content will vary.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
