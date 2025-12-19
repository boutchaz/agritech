"""
Base PDF Generator Classes
Provides generic infrastructure for all PDF document types
with comprehensive template customization support
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from abc import ABC, abstractmethod
import logging
import urllib.request
import tempfile
import os

logger = logging.getLogger(__name__)


class PDFColor:
    """Color utilities for PDF generation"""

    @staticmethod
    def hex_to_rgb(hex_color: str) -> Tuple[float, float, float]:
        """Convert hex color to RGB tuple (0-1 range)"""
        if not hex_color:
            return (0.06, 0.73, 0.51)  # Default green #10B981

        hex_color = hex_color.lstrip('#')
        try:
            return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))
        except:
            return (0.06, 0.73, 0.51)

    @staticmethod
    def rgb(r: float, g: float, b: float):
        """Create ReportLab color from RGB values"""
        return colors.Color(r, g, b)


class PDFFormatter:
    """Common formatting utilities for PDF documents"""

    @staticmethod
    def format_currency(amount: float, currency: str = "MAD") -> str:
        """Format amount as currency"""
        return f"{amount:,.2f} {currency}"

    @staticmethod
    def format_date(date_value: Any, format_str: str = "%d/%m/%Y") -> str:
        """Format date to readable format"""
        try:
            if isinstance(date_value, str):
                dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            elif isinstance(date_value, datetime):
                dt = date_value
            else:
                return str(date_value)
            return dt.strftime(format_str)
        except:
            return str(date_value)

    @staticmethod
    def truncate_text(text: str, max_length: int) -> str:
        """Truncate text to maximum length"""
        if len(text) <= max_length:
            return text
        return text[:max_length - 3] + "..."


class DocumentTemplate:
    """
    Comprehensive template configuration for document styling
    Supports all customization options from the database
    """

    def __init__(self, data: Optional[Dict[str, Any]] = None):
        self.data = data or {}

    # =====================================================
    # HELPER METHODS
    # =====================================================

    def _get_color(self, key: str, default: str = '#10B981') -> Tuple[float, float, float]:
        """Get color as RGB tuple from hex string"""
        hex_color = self.data.get(key, default)
        return PDFColor.hex_to_rgb(hex_color)

    def _get_float(self, key: str, default: float) -> float:
        """Get float value from data"""
        try:
            value = self.data.get(key, default)
            return float(value) if value is not None else default
        except (ValueError, TypeError):
            return default

    def _get_bool(self, key: str, default: bool) -> bool:
        """Get boolean value from data"""
        value = self.data.get(key, default)
        if value is None:
            return default
        return bool(value)

    def _get_str(self, key: str, default: str = '') -> str:
        """Get string value from data"""
        value = self.data.get(key, default)
        return str(value) if value is not None else default

    # =====================================================
    # BRANDING & COLORS
    # =====================================================

    @property
    def accent_color(self) -> Tuple[float, float, float]:
        """Primary accent color (used for headers, table headers, etc.)"""
        return self._get_color('accent_color', '#10B981')

    @property
    def secondary_color(self) -> Tuple[float, float, float]:
        """Secondary color for supporting elements"""
        return self._get_color('secondary_color', '#6B7280')

    # =====================================================
    # HEADER CONFIGURATION
    # =====================================================

    @property
    def header_enabled(self) -> bool:
        """Whether to show header section"""
        return self._get_bool('header_enabled', True)

    @property
    def header_height(self) -> float:
        """Header height in mm"""
        return self._get_float('header_height', 80)

    @property
    def header_logo_url(self) -> Optional[str]:
        """URL to company logo"""
        url = self._get_str('header_logo_url')
        return url if url else None

    @property
    def header_logo_position(self) -> str:
        """Logo position: left, center, or right"""
        return self._get_str('header_logo_position', 'left')

    @property
    def header_logo_width(self) -> float:
        """Logo width in mm"""
        return self._get_float('header_logo_width', 50)

    @property
    def header_logo_height(self) -> float:
        """Logo height in mm"""
        return self._get_float('header_logo_height', 30)

    @property
    def header_company_name(self) -> bool:
        """Show company name in header"""
        return self._get_bool('header_company_name', True)

    @property
    def header_company_info(self) -> bool:
        """Show company info (address, contact) in header"""
        return self._get_bool('header_company_info', True)

    @property
    def header_custom_text(self) -> Optional[str]:
        """Custom header text"""
        text = self._get_str('header_custom_text')
        return text if text else None

    @property
    def header_background_color(self) -> Tuple[float, float, float]:
        """Header background color"""
        return self._get_color('header_background_color', '#ffffff')

    @property
    def header_text_color(self) -> Tuple[float, float, float]:
        """Header text color"""
        return self._get_color('header_text_color', '#000000')

    @property
    def header_border_bottom(self) -> bool:
        """Show border at bottom of header"""
        return self._get_bool('header_border_bottom', True)

    @property
    def header_border_color(self) -> Tuple[float, float, float]:
        """Header border color"""
        return self._get_color('header_border_color', '#e5e7eb')

    # =====================================================
    # FOOTER CONFIGURATION
    # =====================================================

    @property
    def footer_enabled(self) -> bool:
        """Whether to show footer section"""
        return self._get_bool('footer_enabled', True)

    @property
    def footer_height(self) -> float:
        """Footer height in mm"""
        return self._get_float('footer_height', 60)

    @property
    def footer_text(self) -> str:
        """Footer text (supports {page} and {totalPages} placeholders)"""
        return self._get_str('footer_text', 'Thank you for your business!')

    @property
    def footer_position(self) -> str:
        """Footer text position: left, center, or right"""
        return self._get_str('footer_position', 'center')

    @property
    def footer_include_company_info(self) -> bool:
        """Include company info in footer"""
        return self._get_bool('footer_include_company_info', True)

    @property
    def footer_custom_text(self) -> Optional[str]:
        """Custom footer text"""
        text = self._get_str('footer_custom_text')
        return text if text else None

    @property
    def footer_background_color(self) -> Tuple[float, float, float]:
        """Footer background color"""
        return self._get_color('footer_background_color', '#f9fafb')

    @property
    def footer_text_color(self) -> Tuple[float, float, float]:
        """Footer text color"""
        return self._get_color('footer_text_color', '#6b7280')

    @property
    def footer_border_top(self) -> bool:
        """Show border at top of footer"""
        return self._get_bool('footer_border_top', True)

    @property
    def footer_border_color(self) -> Tuple[float, float, float]:
        """Footer border color"""
        return self._get_color('footer_border_color', '#e5e7eb')

    @property
    def footer_font_size(self) -> float:
        """Footer font size in points"""
        return self._get_float('footer_font_size', 9)

    # =====================================================
    # PAGE MARGINS
    # =====================================================

    @property
    def page_margin_top(self) -> float:
        """Top margin in mm"""
        return self._get_float('page_margin_top', 20)

    @property
    def page_margin_bottom(self) -> float:
        """Bottom margin in mm"""
        return self._get_float('page_margin_bottom', 20)

    @property
    def page_margin_left(self) -> float:
        """Left margin in mm"""
        return self._get_float('page_margin_left', 15)

    @property
    def page_margin_right(self) -> float:
        """Right margin in mm"""
        return self._get_float('page_margin_right', 15)

    # =====================================================
    # TYPOGRAPHY
    # =====================================================

    @property
    def font_family(self) -> str:
        """Font family (Helvetica, Times-Roman, Courier)"""
        return self._get_str('font_family', 'Helvetica')

    @property
    def title_font_size(self) -> float:
        """Title font size in points"""
        return self._get_float('title_font_size', 24)

    @property
    def heading_font_size(self) -> float:
        """Heading font size in points"""
        return self._get_float('heading_font_size', 14)

    @property
    def body_font_size(self) -> float:
        """Body text font size in points"""
        return self._get_float('body_font_size', 10)

    # =====================================================
    # TABLE STYLING
    # =====================================================

    @property
    def table_header_bg_color(self) -> Tuple[float, float, float]:
        """Table header background color"""
        return self._get_color('table_header_bg_color', '#10B981')

    @property
    def table_header_text_color(self) -> Tuple[float, float, float]:
        """Table header text color"""
        return self._get_color('table_header_text_color', '#ffffff')

    @property
    def table_row_alt_color(self) -> Tuple[float, float, float]:
        """Alternating row background color"""
        return self._get_color('table_row_alt_color', '#f9fafb')

    @property
    def table_border_color(self) -> Tuple[float, float, float]:
        """Table border color"""
        return self._get_color('table_border_color', '#e5e7eb')

    # =====================================================
    # CONTENT DISPLAY OPTIONS
    # =====================================================

    @property
    def show_tax_id(self) -> bool:
        """Show tax ID in organization info"""
        return self._get_bool('show_tax_id', True)

    @property
    def show_terms(self) -> bool:
        """Show terms and conditions section"""
        return self._get_bool('show_terms', True)

    @property
    def show_notes(self) -> bool:
        """Show notes section"""
        return self._get_bool('show_notes', True)

    @property
    def show_payment_info(self) -> bool:
        """Show payment information"""
        return self._get_bool('show_payment_info', True)

    @property
    def show_bank_details(self) -> bool:
        """Show bank details"""
        return self._get_bool('show_bank_details', False)

    @property
    def show_qr_code(self) -> bool:
        """Show QR code"""
        return self._get_bool('show_qr_code', False)

    # =====================================================
    # CUSTOM CONTENT
    # =====================================================

    @property
    def terms_content(self) -> Optional[str]:
        """Custom terms and conditions text"""
        text = self._get_str('terms_content')
        return text if text else None

    @property
    def payment_terms_content(self) -> Optional[str]:
        """Custom payment terms text"""
        text = self._get_str('payment_terms_content')
        return text if text else None

    @property
    def bank_details_content(self) -> Optional[str]:
        """Custom bank details text"""
        text = self._get_str('bank_details_content')
        return text if text else None

    # =====================================================
    # WATERMARK
    # =====================================================

    @property
    def watermark_enabled(self) -> bool:
        """Enable watermark"""
        return self._get_bool('watermark_enabled', False)

    @property
    def watermark_text(self) -> Optional[str]:
        """Watermark text"""
        text = self._get_str('watermark_text')
        return text if text else None

    @property
    def watermark_opacity(self) -> float:
        """Watermark opacity (0-1)"""
        return self._get_float('watermark_opacity', 0.1)


class BasePDFGenerator(ABC):
    """
    Base class for all PDF document generators
    Provides common infrastructure and enforces document structure
    """

    def __init__(
        self,
        document_data: Dict[str, Any],
        organization: Dict[str, Any],
        template: Optional[DocumentTemplate] = None
    ):
        self.document = document_data
        self.organization = organization
        self.template = template or DocumentTemplate()
        self.buffer = BytesIO()
        self.width, self.height = A4
        self.styles = getSampleStyleSheet()
        self.page_count = 0

        # Setup custom styles based on template
        self._setup_styles()

    def _setup_styles(self):
        """Setup custom paragraph styles based on template settings"""
        font_family = self.template.font_family
        font_bold = f'{font_family}-Bold' if font_family != 'Courier' else 'Courier-Bold'

        # Document title
        self.styles.add(ParagraphStyle(
            name='DocumentTitle',
            parent=self.styles['Heading1'],
            fontSize=self.template.title_font_size,
            textColor=PDFColor.rgb(*self.template.accent_color),
            alignment=TA_CENTER,
            spaceAfter=12,
            fontName=font_bold
        ))

        # Section headers
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=self.template.heading_font_size,
            textColor=PDFColor.rgb(0.2, 0.2, 0.2),
            spaceBefore=12,
            spaceAfter=6,
            fontName=font_bold
        ))

        # Normal text
        self.styles.add(ParagraphStyle(
            name='NormalText',
            parent=self.styles['Normal'],
            fontSize=self.template.body_font_size,
            textColor=PDFColor.rgb(0.2, 0.2, 0.2),
            fontName=font_family
        ))

        # Small text
        self.styles.add(ParagraphStyle(
            name='SmallText',
            parent=self.styles['Normal'],
            fontSize=self.template.body_font_size - 2,
            textColor=PDFColor.rgb(0.4, 0.4, 0.4),
            fontName=font_family
        ))

        # Right aligned
        self.styles.add(ParagraphStyle(
            name='RightAligned',
            parent=self.styles['Normal'],
            fontSize=self.template.body_font_size,
            alignment=TA_RIGHT,
            fontName=font_family
        ))

        # Bold text
        self.styles.add(ParagraphStyle(
            name='BoldText',
            parent=self.styles['Normal'],
            fontSize=self.template.body_font_size,
            fontName=font_bold
        ))

        # Footer style
        self.styles.add(ParagraphStyle(
            name='FooterText',
            parent=self.styles['Normal'],
            fontSize=self.template.footer_font_size,
            textColor=PDFColor.rgb(*self.template.footer_text_color),
            fontName=font_family
        ))

    def _download_image(self, url: str) -> Optional[str]:
        """Download image from URL and return temp file path"""
        try:
            # Create temp file
            fd, temp_path = tempfile.mkstemp(suffix='.png')
            os.close(fd)

            # Download image
            urllib.request.urlretrieve(url, temp_path)
            return temp_path
        except Exception as e:
            logger.warning(f"Failed to download image from {url}: {e}")
            return None

    def _add_header(self, canvas_obj, doc):
        """Add header to each page based on template settings"""
        if not self.template.header_enabled:
            return

        canvas_obj.saveState()

        # Header background
        bg_color = self.template.header_background_color
        if bg_color != (1.0, 1.0, 1.0):  # Don't draw white background
            canvas_obj.setFillColor(PDFColor.rgb(*bg_color))
            canvas_obj.rect(0, self.height - 20*mm, self.width, 20*mm, fill=True, stroke=False)

        # Colored accent bar at top
        canvas_obj.setFillColor(PDFColor.rgb(*self.template.accent_color))
        canvas_obj.rect(0, self.height - 5*mm, self.width, 5*mm, fill=True, stroke=False)

        # Header border
        if self.template.header_border_bottom:
            canvas_obj.setStrokeColor(PDFColor.rgb(*self.template.header_border_color))
            canvas_obj.setLineWidth(0.5)
            canvas_obj.line(0, self.height - 20*mm, self.width, self.height - 20*mm)

        canvas_obj.restoreState()

    def _add_footer(self, canvas_obj, doc):
        """Add footer to each page based on template settings"""
        if not self.template.footer_enabled:
            return

        canvas_obj.saveState()

        # Footer background
        bg_color = self.template.footer_background_color
        footer_y = 25*mm

        if bg_color != (1.0, 1.0, 1.0):  # Don't draw white background
            canvas_obj.setFillColor(PDFColor.rgb(*bg_color))
            canvas_obj.rect(0, 0, self.width, footer_y, fill=True, stroke=False)

        # Footer border
        if self.template.footer_border_top:
            canvas_obj.setStrokeColor(PDFColor.rgb(*self.template.footer_border_color))
            canvas_obj.setLineWidth(0.5)
            canvas_obj.line(0, footer_y, self.width, footer_y)

        # Footer text
        canvas_obj.setFont(self.template.font_family, self.template.footer_font_size)
        canvas_obj.setFillColor(PDFColor.rgb(*self.template.footer_text_color))

        footer_text = self.template.footer_text
        # Replace placeholders
        footer_text = footer_text.replace('{page}', str(doc.page))
        footer_text = footer_text.replace('{totalPages}', str(doc.page))  # Will be updated later

        text_y = 15*mm
        margin_x = self.template.page_margin_left * mm

        if self.template.footer_position == 'left':
            canvas_obj.drawString(margin_x, text_y, footer_text)
        elif self.template.footer_position == 'right':
            canvas_obj.drawRightString(self.width - margin_x, text_y, footer_text)
        else:  # center
            canvas_obj.drawCentredString(self.width / 2, text_y, footer_text)

        # Custom footer text
        if self.template.footer_custom_text:
            canvas_obj.drawCentredString(self.width / 2, text_y - 10, self.template.footer_custom_text)

        canvas_obj.restoreState()

    def _add_watermark(self, canvas_obj, doc):
        """Add watermark to page if enabled"""
        if not self.template.watermark_enabled or not self.template.watermark_text:
            return

        canvas_obj.saveState()

        # Set watermark properties
        opacity = self.template.watermark_opacity
        canvas_obj.setFillColor(PDFColor.rgb(0.5, 0.5, 0.5), alpha=opacity)
        canvas_obj.setFont(self.template.font_family, 60)

        # Rotate and draw watermark diagonally
        canvas_obj.translate(self.width / 2, self.height / 2)
        canvas_obj.rotate(45)
        canvas_obj.drawCentredString(0, 0, self.template.watermark_text)

        canvas_obj.restoreState()

    def _create_two_column_info_table(
        self,
        left_data: List[str],
        right_data: List[str],
        left_header: str = "DE / FROM",
        right_header: str = "À / TO"
    ) -> Table:
        """Create a two-column info table (e.g., org and customer info)"""
        data = []
        max_rows = max(len(left_data), len(right_data))

        # Headers
        data.append([
            Paragraph(f"<b>{left_header}</b>", self.styles['NormalText']),
            Paragraph(f"<b>{right_header}</b>", self.styles['NormalText'])
        ])

        # Data rows
        for i in range(max_rows):
            left_text = left_data[i] if i < len(left_data) else ""
            right_text = right_data[i] if i < len(right_data) else ""

            # Ensure values are strings, not None
            left_text = str(left_text) if left_text is not None else ""
            right_text = str(right_text) if right_text is not None else ""

            data.append([
                Paragraph(left_text, self.styles['NormalText']),
                Paragraph(right_text, self.styles['NormalText'])
            ])

        # Calculate column widths based on page margins
        available_width = self.width - (self.template.page_margin_left + self.template.page_margin_right) * mm
        col_width = available_width / 2

        table = Table(data, colWidths=[col_width, col_width])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BACKGROUND', (0, 0), (-1, 0), PDFColor.rgb(0.95, 0.95, 0.95)),
            ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
            ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
        ]))

        return table

    def _create_totals_table(
        self,
        subtotal: float,
        total_tax: float,
        total: float,
        currency: str = "MAD"
    ) -> Table:
        """Create totals summary table (right-aligned)"""
        totals_data = [
            ['Sous-total / Subtotal:', PDFFormatter.format_currency(subtotal, currency)],
            ['TVA / Tax:', PDFFormatter.format_currency(total_tax, currency)],
            ['<b>TOTAL:</b>', f"<b>{PDFFormatter.format_currency(total, currency)}</b>"],
        ]

        formatted_data = [
            [Paragraph(label, self.styles['NormalText']),
             Paragraph(value, self.styles['RightAligned'])]
            for label, value in totals_data
        ]

        table = Table(formatted_data, colWidths=[40*mm, 35*mm], hAlign='RIGHT')
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), f'{self.template.font_family}-Bold' if self.template.font_family != 'Courier' else 'Courier-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
            ('LINEABOVE', (0, -1), (-1, -1), 1.5, PDFColor.rgb(0.2, 0.2, 0.2)),
        ]))

        return table

    # Abstract methods that must be implemented by subclasses

    @abstractmethod
    def get_document_title(self) -> str:
        """Return the document title (e.g., 'DEVIS / QUOTE')"""
        pass

    @abstractmethod
    def get_document_number(self) -> str:
        """Return the document number/reference"""
        pass

    @abstractmethod
    def build_document_elements(self) -> List:
        """Build and return all document elements (title, content, etc.)"""
        pass

    # Main generation method

    def generate(self) -> bytes:
        """Generate the PDF and return as bytes"""
        try:
            # Create document with template-based margins
            doc = SimpleDocTemplate(
                self.buffer,
                pagesize=A4,
                rightMargin=self.template.page_margin_right * mm,
                leftMargin=self.template.page_margin_left * mm,
                topMargin=(self.template.page_margin_top + 10) * mm,  # Extra space for header
                bottomMargin=(self.template.page_margin_bottom + 10) * mm  # Extra space for footer
            )

            # Build document elements
            elements = self.build_document_elements()

            # Build PDF
            doc.build(
                elements,
                onFirstPage=self._on_page,
                onLaterPages=self._on_page,
            )

            # Get PDF bytes
            pdf_bytes = self.buffer.getvalue()
            self.buffer.close()

            return pdf_bytes

        except Exception as e:
            logger.error(f"PDF generation error: {str(e)}")
            raise

    def _on_page(self, canvas_obj, doc):
        """Called on each page to add header, footer, and watermark"""
        self._add_watermark(canvas_obj, doc)
        self._add_header(canvas_obj, doc)
        self._add_footer(canvas_obj, doc)


class ItemizedDocumentGenerator(BasePDFGenerator):
    """
    Base class for documents with itemized line items
    (Quotes, Invoices, Purchase Orders, etc.)
    """

    @abstractmethod
    def get_items(self) -> List[Dict[str, Any]]:
        """Return list of line items"""
        pass

    @abstractmethod
    def get_customer_info(self) -> List[str]:
        """Return customer information lines"""
        pass

    def get_organization_info(self) -> List[str]:
        """Return organization information lines"""
        # Helper to safely convert to string, handling None
        def safe_str(value, default=''):
            return str(value) if value is not None else default

        name = safe_str(self.organization.get('name'), '')
        address = safe_str(self.organization.get('address'))
        city = safe_str(self.organization.get('city'))
        postal_code = safe_str(self.organization.get('postal_code'))
        country = safe_str(self.organization.get('country'))
        email = safe_str(self.organization.get('email'))
        phone = safe_str(self.organization.get('phone'))

        org_info = [f"<b>{name}</b>"] if name else []

        if address:
            org_info.append(address)

        city_postal = f"{city} {postal_code}".strip()
        if city_postal:
            org_info.append(city_postal)

        if country:
            org_info.append(country)

        if email:
            org_info.append(f"Email: {email}")

        if phone:
            org_info.append(f"Tel: {phone}")

        if self.template.show_tax_id:
            tax_id = safe_str(self.organization.get('tax_id'))
            if tax_id:
                org_info.append(f"Tax ID: {tax_id}")

        return org_info

    def build_title_section(self) -> List:
        """Build document title section"""
        elements = []

        # Spacer for header bar
        elements.append(Spacer(1, 15*mm))

        # Title
        title = Paragraph(self.get_document_title(), self.styles['DocumentTitle'])
        elements.append(title)
        elements.append(Spacer(1, 5*mm))

        # Document number and date
        doc_info = f"<b>N° {self.get_document_number()}</b>"
        if self.document.get('issue_date'):
            doc_info += f" | Date: {PDFFormatter.format_date(self.document['issue_date'])}"

        elements.append(Paragraph(doc_info, self.styles['NormalText']))
        elements.append(Spacer(1, 10*mm))

        return elements

    def build_info_section(self) -> List:
        """Build organization and customer info section"""
        elements = []

        org_info = self.get_organization_info()
        customer_info = self.get_customer_info()

        info_table = self._create_two_column_info_table(org_info, customer_info)
        elements.append(info_table)
        elements.append(Spacer(1, 10*mm))

        return elements

    def build_items_table(self, headers: List[str], column_widths: List[float]) -> List:
        """Build items table with customizable headers and columns"""
        elements = []

        data = [headers]
        items = self.get_items()

        # Add item rows (must be implemented by subclass via get_items)
        for idx, item in enumerate(items, 1):
            row = self.format_item_row(idx, item)
            data.append(row)

        # Create table
        table = Table(data, colWidths=column_widths)

        # Style the table using template colors
        table_style = [
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), PDFColor.rgb(*self.template.table_header_bg_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), PDFColor.rgb(*self.template.table_header_text_color)),
            ('FONTNAME', (0, 0), (-1, 0), f'{self.template.font_family}-Bold' if self.template.font_family != 'Courier' else 'Courier-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), self.template.body_font_size),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

            # Body styling
            ('FONTNAME', (0, 1), (-1, -1), self.template.font_family),
            ('FONTSIZE', (0, 1), (-1, -1), self.template.body_font_size - 1),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # First column
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

            # Grid with template border color
            ('GRID', (0, 0), (-1, -1), 0.5, PDFColor.rgb(*self.template.table_border_color)),

            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
            ('LEFTPADDING', (0, 0), (-1, -1), 1.5*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 1.5*mm),
        ]

        # Add alternating row colors
        alt_color = self.template.table_row_alt_color
        for i in range(1, len(data)):
            if i % 2 == 0:
                table_style.append(('BACKGROUND', (0, i), (-1, i), PDFColor.rgb(*alt_color)))

        table.setStyle(TableStyle(table_style))
        elements.append(table)
        elements.append(Spacer(1, 10*mm))

        return elements

    @abstractmethod
    def format_item_row(self, index: int, item: Dict[str, Any]) -> List[str]:
        """Format a single item row for the table"""
        pass

    def build_totals_section(self) -> List:
        """Build totals section"""
        elements = []

        currency = self.organization.get('currency', 'MAD')
        totals_table = self._create_totals_table(
            self.document['subtotal'],
            self.document['total_tax'],
            self.document['total'],
            currency
        )

        elements.append(totals_table)
        elements.append(Spacer(1, 10*mm))

        return elements

    def build_notes_section(self, field_name: str = 'notes', title: str = 'NOTES') -> List:
        """Build notes/remarks section"""
        elements = []

        if not self.template.show_notes:
            return elements

        if self.document.get(field_name):
            elements.append(Paragraph(title, self.styles['SectionHeader']))
            notes_text = self.document[field_name].replace('\n', '<br/>')
            elements.append(Paragraph(notes_text, self.styles['NormalText']))
            elements.append(Spacer(1, 5*mm))

        return elements

    def build_terms_section(self) -> List:
        """Build terms and conditions section"""
        elements = []

        if not self.template.show_terms:
            return elements

        # Use template custom terms if available, otherwise use document terms
        terms_text = self.template.terms_content or self.document.get('terms_conditions')

        if terms_text:
            elements.append(Paragraph(
                "CONDITIONS GÉNÉRALES / TERMS & CONDITIONS",
                self.styles['SectionHeader']
            ))
            terms_text = terms_text.replace('\n', '<br/>')
            elements.append(Paragraph(terms_text, self.styles['NormalText']))
            elements.append(Spacer(1, 5*mm))

        return elements

    def build_payment_info_section(self) -> List:
        """Build payment information section"""
        elements = []

        if not self.template.show_payment_info:
            return elements

        # Payment terms from template
        if self.template.payment_terms_content:
            elements.append(Paragraph(
                "CONDITIONS DE PAIEMENT / PAYMENT TERMS",
                self.styles['SectionHeader']
            ))
            payment_text = self.template.payment_terms_content.replace('\n', '<br/>')
            elements.append(Paragraph(payment_text, self.styles['NormalText']))
            elements.append(Spacer(1, 5*mm))

        return elements

    def build_bank_details_section(self) -> List:
        """Build bank details section"""
        elements = []

        if not self.template.show_bank_details:
            return elements

        if self.template.bank_details_content:
            elements.append(Paragraph(
                "COORDONNÉES BANCAIRES / BANK DETAILS",
                self.styles['SectionHeader']
            ))
            bank_text = self.template.bank_details_content.replace('\n', '<br/>')
            elements.append(Paragraph(bank_text, self.styles['NormalText']))
            elements.append(Spacer(1, 5*mm))

        return elements
