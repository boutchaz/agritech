"""
Purchase Order PDF Generator
Generates professional purchase order documents
"""

from typing import Dict, List, Any
from .base import ItemizedDocumentGenerator, PDFFormatter
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Spacer


class PurchaseOrderPDFGenerator(ItemizedDocumentGenerator):
    """Generate Purchase Order PDF documents"""

    def get_document_title(self) -> str:
        """Return the document title"""
        return "BON DE COMMANDE / PURCHASE ORDER"

    def get_document_number(self) -> str:
        """Return the purchase order number"""
        return self.document['po_number']

    def get_items(self) -> List[Dict[str, Any]]:
        """Return purchase order items"""
        return self.document.get('items', [])

    def get_customer_info(self) -> List[str]:
        """Return supplier information (for purchase orders, supplier is in the 'to' position)"""
        # Helper to safely convert to string, handling None
        def safe_str(value, default=''):
            return str(value) if value is not None else default
        
        supplier_name = safe_str(self.document.get('supplier_name'))
        delivery_address = safe_str(self.document.get('delivery_address'))
        contact_email = safe_str(self.document.get('contact_email'))
        contact_phone = safe_str(self.document.get('contact_phone'))
        supplier_quote_ref = safe_str(self.document.get('supplier_quote_ref'))
        
        supplier_info = [f"<b>{supplier_name}</b>"] if supplier_name else []

        if delivery_address:
            supplier_info.append(delivery_address)

        if contact_email:
            supplier_info.append(f"Email: {contact_email}")

        if contact_phone:
            supplier_info.append(f"Tel: {contact_phone}")

        if supplier_quote_ref:
            supplier_info.append(f"Ref: {supplier_quote_ref}")

        return supplier_info

    def format_item_row(self, index: int, item: Dict[str, Any]) -> List[str]:
        """Format a single purchase order item row"""
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

    def build_delivery_info_section(self) -> List:
        """Build delivery information section (specific to purchase orders)"""
        elements = []

        if self.document.get('expected_delivery_date') or self.document.get('delivery_terms'):
            elements.append(Paragraph(
                "INFORMATIONS DE LIVRAISON / DELIVERY INFORMATION",
                self.styles['SectionHeader']
            ))

            delivery_info = []

            if self.document.get('expected_delivery_date'):
                delivery_info.append(
                    f"<b>Date de livraison prévue / Expected Delivery Date:</b> {PDFFormatter.format_date(self.document['expected_delivery_date'])}"
                )

            if self.document.get('delivery_terms'):
                delivery_info.append(
                    f"<b>Conditions de livraison / Delivery Terms:</b> {self.document['delivery_terms']}"
                )

            if self.document.get('delivery_address'):
                delivery_info.append(
                    f"<b>Adresse de livraison / Delivery Address:</b> {self.document['delivery_address']}"
                )

            for info in delivery_info:
                elements.append(Paragraph(info, self.styles['NormalText']))

            elements.append(Spacer(1, 5*mm))

        return elements

    def build_status_badge(self) -> List:
        """Build status badge for purchase order"""
        elements = []

        status = self.document.get('status', 'draft')
        status_colors = {
            'draft': '#9CA3AF',          # Gray
            'submitted': '#3B82F6',      # Blue
            'confirmed': '#10B981',       # Green
            'partially_received': '#F59E0B',  # Amber
            'received': '#10B981',       # Green
            'partially_billed': '#F59E0B',    # Amber
            'billed': '#10B981',         # Green
            'cancelled': '#6B7280'       # Dark gray
        }

        status_labels = {
            'draft': 'BROUILLON / DRAFT',
            'submitted': 'SOUMIS / SUBMITTED',
            'confirmed': 'CONFIRMÉ / CONFIRMED',
            'partially_received': 'PARTIELLEMENT REÇU / PARTIALLY RECEIVED',
            'received': 'REÇU / RECEIVED',
            'partially_billed': 'PARTIELLEMENT FACTURÉ / PARTIALLY BILLED',
            'billed': 'FACTURÉ / BILLED',
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
        """Build all purchase order document elements"""
        elements = []

        # Title section
        elements.extend(self.build_title_section())

        # Status badge
        elements.extend(self.build_status_badge())

        # Info section (organization and supplier)
        # For purchase orders, organization is on the left (FROM), supplier on the right (TO)
        elements.extend(self.build_info_section())

        # Expected delivery date (specific to purchase orders)
        if self.document.get('expected_delivery_date'):
            delivery_text = f"<b>Date de livraison prévue / Expected Delivery Date:</b> {PDFFormatter.format_date(self.document['expected_delivery_date'])}"
            elements.append(Paragraph(delivery_text, self.styles['NormalText']))
            elements.append(Spacer(1, 5*mm))

        # Items table
        headers = ['#', 'Article / Item', 'Qté', 'Prix Unit.', 'Montant', 'TVA', 'Total']
        column_widths = [10*mm, 65*mm, 15*mm, 25*mm, 25*mm, 20*mm, 25*mm]
        elements.extend(self.build_items_table(headers, column_widths))

        # Totals
        elements.extend(self.build_totals_section())

        # Delivery information
        elements.extend(self.build_delivery_info_section())

        # Terms and conditions
        elements.extend(self.build_terms_section())

        # Notes
        elements.extend(self.build_notes_section())

        return elements

