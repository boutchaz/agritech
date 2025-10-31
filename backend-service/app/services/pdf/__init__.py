"""
PDF Generation Service
Provides generic PDF generation for multiple document types
"""

from .base import (
    BasePDFGenerator,
    ItemizedDocumentGenerator,
    DocumentTemplate,
    PDFColor,
    PDFFormatter
)
from .quote import QuotePDFGenerator
from .invoice import InvoicePDFGenerator
from .factory import PDFGeneratorFactory

__all__ = [
    'BasePDFGenerator',
    'ItemizedDocumentGenerator',
    'DocumentTemplate',
    'PDFColor',
    'PDFFormatter',
    'QuotePDFGenerator',
    'InvoicePDFGenerator',
    'PDFGeneratorFactory',
]
