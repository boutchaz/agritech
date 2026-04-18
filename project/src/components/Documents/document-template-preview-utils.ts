import type { DocumentTemplate, DocumentType } from '@/lib/api/document-templates';

/**
 * Coerce react-hook-form / API values into numbers for preview layout math.
 */
function num(v: unknown, fallback: number): number {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Merge draft form values (or partial API row) into a complete object the preview can render.
 */
export function normalizeTemplateForPreview(
  input: Record<string, unknown>,
): DocumentTemplate {
  const d = input;
  const str = (k: string, fallback: string) => {
    const v = d[k];
    return typeof v === 'string' ? v : fallback;
  };
  const optStr = (k: string) => {
    const v = d[k];
    if (v === undefined || v === null || v === '') return null;
    return String(v);
  };
  const bool = (k: string, fallback: boolean) =>
    typeof d[k] === 'boolean' ? d[k] as boolean : fallback;

  return {
    id: typeof d.id === 'string' ? d.id : 'preview',
    organization_id: typeof d.organization_id === 'string' ? d.organization_id : '',
    name: str('name', 'Preview'),
    document_type: (typeof d.document_type === 'string'
      ? d.document_type
      : 'invoice') as DocumentType,
    description: optStr('description'),
    is_default: bool('is_default', false),
    is_active: bool('is_active', true),
    created_by: typeof d.created_by === 'string' ? d.created_by : null,
    created_at: typeof d.created_at === 'string' ? d.created_at : new Date().toISOString(),
    updated_at: typeof d.updated_at === 'string' ? d.updated_at : new Date().toISOString(),
    html_content: optStr('html_content'),
    css_styles: optStr('css_styles'),
    header_html: optStr('header_html'),
    footer_html: optStr('footer_html'),

    header_enabled: bool('header_enabled', true),
    header_height: num(d.header_height, 80),
    header_logo_url: optStr('header_logo_url') ?? undefined,
    header_logo_position: str('header_logo_position', 'left'),
    header_logo_width: num(d.header_logo_width, 50),
    header_logo_height: num(d.header_logo_height, 30),
    header_company_name: bool('header_company_name', true),
    header_company_info: bool('header_company_info', true),
    header_custom_text: optStr('header_custom_text') ?? undefined,
    header_background_color: str('header_background_color', '#ffffff'),
    header_text_color: str('header_text_color', '#000000'),
    header_border_bottom: bool('header_border_bottom', true),
    header_border_color: str('header_border_color', '#e5e7eb'),

    footer_enabled: bool('footer_enabled', true),
    footer_height: num(d.footer_height, 60),
    footer_text: str(
      'footer_text',
      'Thank you for your business! | Page {page} of {totalPages}',
    ),
    footer_position: str('footer_position', 'center'),
    footer_include_company_info: bool('footer_include_company_info', true),
    footer_custom_text: optStr('footer_custom_text') ?? undefined,
    footer_background_color: str('footer_background_color', '#f9fafb'),
    footer_text_color: str('footer_text_color', '#6b7280'),
    footer_border_top: bool('footer_border_top', true),
    footer_border_color: str('footer_border_color', '#e5e7eb'),
    footer_font_size: num(d.footer_font_size, 9),

    page_margin_top: num(d.page_margin_top, 20),
    page_margin_bottom: num(d.page_margin_bottom, 20),
    page_margin_left: num(d.page_margin_left, 15),
    page_margin_right: num(d.page_margin_right, 15),

    accent_color: str('accent_color', '#10B981'),
    secondary_color: str('secondary_color', '#6B7280'),
    font_family: str('font_family', 'Helvetica'),
    title_font_size: num(d.title_font_size, 24),
    heading_font_size: num(d.heading_font_size, 14),
    body_font_size: num(d.body_font_size, 10),

    table_header_bg_color: str('table_header_bg_color', '#10B981'),
    table_header_text_color: str('table_header_text_color', '#ffffff'),
    table_row_alt_color: str('table_row_alt_color', '#f9fafb'),
    table_border_color: str('table_border_color', '#e5e7eb'),

    show_tax_id: bool('show_tax_id', true),
    show_terms: bool('show_terms', true),
    show_notes: bool('show_notes', true),
    show_payment_info: bool('show_payment_info', true),
    show_bank_details: bool('show_bank_details', false),
    show_qr_code: bool('show_qr_code', false),

    terms_content: optStr('terms_content'),
    payment_terms_content: optStr('payment_terms_content'),
    bank_details_content: optStr('bank_details_content'),

    watermark_enabled: bool('watermark_enabled', false),
    watermark_text: optStr('watermark_text') ?? undefined,
    watermark_opacity: num(d.watermark_opacity, 0.1),
  };
}
