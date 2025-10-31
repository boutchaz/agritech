from fastapi import APIRouter, HTTPException, Header, Path
from fastapi.responses import Response
from typing import Optional
from app.services.pdf import PDFGeneratorFactory
from app.core.config import settings
from app.core.supabase_client import verify_auth_and_get_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

async def fetch_organization(supabase, organization_id: str):
    """Fetch organization details"""
    org_response = supabase.table("organizations").select("*").eq(
        "id", organization_id
    ).execute()

    if not org_response.data or len(org_response.data) == 0:
        raise HTTPException(status_code=404, detail="Organization not found")

    return org_response.data[0]


async def fetch_template(supabase, organization_id: str, template_table: str):
    """Fetch optional custom template"""
    template_response = supabase.table(template_table).select("*").eq(
        "organization_id", organization_id
    ).eq("is_default", True).execute()

    if template_response.data and len(template_response.data) > 0:
        return template_response.data[0]
    return None


@router.get("/quotes/{quote_id}/pdf")
async def generate_quote_pdf_endpoint(
    quote_id: str = Path(..., description="UUID of the quote"),
    authorization: Optional[str] = Header(None, alias="Authorization")
):
    """
    Generate PDF for a quote

    Args:
        quote_id: UUID of the quote
        authorization: Bearer token from Supabase Auth

    Returns:
        PDF file as bytes
    """
    try:
        # Verify authorization
        user, supabase = await verify_auth_and_get_client(authorization, use_service_key=True)

        # Fetch quote with items
        quote_response = supabase.table("quotes").select(
            "*, items:quote_items(*)"
        ).eq("id", quote_id).execute()

        if not quote_response.data or len(quote_response.data) == 0:
            raise HTTPException(status_code=404, detail="Quote not found")

        quote = quote_response.data[0]

        # Transform quote data to match PDF generator expectations
        # Map database fields to PDF generator expected fields
        pdf_quote = {
            **quote,
            'expiry_date': quote.get('valid_until'),  # Map valid_until to expiry_date
            'issue_date': quote.get('quote_date'),   # Map quote_date to issue_date
        }
        
        # Transform items to match PDF generator format
        items = quote.get('items', [])
        pdf_quote['items'] = [
            {
                **item,
                'rate': item.get('unit_price', 0),  # Map unit_price to rate
                'tax_amount': item.get('tax_amount') or 0,  # Ensure tax_amount is not None
                # amount, item_name, quantity should already exist
            }
            for item in items
        ]
        
        # Ensure customer contact fields are available (from quote or separate)
        if not pdf_quote.get('customer_email') and quote.get('contact_email'):
            pdf_quote['customer_email'] = quote.get('contact_email')
        if not pdf_quote.get('customer_phone') and quote.get('contact_phone'):
            pdf_quote['customer_phone'] = quote.get('contact_phone')
        if not pdf_quote.get('customer_address'):
            pdf_quote['customer_address'] = None  # Can be None

        # Fetch organization
        organization = await fetch_organization(supabase, quote["organization_id"])

        # Fetch optional template
        template = await fetch_template(supabase, quote["organization_id"], "quote_templates")

        # Generate PDF using factory
        pdf_bytes = PDFGeneratorFactory.generate_pdf(
            document_type="quote",
            document_data=pdf_quote,
            organization=organization,
            template=template
        )

        # Return PDF as response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="quote-{quote["quote_number"]}.pdf"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF generation failed for quote {quote_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.get("/invoices/{invoice_id}/pdf")
async def generate_invoice_pdf_endpoint(
    invoice_id: str = Path(..., description="UUID of the invoice"),
    authorization: Optional[str] = Header(None, alias="Authorization")
):
    """
    Generate PDF for an invoice

    Args:
        invoice_id: UUID of the invoice
        authorization: Bearer token from Supabase Auth

    Returns:
        PDF file as bytes
    """
    try:
        # Verify authorization
        user, supabase = await verify_auth_and_get_client(authorization, use_service_key=True)

        # Fetch invoice with items
        invoice_response = supabase.table("invoices").select(
            "*, items:invoice_items(*)"
        ).eq("id", invoice_id).execute()

        if not invoice_response.data or len(invoice_response.data) == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")

        invoice = invoice_response.data[0]

        # Fetch organization
        organization = await fetch_organization(supabase, invoice["organization_id"])

        # Fetch optional template (invoices can share quote templates or have their own)
        template = await fetch_template(supabase, invoice["organization_id"], "invoice_templates")
        if not template:
            # Fallback to quote template if invoice template doesn't exist
            template = await fetch_template(supabase, invoice["organization_id"], "quote_templates")

        # Generate PDF using factory
        pdf_bytes = PDFGeneratorFactory.generate_pdf(
            document_type="invoice",
            document_data=invoice,
            organization=organization,
            template=template
        )

        # Return PDF as response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="invoice-{invoice["invoice_number"]}.pdf"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF generation failed for invoice {invoice_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.get("/purchase-orders/{purchase_order_id}/pdf")
async def generate_purchase_order_pdf_endpoint(
    purchase_order_id: str = Path(..., description="UUID of the purchase order"),
    authorization: Optional[str] = Header(None, alias="Authorization")
):
    """
    Generate PDF for a purchase order

    Args:
        purchase_order_id: UUID of the purchase order
        authorization: Bearer token from Supabase Auth

    Returns:
        PDF file as bytes
    """
    try:
        # Verify authorization
        user, supabase = await verify_auth_and_get_client(authorization, use_service_key=True)

        # Fetch purchase order with items
        po_response = supabase.table("purchase_orders").select(
            "*, items:purchase_order_items(*)"
        ).eq("id", purchase_order_id).execute()

        if not po_response.data or len(po_response.data) == 0:
            raise HTTPException(status_code=404, detail="Purchase order not found")

        po = po_response.data[0]

        # Transform purchase order data to match PDF generator expectations
        pdf_po = {
            **po,
            'issue_date': po.get('po_date'),  # Map po_date to issue_date
        }
        
        # Transform items to match PDF generator format
        items = po.get('items', [])
        pdf_po['items'] = [
            {
                **item,
                'rate': item.get('unit_price', 0),  # Map unit_price to rate
                'tax_amount': item.get('tax_amount') or 0,  # Ensure tax_amount is not None
            }
            for item in items
        ]
        
        # Ensure contact fields are available
        if not pdf_po.get('contact_email'):
            pdf_po['contact_email'] = po.get('contact_email')
        if not pdf_po.get('contact_phone'):
            pdf_po['contact_phone'] = po.get('contact_phone')

        # Fetch organization
        organization = await fetch_organization(supabase, po["organization_id"])

        # Fetch optional template (purchase orders can share quote templates)
        template = await fetch_template(supabase, po["organization_id"], "quote_templates")

        # Generate PDF using factory
        pdf_bytes = PDFGeneratorFactory.generate_pdf(
            document_type="purchase_order",
            document_data=pdf_po,
            organization=organization,
            template=template
        )

        # Return PDF as response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="purchase-order-{po["po_number"]}.pdf"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF generation failed for purchase order {purchase_order_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.get("/supported-document-types")
async def get_supported_document_types():
    """
    Get list of supported document types for PDF generation

    Returns:
        List of supported document types
    """
    return {
        "supported_types": PDFGeneratorFactory.get_supported_types(),
        "count": len(PDFGeneratorFactory.get_supported_types())
    }
