# Generic PDF Generation Service

## Overview

The PDF generation service provides a flexible, extensible architecture for generating professional PDFs for multiple document types across the AgriTech platform. Built on ReportLab (100% open source), it supports quotes, invoices, and can be easily extended for additional document types.

## Architecture

### Design Principles

1. **Single Responsibility**: Each document type has its own generator class
2. **Open/Closed**: Easy to extend with new document types without modifying existing code
3. **DRY (Don't Repeat Yourself)**: Common functionality in base classes
4. **Factory Pattern**: Centralized document creation via `PDFGeneratorFactory`
5. **Template Support**: Customizable styling per organization

### Class Hierarchy

```
BasePDFGenerator (Abstract)
├── Common infrastructure (header, footer, styles, canvas)
├── Template support
└── Abstract methods: get_document_title(), build_document_elements()

ItemizedDocumentGenerator (Abstract, extends BasePDFGenerator)
├── Line item table generation
├── Organization/customer info sections
├── Totals calculation
└── Abstract methods: get_items(), format_item_row(), get_customer_info()

QuotePDFGenerator (Concrete, extends ItemizedDocumentGenerator)
├── Quote-specific formatting
├── Expiry date display
└── "DEVIS / QUOTE" title

InvoicePDFGenerator (Concrete, extends ItemizedDocumentGenerator)
├── Invoice-specific formatting
├── Payment information section
├── Status badge display
└── "FACTURE / INVOICE" title
```

## File Structure

```
backend-service/app/services/pdf/
├── __init__.py           # Package exports
├── base.py               # Base classes and utilities
├── factory.py            # PDFGeneratorFactory
├── quote.py              # QuotePDFGenerator
└── invoice.py            # InvoicePDFGenerator
```

## Core Components

### 1. Base Classes (`base.py`)

#### `BasePDFGenerator`

Abstract base class for all PDF generators.

**Responsibilities**:
- PDF document setup (A4, margins, metadata)
- Header/footer rendering
- Style management
- Canvas creation
- Template integration

**Key Methods**:
```python
def generate() -> bytes:
    """Generate PDF and return as bytes"""

@abstractmethod
def get_document_title() -> str:
    """Return document title (e.g., 'DEVIS / QUOTE')"""

@abstractmethod
def build_document_elements() -> List:
    """Build all document elements"""
```

#### `ItemizedDocumentGenerator`

Base class for documents with line items (quotes, invoices, POs, etc.).

**Responsibilities**:
- Title section generation
- Organization/customer info tables
- Line items table with customizable columns
- Totals section
- Terms & conditions
- Notes section

**Key Methods**:
```python
def build_title_section() -> List:
    """Build document title with number and date"""

def build_info_section() -> List:
    """Build org and customer info (two columns)"""

def build_items_table(headers, column_widths) -> List:
    """Build line items table"""

def build_totals_section() -> List:
    """Build subtotal, tax, and total"""

@abstractmethod
def get_items() -> List[Dict]:
    """Return list of line items"""

@abstractmethod
def format_item_row(index, item) -> List[str]:
    """Format single item row"""

@abstractmethod
def get_customer_info() -> List[str]:
    """Return customer information lines"""
```

#### Utility Classes

**`PDFColor`**: Color conversion utilities
```python
PDFColor.hex_to_rgb('#10B981')  # → (0.06, 0.73, 0.51)
PDFColor.rgb(0.2, 0.2, 0.2)     # → ReportLab Color object
```

**`PDFFormatter`**: Common formatting
```python
PDFFormatter.format_currency(1234.56, 'MAD')  # → "1,234.56 MAD"
PDFFormatter.format_date('2024-01-15')        # → "15/01/2024"
PDFFormatter.truncate_text(text, 50)          # → "text..."
```

**`DocumentTemplate`**: Template configuration
```python
template = DocumentTemplate({
    'accent_color': '#10B981',
    'footer_text': 'Thank you!',
    'show_tax_id': True,
    'show_terms': True
})

template.accent_color        # → (0.06, 0.73, 0.51)
template.footer_text         # → "Thank you!"
```

### 2. Factory Pattern (`factory.py`)

#### `PDFGeneratorFactory`

Central factory for creating PDF generators.

**Usage**:
```python
# Method 1: Create generator instance
generator = PDFGeneratorFactory.create(
    document_type='quote',
    document_data=quote_dict,
    organization=org_dict,
    template=template_dict  # Optional
)
pdf_bytes = generator.generate()

# Method 2: Generate PDF directly (convenience method)
pdf_bytes = PDFGeneratorFactory.generate_pdf(
    document_type='quote',
    document_data=quote_dict,
    organization=org_dict,
    template=template_dict  # Optional
)
```

**Supported Methods**:
```python
# Get list of supported document types
types = PDFGeneratorFactory.get_supported_types()
# → ['quote', 'invoice']

# Check if type is supported
is_supported = PDFGeneratorFactory.is_supported('quote')
# → True

# Register custom generator
PDFGeneratorFactory.register_generator('receipt', ReceiptPDFGenerator)
```

### 3. Document Generators

#### `QuotePDFGenerator` (`quote.py`)

Generates professional quote PDFs.

**Document Structure**:
1. Header bar (accent color)
2. Title: "DEVIS / QUOTE"
3. Quote number + issue date
4. Expiry date (if set)
5. Organization info (left) | Customer info (right)
6. Line items table
7. Totals (subtotal, tax, total)
8. Terms & conditions (optional)
9. Notes (optional)
10. Footer with custom text + page number

**Required Data**:
```python
quote = {
    'quote_number': 'Q-2024-001',
    'issue_date': '2024-01-15',
    'expiry_date': '2024-02-15',  # Optional
    'customer_name': 'John Doe',
    'customer_email': 'john@example.com',
    'customer_phone': '+212 6 12 34 56 78',
    'customer_address': '123 Street, City',
    'subtotal': 1000.00,
    'total_tax': 200.00,
    'total': 1200.00,
    'notes': 'Optional notes',  # Optional
    'terms_conditions': 'Payment within 30 days',  # Optional
    'items': [
        {
            'item_name': 'Product A',
            'quantity': 10,
            'rate': 100.00,
            'amount': 1000.00,
            'tax_amount': 200.00
        }
    ]
}
```

#### `InvoicePDFGenerator` (`invoice.py`)

Generates professional invoice PDFs.

**Document Structure**:
1. Header bar (accent color)
2. Title: "FACTURE / INVOICE"
3. Invoice number + issue date
4. Status badge (draft, sent, paid, overdue, cancelled)
5. Organization info (left) | Customer info (right)
6. Line items table
7. Totals (subtotal, tax, total)
8. Payment information (due date, payment terms, method, outstanding amount)
9. Terms & conditions (optional)
10. Notes (optional)
11. Footer with custom text + page number

**Required Data**:
```python
invoice = {
    'invoice_number': 'INV-2024-001',
    'issue_date': '2024-01-15',
    'due_date': '2024-02-15',
    'status': 'sent',  # draft, sent, paid, overdue, cancelled
    'customer_name': 'John Doe',
    'customer_email': 'john@example.com',
    'customer_phone': '+212 6 12 34 56 78',
    'customer_address': '123 Street, City',
    'customer_tax_id': 'TAX123456',  # Optional
    'subtotal': 1000.00,
    'total_tax': 200.00,
    'total': 1200.00,
    'outstanding_amount': 1200.00,  # Amount still owed
    'payment_terms': 'Net 30',  # Optional
    'payment_method': 'Bank Transfer',  # Optional
    'notes': 'Optional notes',  # Optional
    'terms_conditions': 'Payment within 30 days',  # Optional
    'items': [
        {
            'item_name': 'Product A',
            'quantity': 10,
            'rate': 100.00,
            'amount': 1000.00,
            'tax_amount': 200.00
        }
    ]
}
```

## API Endpoints

### Base URL
```
http://localhost:8001/api/billing
```

### 1. Generate Quote PDF

```http
GET /api/billing/quotes/{quote_id}/pdf
Authorization: Bearer {supabase_jwt}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="quote-Q-2024-001.pdf"

{PDF binary data}
```

### 2. Generate Invoice PDF

```http
GET /api/billing/invoices/{invoice_id}/pdf
Authorization: Bearer {supabase_jwt}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="invoice-INV-2024-001.pdf"

{PDF binary data}
```

### 3. Get Supported Document Types

```http
GET /api/billing/supported-document-types
```

**Response**:
```json
{
  "supported_types": ["quote", "invoice"],
  "count": 2
}
```

## Template System

### Database Schema

Templates are stored per organization and can be customized:

```sql
CREATE TABLE quote_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  accent_color TEXT,           -- Hex color (#10B981)
  header_color TEXT,            -- Optional separate header color
  footer_text TEXT,
  show_tax_id BOOLEAN DEFAULT true,
  show_terms BOOLEAN DEFAULT true,
  logo_url TEXT,                -- Reserved for future
  font_family TEXT,             -- Reserved for future
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one default template per organization
CREATE UNIQUE INDEX quote_templates_org_default
  ON quote_templates(organization_id)
  WHERE is_default = true;

-- Invoice templates (optional, can share quote templates)
CREATE TABLE invoice_templates (
  -- Same structure as quote_templates
);
```

### Template Customization

Organizations can customize:
- **Accent Color**: Header bar and section highlights
- **Header Color**: Separate color for header (if different from accent)
- **Footer Text**: Custom message at bottom of each page
- **Show Tax ID**: Show/hide organization tax ID
- **Show Terms**: Show/hide terms & conditions section
- **Logo** (future): Upload and display organization logo
- **Fonts** (future): Custom font selection

## Extending with New Document Types

### Step 1: Create Generator Class

```python
# backend-service/app/services/pdf/receipt.py

from typing import Dict, List, Any
from .base import ItemizedDocumentGenerator, PDFFormatter
from reportlab.lib.units import mm


class ReceiptPDFGenerator(ItemizedDocumentGenerator):
    """Generate Receipt PDF documents"""

    def get_document_title(self) -> str:
        return "REÇU / RECEIPT"

    def get_document_number(self) -> str:
        return self.document['receipt_number']

    def get_items(self) -> List[Dict[str, Any]]:
        return self.document.get('items', [])

    def get_customer_info(self) -> List[str]:
        return [
            f"<b>{self.document['customer_name']}</b>",
            f"Date: {PDFFormatter.format_date(self.document['payment_date'])}"
        ]

    def format_item_row(self, index: int, item: Dict[str, Any]) -> List[str]:
        currency = self.organization.get('currency', 'MAD')
        return [
            str(index),
            item['description'],
            PDFFormatter.format_currency(item['amount'], currency)
        ]

    def build_document_elements(self) -> List:
        elements = []
        elements.extend(self.build_title_section())
        elements.extend(self.build_info_section())

        # Custom table for receipts (simpler than quotes)
        headers = ['#', 'Description', 'Amount']
        column_widths = [10*mm, 120*mm, 40*mm]
        elements.extend(self.build_items_table(headers, column_widths))

        elements.extend(self.build_totals_section())
        return elements
```

### Step 2: Register with Factory

```python
# In __init__.py or at app startup
from .receipt import ReceiptPDFGenerator

PDFGeneratorFactory.register_generator('receipt', ReceiptPDFGenerator)
```

### Step 3: Add API Endpoint

```python
# In app/api/billing.py

@router.get("/receipts/{receipt_id}/pdf")
async def generate_receipt_pdf_endpoint(
    receipt_id: str = Path(...),
    authorization: Optional[str] = Header(None)
):
    user, supabase = await verify_auth(authorization)

    # Fetch receipt
    receipt_response = supabase.table("receipts").select(
        "*, items:receipt_items(*)"
    ).eq("id", receipt_id).execute()

    receipt = receipt_response.data[0]
    organization = await fetch_organization(supabase, receipt["organization_id"])
    template = await fetch_template(supabase, receipt["organization_id"], "receipt_templates")

    # Generate PDF
    pdf_bytes = PDFGeneratorFactory.generate_pdf(
        document_type="receipt",
        document_data=receipt,
        organization=organization,
        template=template
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="receipt-{receipt["receipt_number"]}.pdf"'
        }
    )
```

## Usage Examples

### Example 1: Generate Quote PDF from Python

```python
from app.services.pdf import PDFGeneratorFactory

# Prepare data
quote = {
    'quote_number': 'Q-2024-001',
    'issue_date': '2024-01-15',
    'expiry_date': '2024-02-15',
    'customer_name': 'ACME Corp',
    'customer_email': 'contact@acme.com',
    'subtotal': 10000.00,
    'total_tax': 2000.00,
    'total': 12000.00,
    'items': [
        {
            'item_name': 'Consulting Services',
            'quantity': 40,
            'rate': 250.00,
            'amount': 10000.00,
            'tax_amount': 2000.00
        }
    ]
}

organization = {
    'name': 'AgriTech Solutions',
    'address': '123 Tech Street',
    'city': 'Casablanca',
    'postal_code': '20000',
    'country': 'Morocco',
    'email': 'contact@agritech.ma',
    'phone': '+212 5 22 00 00 00',
    'tax_id': 'TAX123456',
    'currency': 'MAD'
}

template = {
    'accent_color': '#10B981',
    'footer_text': 'Thank you for your business!',
    'show_tax_id': True,
    'show_terms': True
}

# Generate PDF
pdf_bytes = PDFGeneratorFactory.generate_pdf(
    document_type='quote',
    document_data=quote,
    organization=organization,
    template=template
)

# Save to file
with open('quote.pdf', 'wb') as f:
    f.write(pdf_bytes)
```

### Example 2: Frontend Integration

```typescript
// In your React component
const handleDownloadPDF = async (documentType: string, documentId: string, documentNumber: string) => {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      alert('Please sign in to download PDF');
      return;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_SERVICE_URL || 'http://localhost:8001';
    const endpoint = `${backendUrl}/api/billing/${documentType}s/${documentId}/pdf`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentType}-${documentNumber}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF download error:', error);
    alert(`Failed to download PDF: ${error.message}`);
  }
};

// Usage
<Button onClick={() => handleDownloadPDF('quote', quote.id, quote.quote_number)}>
  Download Quote PDF
</Button>

<Button onClick={() => handleDownloadPDF('invoice', invoice.id, invoice.invoice_number)}>
  Download Invoice PDF
</Button>
```

## Testing

### Unit Tests

```python
# tests/test_pdf_generation.py

import pytest
from app.services.pdf import PDFGeneratorFactory, QuotePDFGenerator

def test_quote_generator_creation():
    """Test quote generator can be created"""
    quote_data = {...}
    org_data = {...}

    generator = PDFGeneratorFactory.create('quote', quote_data, org_data)
    assert isinstance(generator, QuotePDFGenerator)

def test_quote_pdf_generation():
    """Test quote PDF can be generated"""
    quote_data = {...}
    org_data = {...}

    pdf_bytes = PDFGeneratorFactory.generate_pdf('quote', quote_data, org_data)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b'%PDF')  # PDF magic number

def test_invalid_document_type():
    """Test invalid document type raises error"""
    with pytest.raises(ValueError) as exc_info:
        PDFGeneratorFactory.create('invalid_type', {}, {})

    assert "Unsupported document type" in str(exc_info.value)

def test_supported_types():
    """Test getting supported types"""
    types = PDFGeneratorFactory.get_supported_types()
    assert 'quote' in types
    assert 'invoice' in types
```

### Integration Tests

```python
# tests/test_billing_api.py

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_quote_pdf_endpoint(auth_token):
    """Test quote PDF endpoint"""
    response = client.get(
        f"/api/billing/quotes/{quote_id}/pdf",
        headers={"Authorization": f"Bearer {auth_token}"}
    )

    assert response.status_code == 200
    assert response.headers['content-type'] == 'application/pdf'
    assert 'attachment' in response.headers['content-disposition']
```

## Performance Considerations

### Generation Time
- **Simple Quote (5 items)**: ~200-300ms
- **Complex Invoice (20 items)**: ~500-800ms
- **Multi-page Document**: ~100ms per additional page

### Memory Usage
- **PDF in Memory**: ~500KB - 2MB (before compression)
- **Peak Memory**: ~10MB per concurrent generation

### Optimization Tips

1. **Use Factory Directly** (skip endpoint overhead)
2. **Cache Templates** (load once, reuse)
3. **Batch Generation** (for bulk exports)
4. **Async Processing** (for large documents)

```python
# Example: Batch generation
async def generate_multiple_pdfs(document_ids):
    tasks = [
        generate_pdf_async(doc_id)
        for doc_id in document_ids
    ]
    return await asyncio.gather(*tasks)
```

## Roadmap

### Phase 1 ✅ (Complete)
- [x] Base PDF architecture
- [x] Quote PDF generation
- [x] Invoice PDF generation
- [x] Factory pattern
- [x] Template support
- [x] API endpoints

### Phase 2 (Next Sprint)
- [ ] Logo embedding
- [ ] Custom fonts
- [ ] Receipt generator
- [ ] Purchase order generator
- [ ] Delivery note generator
- [ ] Credit note generator

### Phase 3 (Advanced Features)
- [ ] Multiple template designs
- [ ] Digital signatures
- [ ] Watermarks for draft/sent status
- [ ] Batch PDF generation
- [ ] PDF preview (without download)
- [ ] Email integration (send PDF via email)
- [ ] PDF compression and optimization
- [ ] Multi-language support (beyond FR/EN)

## Troubleshooting

### Common Issues

**Issue**: "Unsupported document type"
**Solution**: Check that document type is registered in factory. Use `PDFGeneratorFactory.get_supported_types()` to see available types.

**Issue**: PDF is blank or incomplete
**Solution**: Ensure all required data fields are present in document_data. Check logs for generation errors.

**Issue**: Fonts look wrong
**Solution**: ReportLab only supports standard fonts by default (Helvetica, Times, Courier). Custom fonts require embedding (future feature).

**Issue**: Colors not showing correctly
**Solution**: Verify hex color format (#RRGGBB). Invalid colors fall back to default green.

**Issue**: Memory error on large documents
**Solution**: Consider pagination or splitting into multiple PDFs. Each PDF is generated in memory.

## Support

For issues, questions, or feature requests:
1. Check this documentation
2. Review example code in `/app/services/pdf/`
3. Check backend service logs
4. Create issue in project repository

---

**Version**: 1.0.0
**Last Updated**: 2025-10-31
**Maintainer**: Backend Team
