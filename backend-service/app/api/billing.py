from fastapi import APIRouter, HTTPException, Header, Path
from fastapi.responses import Response
from typing import Optional
from app.services.pdf import PDFGeneratorFactory
from app.core.config import settings
import os

router = APIRouter()

def get_supabase_client():
    """Get Supabase client"""
    from supabase import create_client
    supabase_url = os.getenv("SUPABASE_URL", settings.SUPABASE_URL)
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY", settings.SUPABASE_KEY)
    return create_client(supabase_url, supabase_key)


async def verify_auth(authorization: Optional[str]):
    """Verify Supabase authentication"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.replace("Bearer ", "")
    supabase = get_supabase_client()

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user, supabase
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


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
        user, supabase = await verify_auth(authorization)

        # Fetch quote with items
        quote_response = supabase.table("quotes").select(
            "*, items:quote_items(*)"
        ).eq("id", quote_id).execute()

        if not quote_response.data or len(quote_response.data) == 0:
            raise HTTPException(status_code=404, detail="Quote not found")

        quote = quote_response.data[0]

        # Fetch organization
        organization = await fetch_organization(supabase, quote["organization_id"])

        # Fetch optional template
        template = await fetch_template(supabase, quote["organization_id"], "quote_templates")

        # Generate PDF using factory
        pdf_bytes = PDFGeneratorFactory.generate_pdf(
            document_type="quote",
            document_data=quote,
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
        user, supabase = await verify_auth(authorization)

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
