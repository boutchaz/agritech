"""
Base PDF Generator Classes
Provides generic infrastructure for all PDF document types
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)


class PDFColor:
    """Color utilities for PDF generation"""

    @staticmethod
    def hex_to_rgb(hex_color: str) -> Tuple[float, float, float]:
        """Convert hex color to RGB tuple (0-1 range)"""
        if not hex_color:
            return (0.06, 0.73, 0.51)  # Default green

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
    Template configuration for document styling
    Can be loaded from database or provided as dict
    """

    def __init__(self, data: Optional[Dict[str, Any]] = None):
        self.data = data or {}

    @property
    def accent_color(self) -> Tuple[float, float, float]:
        """Get accent color as RGB tuple"""
        hex_color = self.data.get('accent_color', '#10B981')
        return PDFColor.hex_to_rgb(hex_color)

    @property
    def header_color(self) -> Tuple[float, float, float]:
        """Get header color as RGB tuple"""
        hex_color = self.data.get('header_color')
        return PDFColor.hex_to_rgb(hex_color) if hex_color else self.accent_color

    @property
    def footer_text(self) -> str:
        """Get custom footer text"""
        return self.data.get('footer_text', 'Thank you for your business!')

    @property
    def show_tax_id(self) -> bool:
        """Should show tax ID in organization info"""
        return self.data.get('show_tax_id', True)

    @property
    def show_terms(self) -> bool:
        """Should show terms and conditions section"""
        return self.data.get('show_terms', True)

    @property
    def logo_url(self) -> Optional[str]:
        """Get logo URL if configured"""
        return self.data.get('logo_url')

    @property
    def font_family(self) -> str:
        """Get font family preference"""
        return self.data.get('font_family', 'Helvetica')


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

        # Setup custom styles
        self._setup_styles()

    def _setup_styles(self):
        """Setup custom paragraph styles"""
        # Document title
        self.styles.add(ParagraphStyle(
            name='DocumentTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=PDFColor.rgb(*self.template.accent_color),
            alignment=TA_CENTER,
            spaceAfter=12
        ))

        # Section headers
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=11,
            textColor=PDFColor.rgb(0.2, 0.2, 0.2),
            spaceBefore=12,
            spaceAfter=6,
            fontName='Helvetica-Bold'
        ))

        # Normal text
        self.styles.add(ParagraphStyle(
            name='NormalText',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=PDFColor.rgb(0.2, 0.2, 0.2)
        ))

        # Small text
        self.styles.add(ParagraphStyle(
            name='SmallText',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=PDFColor.rgb(0.4, 0.4, 0.4)
        ))

        # Right aligned
        self.styles.add(ParagraphStyle(
            name='RightAligned',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_RIGHT
        ))

        # Bold text
        self.styles.add(ParagraphStyle(
            name='BoldText',
            parent=self.styles['Normal'],
            fontSize=10,
            fontName='Helvetica-Bold'
        ))

    def _add_header(self, canvas_obj, doc):
        """Add header to each page"""
        canvas_obj.saveState()

        # Colored header bar
        canvas_obj.setFillColor(PDFColor.rgb(*self.template.header_color))
        canvas_obj.rect(0, self.height - 15*mm, self.width, 15*mm, fill=True, stroke=False)

        canvas_obj.restoreState()

    def _add_footer(self, canvas_obj, doc):
        """Add footer to each page"""
        canvas_obj.saveState()

        # Footer text
        canvas_obj.setFont('Helvetica', 8)
        canvas_obj.setFillColor(PDFColor.rgb(0.4, 0.4, 0.4))
        canvas_obj.drawCentredString(
            self.width / 2,
            20*mm,
            self.template.footer_text
        )

        # Page number
        page_num = f"Page {doc.page}"
        canvas_obj.drawRightString(self.width - 20*mm, 20*mm, page_num)

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
            data.append([
                Paragraph(left_text, self.styles['NormalText']),
                Paragraph(right_text, self.styles['NormalText'])
            ])

        table = Table(data, colWidths=[90*mm, 90*mm])
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
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
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
            # Create document
            doc = SimpleDocTemplate(
                self.buffer,
                pagesize=A4,
                rightMargin=20*mm,
                leftMargin=20*mm,
                topMargin=25*mm,
                bottomMargin=25*mm
            )

            # Build document elements
            elements = self.build_document_elements()

            # Build PDF
            doc.build(
                elements,
                onFirstPage=self._add_header,
                onLaterPages=self._add_header,
                canvasmaker=lambda *args, **kwargs: self._create_canvas(doc, *args, **kwargs)
            )

            # Get PDF bytes
            pdf_bytes = self.buffer.getvalue()
            self.buffer.close()

            return pdf_bytes

        except Exception as e:
            logger.error(f"PDF generation error: {str(e)}")
            raise

    def _create_canvas(self, doc, *args, **kwargs):
        """Create custom canvas with footer"""
        c = canvas.Canvas(*args, **kwargs)
        original_showPage = c.showPage

        def custom_showPage():
            self._add_footer(c, doc)
            original_showPage()

        c.showPage = custom_showPage
        return c


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
        org_info = [
            f"<b>{self.organization['name']}</b>",
            self.organization.get('address', ''),
            f"{self.organization.get('city', '')} {self.organization.get('postal_code', '')}",
            self.organization.get('country', ''),
            f"Email: {self.organization.get('email', '')}",
            f"Tel: {self.organization.get('phone', '')}",
        ]

        if self.template.show_tax_id and self.organization.get('tax_id'):
            org_info.append(f"Tax ID: {self.organization['tax_id']}")

        return org_info

    def build_title_section(self) -> List:
        """Build document title section"""
        elements = []

        # Spacer for header bar
        elements.append(Spacer(1, 20*mm))

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

        # Style the table
        table_style = [
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), PDFColor.rgb(*self.template.accent_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

            # Body styling
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # First column
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, PDFColor.rgb(0.8, 0.8, 0.8)),

            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
            ('LEFTPADDING', (0, 0), (-1, -1), 1.5*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 1.5*mm),
        ]

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

        if self.document.get(field_name):
            elements.append(Paragraph(title, self.styles['SectionHeader']))
            notes_text = self.document[field_name].replace('\n', '<br/>')
            elements.append(Paragraph(notes_text, self.styles['NormalText']))
            elements.append(Spacer(1, 5*mm))

        return elements

    def build_terms_section(self) -> List:
        """Build terms and conditions section"""
        elements = []

        if self.template.show_terms and self.document.get('terms_conditions'):
            elements.append(Paragraph(
                "CONDITIONS GÉNÉRALES / TERMS & CONDITIONS",
                self.styles['SectionHeader']
            ))

            terms_text = self.document['terms_conditions'].replace('\n', '<br/>')
            elements.append(Paragraph(terms_text, self.styles['NormalText']))
            elements.append(Spacer(1, 5*mm))

        return elements
