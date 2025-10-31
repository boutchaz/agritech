// Edge Function: generate-quote-pdf
// Generates a PDF document for a sales quote using pdf-lib

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="npm:@types/pdf-lib@1.17.1"
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteItem {
  item_name: string;
  description?: string;
  quantity: number;
  rate: number;
  amount: number;
  tax_amount: number;
  tax_rate?: number;
}

interface Quote {
  id: string;
  quote_number: string;
  quote_date: string;
  valid_until: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  currency_code: string;
  payment_terms?: string;
  delivery_terms?: string;
  terms_conditions?: string;
  items: QuoteItem[];
  status: string;
}

interface Organization {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  currency: string;
  tax_id?: string;
}

interface QuoteTemplate {
  id: string;
  name: string;
  organization_id: string;
  header_color?: string;
  accent_color?: string;
  font_family?: string;
  logo_url?: string;
  footer_text?: string;
  show_tax_id?: boolean;
  show_terms?: boolean;
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Helper function to format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper to parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.06, g: 0.73, b: 0.51 }; // Default green
}

// Generate PDF using pdf-lib
async function generateQuotePDF(
  quote: Quote,
  organization: Organization,
  template?: QuoteTemplate
): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Set document metadata
  pdfDoc.setTitle(`Quote ${quote.quote_number}`);
  pdfDoc.setAuthor(organization.name);
  pdfDoc.setSubject(`Sales Quote for ${quote.customer_name}`);
  pdfDoc.setCreationDate(new Date());

  // Add a page
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();

  // Embed fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Get colors from template or use defaults
  const accentColor = template?.accent_color
    ? hexToRgb(template.accent_color)
    : { r: 0.06, g: 0.73, b: 0.51 }; // Green

  const primaryColor = rgb(accentColor.r, accentColor.g, accentColor.b);
  const darkGray = rgb(0.12, 0.16, 0.22);
  const mediumGray = rgb(0.42, 0.45, 0.49);
  const lightGray = rgb(0.95, 0.96, 0.97);

  let yPosition = height - 60;

  // ===== HEADER SECTION =====
  // Company name
  page.drawText(organization.name, {
    x: 50,
    y: yPosition,
    size: 24,
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 25;

  // Company details
  const companyDetails = [
    organization.address,
    organization.email && `Email: ${organization.email}`,
    organization.phone && `Tel: ${organization.phone}`,
    (template?.show_tax_id !== false && organization.tax_id) && `Tax ID: ${organization.tax_id}`,
  ].filter(Boolean);

  companyDetails.forEach((detail) => {
    page.drawText(detail as string, {
      x: 50,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: mediumGray,
    });
    yPosition -= 15;
  });

  // Status badge on the right
  const statusText = quote.status.toUpperCase();
  const statusWidth = boldFont.widthOfTextAtSize(statusText, 10);
  const badgeX = width - 100;
  const badgeY = height - 65;

  // Draw status badge background
  page.drawRectangle({
    x: badgeX - 10,
    y: badgeY - 5,
    width: statusWidth + 20,
    height: 20,
    color: lightGray,
    borderColor: primaryColor,
    borderWidth: 1,
  });

  page.drawText(statusText, {
    x: badgeX,
    y: badgeY,
    size: 10,
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 20;

  // Divider line
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 2,
    color: primaryColor,
  });

  yPosition -= 40;

  // ===== DOCUMENT TITLE =====
  page.drawText('DEVIS / QUOTE', {
    x: 50,
    y: yPosition,
    size: 28,
    font: boldFont,
    color: primaryColor,
  });

  yPosition -= 25;

  page.drawText(`N° ${quote.quote_number}`, {
    x: 50,
    y: yPosition,
    size: 16,
    font: regularFont,
    color: mediumGray,
  });

  yPosition -= 40;

  // ===== INFO SECTION =====
  const infoStartY = yPosition;

  // Customer info (left column)
  page.drawText('CLIENT / CUSTOMER', {
    x: 50,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: mediumGray,
  });

  yPosition -= 18;

  page.drawText(quote.customer_name, {
    x: 50,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: darkGray,
  });

  yPosition -= 15;

  const customerDetails = [
    quote.customer_address,
    quote.customer_email && `Email: ${quote.customer_email}`,
    quote.customer_phone && `Tel: ${quote.customer_phone}`,
  ].filter(Boolean);

  customerDetails.forEach((detail) => {
    page.drawText(detail as string, {
      x: 50,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: darkGray,
    });
    yPosition -= 15;
  });

  // Quote details (right column)
  let rightY = infoStartY;
  const rightX = width - 250;

  const quoteDetails = [
    { label: 'Date du devis:', value: formatDate(quote.quote_date) },
    { label: 'Valide jusqu\'au:', value: formatDate(quote.valid_until) },
    quote.payment_terms && { label: 'Paiement:', value: quote.payment_terms },
    quote.delivery_terms && { label: 'Livraison:', value: quote.delivery_terms },
  ].filter(Boolean);

  quoteDetails.forEach((detail: any) => {
    page.drawText(detail.label, {
      x: rightX,
      y: rightY,
      size: 10,
      font: boldFont,
      color: mediumGray,
    });

    page.drawText(detail.value, {
      x: rightX + 100,
      y: rightY,
      size: 10,
      font: regularFont,
      color: darkGray,
    });

    rightY -= 15;
  });

  yPosition -= 30;

  // ===== ITEMS TABLE =====
  // Table header
  const tableHeaders = [
    { text: '#', x: 50, width: 30 },
    { text: 'Article / Item', x: 85, width: 200 },
    { text: 'Qté', x: 290, width: 40 },
    { text: 'Prix Unit.', x: 335, width: 60 },
    { text: 'Montant', x: 400, width: 60 },
    { text: 'TVA', x: 465, width: 40 },
    { text: 'Total', x: 510, width: 60 },
  ];

  // Header background
  page.drawRectangle({
    x: 45,
    y: yPosition - 5,
    width: width - 90,
    height: 20,
    color: lightGray,
  });

  tableHeaders.forEach((header) => {
    page.drawText(header.text, {
      x: header.x,
      y: yPosition,
      size: 9,
      font: boldFont,
      color: mediumGray,
    });
  });

  yPosition -= 25;

  // Table rows
  let currentPage = page;
  quote.items.forEach((item, index) => {
    // Check if we need a new page
    if (yPosition < 150) {
      currentPage = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - 60;
    }

    const rowStartY = yPosition;

    // Item number
    currentPage.drawText(`${index + 1}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: darkGray,
    });

    // Item name
    currentPage.drawText(item.item_name.substring(0, 35), {
      x: 85,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: darkGray,
    });

    // Description (if exists)
    if (item.description) {
      yPosition -= 12;
      currentPage.drawText(item.description.substring(0, 40), {
        x: 85,
        y: yPosition,
        size: 8,
        font: regularFont,
        color: mediumGray,
      });
    }

    // Quantity
    currentPage.drawText(item.quantity.toString(), {
      x: 295,
      y: rowStartY,
      size: 10,
      font: regularFont,
      color: darkGray,
    });

    // Rate
    currentPage.drawText(formatCurrency(item.rate), {
      x: 335,
      y: rowStartY,
      size: 10,
      font: regularFont,
      color: darkGray,
    });

    // Amount
    currentPage.drawText(formatCurrency(item.amount), {
      x: 400,
      y: rowStartY,
      size: 10,
      font: regularFont,
      color: darkGray,
    });

    // Tax
    currentPage.drawText(formatCurrency(item.tax_amount), {
      x: 465,
      y: rowStartY,
      size: 10,
      font: regularFont,
      color: mediumGray,
    });

    // Total
    currentPage.drawText(formatCurrency(item.amount + item.tax_amount), {
      x: 510,
      y: rowStartY,
      size: 10,
      font: boldFont,
      color: darkGray,
    });

    yPosition -= 20;

    // Divider line
    currentPage.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 0.5,
      color: lightGray,
    });

    yPosition -= 10;
  });

  yPosition -= 20;

  // ===== TOTALS SECTION =====
  const totalsX = width - 250;

  const totals = [
    { label: 'Sous-total / Subtotal:', value: formatCurrency(quote.subtotal), bold: false },
    { label: 'TVA / Tax:', value: formatCurrency(quote.tax_total), bold: false },
    { label: 'TOTAL:', value: formatCurrency(quote.grand_total), bold: true },
  ];

  totals.forEach((total, index) => {
    const isGrandTotal = index === totals.length - 1;
    const font = total.bold ? boldFont : regularFont;
    const size = total.bold ? 14 : 11;
    const color = total.bold ? primaryColor : darkGray;

    if (isGrandTotal) {
      // Draw line above grand total
      page.drawLine({
        start: { x: totalsX, y: yPosition + 5 },
        end: { x: width - 50, y: yPosition + 5 },
        thickness: 2,
        color: primaryColor,
      });
      yPosition -= 15;
    }

    page.drawText(total.label, {
      x: totalsX,
      y: yPosition,
      size: size,
      font: font,
      color: color,
    });

    const valueText = `${quote.currency_code} ${total.value}`;
    page.drawText(valueText, {
      x: width - 50 - regularFont.widthOfTextAtSize(valueText, size),
      y: yPosition,
      size: size,
      font: font,
      color: color,
    });

    yPosition -= isGrandTotal ? 30 : 20;
  });

  // ===== TERMS & CONDITIONS =====
  if ((template?.show_terms !== false) && quote.terms_conditions) {
    yPosition -= 20;

    // Check if we need a new page
    if (yPosition < 150) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - 60;
    }

    page.drawText('CONDITIONS GÉNÉRALES / TERMS & CONDITIONS', {
      x: 50,
      y: yPosition,
      size: 11,
      font: boldFont,
      color: darkGray,
    });

    yPosition -= 18;

    // Split terms into lines (max 80 chars per line)
    const termsLines = quote.terms_conditions.match(/.{1,80}(\s|$)/g) || [];
    termsLines.forEach((line) => {
      page.drawText(line.trim(), {
        x: 50,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: mediumGray,
      });
      yPosition -= 12;
    });
  }

  // ===== FOOTER =====
  const footerY = 60;

  page.drawLine({
    start: { x: 50, y: footerY + 20 },
    end: { x: width - 50, y: footerY + 20 },
    thickness: 1,
    color: lightGray,
  });

  const footerText = template?.footer_text ||
    `Ce devis est valable jusqu'au ${formatDate(quote.valid_until)} | This quote is valid until ${formatDate(quote.valid_until)}`;

  page.drawText(footerText, {
    x: 50 + (width - 100) / 2 - regularFont.widthOfTextAtSize(footerText, 8) / 2,
    y: footerY,
    size: 8,
    font: regularFont,
    color: mediumGray,
  });

  page.drawText('Merci pour votre confiance / Thank you for your trust', {
    x: 50 + (width - 100) / 2 - regularFont.widthOfTextAtSize('Merci pour votre confiance / Thank you for your trust', 8) / 2,
    y: footerY - 12,
    size: 8,
    font: regularFont,
    color: mediumGray,
  });

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get quote ID from URL
    const url = new URL(req.url);
    const quoteId = url.searchParams.get('quoteId');

    if (!quoteId) {
      throw new Error('Missing quote ID');
    }

    // Fetch quote data with items
    const { data: quote, error: quoteError } = await supabaseClient
      .from('quotes')
      .select(`
        *,
        items:quote_items(*)
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found');
    }

    // Fetch organization data
    const { data: organization, error: orgError } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('id', quote.organization_id)
      .single();

    if (orgError || !organization) {
      throw new Error('Organization not found');
    }

    // Try to fetch custom template if it exists
    const { data: template } = await supabaseClient
      .from('quote_templates')
      .select('*')
      .eq('organization_id', quote.organization_id)
      .eq('is_default', true)
      .single();

    // Generate PDF
    const pdfBytes = await generateQuotePDF(quote as Quote, organization as Organization, template);

    // Return PDF
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-${quote.quote_number}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating quote PDF:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate PDF',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
