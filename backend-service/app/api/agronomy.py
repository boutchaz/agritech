import asyncio
import io
from importlib import import_module
import logging
from typing import TypedDict
from urllib.parse import quote, urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException

from ..core.config import settings
from ..middleware.auth import get_current_user_or_service
from ..models.agronomy_schemas import (
    ChunkData,
    EmbedRequest,
    EmbedResponse,
    IngestRequest,
    IngestResponse,
    RankedItem,
    RerankRequest,
    RerankResponse,
)
from ..services.embedding_service import embedding_service

router = APIRouter(dependencies=[Depends(get_current_user_or_service)])
logger = logging.getLogger(__name__)

ALLOWED_SOURCE_DOMAINS = frozenset(
    {
        "inra.org.ma",
        "www.inra.org.ma",
        "fao.org",
        "www.fao.org",
        "internationaloliveoil.org",
        "www.internationaloliveoil.org",
        "agrimaroc.net",
        "www.agrimaroc.net",
        "agrimaroc.ma",
        "www.agrimaroc.ma",
        "agriculture.gov.ma",
        "www.agriculture.gov.ma",
        "ardna.org",
        "admin.ardna.org",
    }
)

MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024  # 50MB
ALLOWED_CONTENT_TYPES = ("application/pdf", "image/")


class ExtractedPage(TypedDict):
    page: int
    text: str


class ChunkPayload(TypedDict):
    page: int
    text: str


def _split_storage_path(storage_path: str) -> tuple[str, str]:
    normalized = storage_path.strip().lstrip("/")
    parts = normalized.split("/", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise HTTPException(
            status_code=400,
            detail="storage_path must be formatted as '<bucket>/<object_path>'",
        )
    return parts[0], parts[1]


async def _download_url_file(source_url: str) -> tuple[bytes, str]:
    parsed = urlparse(source_url)
    host = (parsed.hostname or "").lower()
    if host not in ALLOWED_SOURCE_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"source_url host '{host}' not in allowlist",
        )
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            response = await client.get(source_url)
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Source URL not found")
            response.raise_for_status()
            content_type = (response.headers.get("content-type") or "").split(";")[0].strip().lower()
            if not any(content_type == t or content_type.startswith(t) for t in ALLOWED_CONTENT_TYPES):
                raise HTTPException(
                    status_code=415,
                    detail=f"unsupported content-type: {content_type or 'unknown'}",
                )
            content = response.content
            if len(content) > MAX_DOWNLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"file exceeds {MAX_DOWNLOAD_BYTES} bytes",
                )
            return content, content_type
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to download url %s: %s", source_url, exc)
        raise HTTPException(
            status_code=502, detail="Failed to download file from source URL"
        ) from exc


async def _download_storage_file(storage_path: str) -> bytes:
    bucket, object_path = _split_storage_path(storage_path)
    encoded_object_path = quote(object_path, safe="/")
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{encoded_object_path}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                url,
                headers={
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                },
            )
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Storage file not found")
            _ = response.raise_for_status()
            return response.content
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to download storage file %s: %s", storage_path, exc)
        raise HTTPException(
            status_code=502, detail="Failed to download file from storage"
        ) from exc


def _chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    normalized = " ".join(text.split())
    if not normalized:
        return []

    chunks: list[str] = []
    start = 0
    step = max(chunk_size - chunk_overlap, 1)

    while start < len(normalized):
        end = min(start + chunk_size, len(normalized))
        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(normalized):
            break
        start += step

    return chunks


def _extract_image_text(image_bytes: bytes) -> str:
    try:
        pytesseract = import_module("pytesseract")
        image_module = import_module("PIL.Image")
    except ImportError as exc:
        logger.error("OCR dependencies are not installed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="pytesseract and Pillow are required for OCR fallback",
        ) from exc

    try:
        with image_module.open(io.BytesIO(image_bytes)) as image:
            return str(pytesseract.image_to_string(image)).strip()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("OCR failed for image: %s", exc)
        raise HTTPException(
            status_code=500, detail="Failed to OCR image content"
        ) from exc


