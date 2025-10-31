"""
Quote PDF Generator
Generates professional quote documents
"""

from typing import Dict, List, Any
from .base import ItemizedDocumentGenerator, PDFFormatter
from reportlab.lib.units import mm


class QuotePDFGenerator(ItemizedDocumentGenerator):
    """Generate Quote PDF documents"""

    def get_document_title(self) -> str:
        """Return the document title"""
        return "DEVIS / QUOTE"

    def get_document_number(self) -> str:
        """Return the quote number"""
        return self.document['quote_number']

    def get_items(self) -> List[Dict[str, Any]]:
        """Return quote items"""
        return self.document.get('items', [])

    def get_customer_info(self) -> List[str]:
        """Return customer information"""
        # Helper to safely convert to string, handling None
        def safe_str(value, default=''):
            return str(value) if value is not None else default
        
        customer_name = safe_str(self.document.get('customer_name'))
        customer_address = safe_str(self.document.get('customer_address'))
        customer_email = safe_str(self.document.get('customer_email'))
        customer_phone = safe_str(self.document.get('customer_phone'))
        
        customer_info = [f"<b>{customer_name}</b>"] if customer_name else []

        if customer_address:
            customer_info.append(customer_address)

        if customer_email:
            customer_info.append(f"Email: {customer_email}")

        if customer_phone:
            customer_info.append(f"Tel: {customer_phone}")

        return customer_info

    def format_item_row(self, index: int, item: Dict[str, Any]) -> List[str]:
        """Format a single quote item row"""
        currency = self.organization.get('currency', 'MAD')

        return [
            str(index),
            item['item_name'],
            str(item['quantity']),
            PDFFormatter.format_currency(item['rate'], currency),
            PDFFormatter.format_currency(item['amount'], currency),
            PDFFormatter.format_currency(item['tax_amount'], currency),
            PDFFormatter.format_currency(item['amount'] + item['tax_amount'], currency)
        ]

    def build_document_elements(self) -> List:
        """Build all quote document elements"""
        elements = []

        # Title section
        elements.extend(self.build_title_section())

        # Info section (organization and customer)
        elements.extend(self.build_info_section())

        # Expiry date (specific to quotes)
        if self.document.get('expiry_date'):
            from reportlab.platypus import Paragraph
            expiry_text = f"<b>Valide jusqu'au / Valid until:</b> {PDFFormatter.format_date(self.document['expiry_date'])}"
            elements.append(Paragraph(expiry_text, self.styles['NormalText']))
            from reportlab.platypus import Spacer
            elements.append(Spacer(1, 5*mm))

        # Items table
        headers = ['#', 'Article / Item', 'Qté', 'Prix Unit.', 'Montant', 'TVA', 'Total']
        column_widths = [10*mm, 65*mm, 15*mm, 25*mm, 25*mm, 20*mm, 25*mm]
        elements.extend(self.build_items_table(headers, column_widths))

        # Totals
        elements.extend(self.build_totals_section())

        # Terms and conditions
        elements.extend(self.build_terms_section())

        # Notes
        elements.extend(self.build_notes_section())

        return elements
