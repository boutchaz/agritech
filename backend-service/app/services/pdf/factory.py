"""
PDF Generator Factory
Central factory for creating PDF generators for different document types
"""

from typing import Dict, Any, Optional
from .base import BasePDFGenerator, DocumentTemplate
from .quote import QuotePDFGenerator
from .invoice import InvoicePDFGenerator


class PDFGeneratorFactory:
    """
    Factory for creating PDF generators
    Supports multiple document types with consistent interface
    """

    # Registry of document types and their generators
    _generators = {
        'quote': QuotePDFGenerator,
        'invoice': InvoicePDFGenerator,
        # Future additions:
        # 'receipt': ReceiptPDFGenerator,
        # 'purchase_order': PurchaseOrderPDFGenerator,
        # 'delivery_note': DeliveryNotePDFGenerator,
        # 'credit_note': CreditNotePDFGenerator,
        # 'report': ReportPDFGenerator,
    }

    @classmethod
    def create(
        cls,
        document_type: str,
        document_data: Dict[str, Any],
        organization: Dict[str, Any],
        template: Optional[Dict[str, Any]] = None
    ) -> BasePDFGenerator:
        """
        Create a PDF generator for the specified document type

        Args:
            document_type: Type of document ('quote', 'invoice', etc.)
            document_data: Document data including items
            organization: Organization information
            template: Optional template customization

        Returns:
            Instance of appropriate PDF generator

        Raises:
            ValueError: If document_type is not supported
        """
        if document_type not in cls._generators:
            raise ValueError(
                f"Unsupported document type: {document_type}. "
                f"Supported types: {', '.join(cls._generators.keys())}"
            )

        generator_class = cls._generators[document_type]
        template_obj = DocumentTemplate(template) if template else None

        return generator_class(document_data, organization, template_obj)

    @classmethod
    def generate_pdf(
        cls,
        document_type: str,
        document_data: Dict[str, Any],
        organization: Dict[str, Any],
        template: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Convenience method to create generator and generate PDF in one call

        Args:
            document_type: Type of document ('quote', 'invoice', etc.)
            document_data: Document data including items
            organization: Organization information
            template: Optional template customization

        Returns:
            PDF as bytes

        Raises:
            ValueError: If document_type is not supported
        """
        generator = cls.create(document_type, document_data, organization, template)
        return generator.generate()

    @classmethod
    def register_generator(cls, document_type: str, generator_class: type):
        """
        Register a custom PDF generator

        Args:
            document_type: Type identifier for the document
            generator_class: Class that extends BasePDFGenerator

        Example:
            PDFGeneratorFactory.register_generator('receipt', ReceiptPDFGenerator)
        """
        if not issubclass(generator_class, BasePDFGenerator):
            raise TypeError(
                f"Generator class must extend BasePDFGenerator, "
                f"got {generator_class.__name__}"
            )

        cls._generators[document_type] = generator_class

    @classmethod
    def get_supported_types(cls) -> list:
        """Get list of supported document types"""
        return list(cls._generators.keys())

    @classmethod
    def is_supported(cls, document_type: str) -> bool:
        """Check if a document type is supported"""
        return document_type in cls._generators