def _extract_pdf_pages(file_bytes: bytes) -> list[ExtractedPage]:
    try:
        PdfReader = getattr(import_module("pypdf"), "PdfReader")
    except ImportError as exc:
        logger.error("pypdf is not installed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="pypdf is not installed; install it to enable PDF ingestion",
        ) from exc

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as exc:
        logger.error("Failed to read PDF: %s", exc)
        raise HTTPException(status_code=400, detail="Failed to parse PDF file") from exc

    pages: list[ExtractedPage] = []
    for page_index, page in enumerate(reader.pages, start=1):
        page_text = (page.extract_text() or "").strip()
        if not page_text:
            image_texts: list[str] = []
            for image_file in getattr(page, "images", []):
                image_data = getattr(image_file, "data", None)
                if not image_data:
                    continue
                extracted = _extract_image_text(image_data)
                if extracted:
                    image_texts.append(extracted)
            page_text = "\n".join(image_texts).strip()

        if page_text:
            pages.append({"page": page_index, "text": page_text})

    if not pages:
        raise HTTPException(
            status_code=422, detail="No text could be extracted from the PDF"
        )

    return pages


def _extract_document_pages(
    storage_path: str, file_bytes: bytes
) -> list[ExtractedPage]:
    normalized = storage_path.lower()
    if normalized.endswith(".pdf"):
        return _extract_pdf_pages(file_bytes)

    extracted = _extract_image_text(file_bytes)
    if not extracted:
        raise HTTPException(
            status_code=422, detail="No text could be extracted from the file"
        )
    return [{"page": 1, "text": extracted}]


@router.post("/embed", response_model=EmbedResponse)
async def embed_text(request: EmbedRequest) -> EmbedResponse:
    try:
        loop = asyncio.get_running_loop()
        embeddings = await loop.run_in_executor(
            None,
            embedding_service.embed_texts,
            request.texts,
            request.input_type,
        )
        return EmbedResponse(embeddings=embeddings)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Embed endpoint failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to embed texts") from exc


@router.post("/rerank", response_model=RerankResponse)
async def rerank_candidates(request: RerankRequest) -> RerankResponse:
    try:
        loop = asyncio.get_running_loop()
        ranked = await loop.run_in_executor(
            None,
            embedding_service.rerank,
            request.query,
            request.candidates,
        )
        return RerankResponse(
            ranked=[RankedItem(text=text, score=score) for text, score in ranked]
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Rerank endpoint failed: %s", exc)
        raise HTTPException(
            status_code=500, detail="Failed to rerank candidates"
        ) from exc


@router.post("/ingest", response_model=IngestResponse)
async def ingest_document(request: IngestRequest) -> IngestResponse:
    try:
        if request.storage_path:
            if not request.storage_path.startswith("agronomy-corpus/"):
                raise HTTPException(
                    status_code=400,
                    detail="storage_path must start with 'agronomy-corpus/'",
                )
            file_bytes = await _download_storage_file(request.storage_path)
            path_for_filetype = request.storage_path
        elif request.source_url:
            file_bytes, content_type = await _download_url_file(request.source_url)
            # Let _extract_document_pages infer via .pdf suffix; if missing, fall back to content-type.
            path_for_filetype = (
                request.source_url if request.source_url.lower().endswith(".pdf")
                else ("document.pdf" if content_type == "application/pdf" else "document.bin")
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="one of storage_path or source_url is required",
            )

        pages = _extract_document_pages(path_for_filetype, file_bytes)

        chunk_payloads: list[ChunkPayload] = []
        for page_data in pages:
            page_chunks = _chunk_text(
                page_data["text"],
                request.chunk_size,
                request.chunk_overlap,
            )
            for chunk_text in page_chunks:
                chunk_payloads.append(
                    {
                        "text": chunk_text,
                        "page": int(page_data["page"]),
                    }
                )

        if not chunk_payloads:
            raise HTTPException(
                status_code=422, detail="No chunks were generated from the document"
            )

        loop = asyncio.get_running_loop()
        embeddings = await loop.run_in_executor(
            None,
            embedding_service.embed_texts,
            [payload["text"] for payload in chunk_payloads],
            "passage",
        )

        chunks = [
            ChunkData(
                text=payload["text"],
                page=payload["page"],
                chunk_index=index,
                embedding=embedding,
            )
            for index, (payload, embedding) in enumerate(
                zip(chunk_payloads, embeddings),
                start=1,
            )
        ]
        return IngestResponse(chunks=chunks)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Ingest endpoint failed for %s: %s", request.storage_path, exc)
        raise HTTPException(
            status_code=500, detail="Failed to ingest document"
        ) from exc
