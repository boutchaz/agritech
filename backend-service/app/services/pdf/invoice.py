"""
Invoice PDF Generator
Generates professional invoice documents
"""

from typing import Dict, List, Any
from .base import ItemizedDocumentGenerator, PDFFormatter
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Spacer


class InvoicePDFGenerator(ItemizedDocumentGenerator):
    """Generate Invoice PDF documents"""

    def get_document_title(self) -> str:
        """Return the document title"""
        return "FACTURE / INVOICE"

    def get_document_number(self) -> str:
        """Return the invoice number"""
        return self.document['invoice_number']

    def get_items(self) -> List[Dict[str, Any]]:
        """Return invoice items"""
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
        customer_tax_id = safe_str(self.document.get('customer_tax_id'))
        
        customer_info = [f"<b>{customer_name}</b>"] if customer_name else []

        if customer_address:
            customer_info.append(customer_address)

        if customer_email:
            customer_info.append(f"Email: {customer_email}")

        if customer_phone:
            customer_info.append(f"Tel: {customer_phone}")

        if customer_tax_id:
            customer_info.append(f"Tax ID: {customer_tax_id}")

        return customer_info

    def format_item_row(self, index: int, item: Dict[str, Any]) -> List[str]:
        """Format a single invoice item row"""
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

    def build_payment_info_section(self) -> List:
        """Build payment information section (specific to invoices)"""
        elements = []

        if self.document.get('payment_terms') or self.document.get('due_date'):
            elements.append(Paragraph(
                "INFORMATIONS DE PAIEMENT / PAYMENT INFORMATION",
                self.styles['SectionHeader']
            ))

            payment_info = []

            if self.document.get('due_date'):
                payment_info.append(
                    f"<b>Date d'échéance / Due Date:</b> {PDFFormatter.format_date(self.document['due_date'])}"
                )

            if self.document.get('payment_terms'):
                payment_info.append(
                    f"<b>Conditions de paiement / Payment Terms:</b> {self.document['payment_terms']}"
                )

            if self.document.get('payment_method'):
                payment_info.append(
                    f"<b>Mode de paiement / Payment Method:</b> {self.document['payment_method']}"
                )

            # Outstanding amount (if invoice is partially paid)
            if self.document.get('outstanding_amount') is not None:
                currency = self.organization.get('currency', 'MAD')
                outstanding = self.document['outstanding_amount']
                if outstanding > 0:
                    payment_info.append(
                        f"<b>Montant dû / Amount Due:</b> {PDFFormatter.format_currency(outstanding, currency)}"
                    )
                elif outstanding == 0:
                    payment_info.append(
                        "<b><font color='green'>PAYÉ / PAID</font></b>"
                    )

            for info in payment_info:
                elements.append(Paragraph(info, self.styles['NormalText']))

            elements.append(Spacer(1, 5*mm))

        return elements

    def build_status_badge(self) -> List:
        """Build status badge for invoice"""
        elements = []

        status = self.document.get('status', 'draft')
        status_colors = {
            'draft': '#9CA3AF',      # Gray
            'sent': '#3B82F6',       # Blue
            'paid': '#10B981',       # Green
            'overdue': '#EF4444',    # Red
            'cancelled': '#6B7280'   # Dark gray
        }

        status_labels = {
            'draft': 'BROUILLON / DRAFT',
            'sent': 'ENVOYÉ / SENT',
            'paid': 'PAYÉ / PAID',
            'overdue': 'EN RETARD / OVERDUE',
            'cancelled': 'ANNULÉ / CANCELLED'
        }

        if status in status_labels:
            color = status_colors.get(status, '#9CA3AF')
            label = status_labels[status]
            status_text = f"<b><font color='{color}'>{label}</font></b>"
            elements.append(Paragraph(status_text, self.styles['NormalText']))
            elements.append(Spacer(1, 5*mm))

        return elements

    def build_document_elements(self) -> List:
        """Build all invoice document elements"""
        elements = []

        # Title section
        elements.extend(self.build_title_section())

        # Status badge
        elements.extend(self.build_status_badge())

        # Info section (organization and customer)
        elements.extend(self.build_info_section())

        # Items table
        headers = ['#', 'Article / Item', 'Qté', 'Prix Unit.', 'Montant', 'TVA', 'Total']
        column_widths = [10*mm, 65*mm, 15*mm, 25*mm, 25*mm, 20*mm, 25*mm]
        elements.extend(self.build_items_table(headers, column_widths))

        # Totals
        elements.extend(self.build_totals_section())

        # Payment information
        elements.extend(self.build_payment_info_section())

        # Terms and conditions
        elements.extend(self.build_terms_section())

        # Notes
        elements.extend(self.build_notes_section())

        return elements
