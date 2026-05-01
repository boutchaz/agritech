from pydantic import BaseModel, Field, ValidationInfo, field_validator


class EmbedRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1)
    input_type: str = Field("passage")

    @field_validator("texts")
    @classmethod
    def validate_texts(cls, value: list[str]) -> list[str]:
        cleaned = [text.strip() for text in value if text and text.strip()]
        if not cleaned:
            raise ValueError("texts must contain at least one non-empty string")
        return cleaned

    @field_validator("input_type")
    @classmethod
    def validate_input_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"query", "passage"}:
            raise ValueError("input_type must be 'query' or 'passage'")
        return normalized


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]


class RankedItem(BaseModel):
    text: str
    score: float


class RerankRequest(BaseModel):
    query: str = Field(..., min_length=1)
    candidates: list[str] = Field(..., min_length=1)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("query must not be empty")
        return cleaned

    @field_validator("candidates")
    @classmethod
    def validate_candidates(cls, value: list[str]) -> list[str]:
        cleaned = [
            candidate.strip() for candidate in value if candidate and candidate.strip()
        ]
        if not cleaned:
            raise ValueError("candidates must contain at least one non-empty string")
        return cleaned


class RerankResponse(BaseModel):
    ranked: list[RankedItem]


class IngestRequest(BaseModel):
    storage_path: str | None = Field(None, min_length=1)
    source_url: str | None = Field(None, min_length=1)
    chunk_size: int = Field(600, ge=1)
    chunk_overlap: int = Field(80, ge=0)

    @field_validator("storage_path")
    @classmethod
    def validate_storage_path(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().lstrip("/")
        if not cleaned or "/" not in cleaned:
            raise ValueError("storage_path must include bucket and object path")
        return cleaned

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str | None, info: ValidationInfo) -> str | None:
        storage_path = info.data.get("storage_path") if info.data else None
        if value is None:
            if not storage_path:
                raise ValueError("one of storage_path or source_url is required")
            return None
        if storage_path:
            raise ValueError("provide only one of storage_path or source_url")
        cleaned = value.strip()
        if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
            raise ValueError("source_url must be http(s)")
        return cleaned

    @field_validator("chunk_overlap")
    @classmethod
    def validate_chunk_overlap(cls, value: int, info: ValidationInfo) -> int:
        chunk_size = info.data.get("chunk_size") if info.data else None
        if chunk_size is not None and value >= chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")
        return value


class ChunkData(BaseModel):
    text: str
    page: int
    chunk_index: int
    embedding: list[float]


class IngestResponse(BaseModel):
    chunks: list[ChunkData]
