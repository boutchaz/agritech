import logging
from importlib import import_module
from threading import Lock
from typing import Callable, Protocol, cast

import numpy as np
from numpy.typing import NDArray
from fastapi import HTTPException

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "intfloat/multilingual-e5-large"
RERANK_MODEL_NAME = "BAAI/bge-reranker-v2-m3"


class EmbeddingModel(Protocol):
    def encode(self, *args: object, **kwargs: object) -> NDArray[np.float64]: ...


class CrossEncoderModel(Protocol):
    def predict(self, *args: object, **kwargs: object) -> NDArray[np.float64]: ...


class EmbeddingService:
    def __init__(self) -> None:
        self._model: EmbeddingModel | None = None
        self._reranker: CrossEncoderModel | None = None
        self._lock: Lock = Lock()

    def _import_sentence_transformers(
        self,
    ) -> tuple[Callable[..., object], Callable[..., object]]:
        try:
            sentence_transformers = import_module("sentence_transformers")
            sentence_transformer_cls = cast(
                Callable[..., object],
                getattr(sentence_transformers, "SentenceTransformer"),
            )
            cross_encoder_cls = cast(
                Callable[..., object],
                getattr(sentence_transformers, "CrossEncoder"),
            )
            return sentence_transformer_cls, cross_encoder_cls
        except ImportError as exc:
            logger.error("sentence-transformers is not installed: %s", exc)
            raise HTTPException(
                status_code=503,
                detail="sentence-transformers is not installed; install it to enable agronomy embeddings",
            ) from exc

    def initialize(self) -> None:
        if self._model is not None:
            return

        with self._lock:
            if self._model is not None:
                return

            sentence_transformer_cls, cross_encoder_cls = (
                self._import_sentence_transformers()
            )
            try:
                self._model = cast(
                    EmbeddingModel,
                    sentence_transformer_cls(EMBEDDING_MODEL_NAME),
                )
            except Exception as exc:
                logger.error("Failed to load embedding model: %s", exc)
                raise HTTPException(
                    status_code=503,
                    detail=f"Failed to load embedding model '{EMBEDDING_MODEL_NAME}'",
                ) from exc

            try:
                self._reranker = cast(
                    CrossEncoderModel,
                    cross_encoder_cls(RERANK_MODEL_NAME),
                )
            except Exception as exc:
                logger.warning(
                    "Cross-encoder unavailable, using cosine similarity fallback: %s",
                    exc,
                )
                self._reranker = None

    @staticmethod
    def _prefix_texts(texts: list[str], input_type: str) -> list[str]:
        prefix = "query: " if input_type == "query" else "passage: "
        return [f"{prefix}{text.strip()}" for text in texts]

    def embed_texts(
        self, texts: list[str], input_type: str = "passage"
    ) -> list[list[float]]:
        self.initialize()
        if not texts:
            raise HTTPException(status_code=400, detail="texts must not be empty")

        model = self._model
        if model is None:
            raise HTTPException(
                status_code=503, detail="Embedding model is not initialized"
            )

        prefixed_texts = self._prefix_texts(texts, input_type)

        try:
            embeddings = model.encode(
                prefixed_texts,
                normalize_embeddings=True,
                convert_to_numpy=True,
            )
            return [
                [float(value) for value in row]
                for row in np.asarray(embeddings, dtype=float)
            ]
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Embedding generation failed: %s", exc)
            raise HTTPException(
                status_code=500, detail="Failed to generate embeddings"
            ) from exc

    def rerank(self, query: str, candidates: list[str]) -> list[tuple[str, float]]:
        self.initialize()
        if not query.strip():
            raise HTTPException(status_code=400, detail="query must not be empty")
        if not candidates:
            raise HTTPException(status_code=400, detail="candidates must not be empty")

        cleaned_candidates = [
            candidate.strip()
            for candidate in candidates
            if candidate and candidate.strip()
        ]
        if not cleaned_candidates:
            raise HTTPException(
                status_code=400,
                detail="candidates must contain at least one non-empty string",
            )

        model = self._model
        if model is None:
            raise HTTPException(
                status_code=503, detail="Embedding model is not initialized"
            )

        try:
            if self._reranker is not None:
                scores = self._reranker.predict(
                    [(query, candidate) for candidate in cleaned_candidates]
                )
                ranked = list(
                    zip(
                        cleaned_candidates,
                        [float(score) for score in np.asarray(scores, dtype=float)],
                    )
                )
            else:
                query_embedding = model.encode(
                    [f"query: {query.strip()}"],
                    normalize_embeddings=True,
                    convert_to_numpy=True,
                )
                candidate_embeddings = model.encode(
                    self._prefix_texts(cleaned_candidates, "passage"),
                    normalize_embeddings=True,
                    convert_to_numpy=True,
                )
                scores = np.asarray(
                    np.matmul(candidate_embeddings, query_embedding[0]),
                    dtype=float,
                )
                ranked = list(
                    zip(cleaned_candidates, [float(score) for score in scores])
                )

            ranked.sort(key=lambda item: item[1], reverse=True)
            return ranked
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Reranking failed: %s", exc)
            raise HTTPException(
                status_code=500, detail="Failed to rerank candidates"
            ) from exc


embedding_service = EmbeddingService()
