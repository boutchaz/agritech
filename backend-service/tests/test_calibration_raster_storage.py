import asyncio
from importlib import import_module
from typing import Optional


storage_module = import_module("app.services.calibration.raster_storage")
CalibrationRasterStorage = getattr(storage_module, "CalibrationRasterStorage")
RasterStorageConfig = getattr(storage_module, "RasterStorageConfig")


class FakeResponse:
    def __init__(self, should_raise: bool = False):
        self.should_raise = should_raise

    def raise_for_status(self) -> None:
        if self.should_raise:
            raise RuntimeError("upload failed")


class FakeClient:
    def __init__(self):
        self.url: Optional[str] = None
        self.headers: Optional[dict[str, str]] = None
        self.content: Optional[bytes] = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url: str, headers: dict[str, str], content: bytes):
        self.url = url
        self.headers = headers
        self.content = content
        return FakeResponse()


def test_build_path_and_public_url() -> None:
    storage = CalibrationRasterStorage(
        RasterStorageConfig(
            supabase_url="https://example.supabase.co",
            supabase_service_key="service-key",
        )
    )

    path = storage.build_path(
        organization_id="org-1",
        parcel_id="parcel-1",
        raster_date="2025-01-15",
        index="NDVI",
    )

    assert path == "calibration-rasters/org-1/parcel-1/2025-01-15/ndvi.tif"
    assert storage.public_url(path) == (
        "https://example.supabase.co/storage/v1/object/public/satellite-data/"
        "calibration-rasters/org-1/parcel-1/2025-01-15/ndvi.tif"
    )


def test_upload_raster_calls_supabase_storage(monkeypatch) -> None:
    fake_client = FakeClient()

    def fake_async_client(timeout: float = 20.0):
        _ = timeout
        return fake_client

    monkeypatch.setattr(storage_module.httpx, "AsyncClient", fake_async_client)

    storage = CalibrationRasterStorage(
        RasterStorageConfig(
            supabase_url="https://example.supabase.co",
            supabase_service_key="service-key",
        )
    )

    public_url = asyncio.run(
        storage.upload_raster(
            organization_id="org-1",
            parcel_id="parcel-1",
            raster_date="2025-01-15",
            index="NDVI",
            file_data=b"binary-data",
        )
    )

    assert fake_client.url == (
        "https://example.supabase.co/storage/v1/object/satellite-data/"
        "calibration-rasters/org-1/parcel-1/2025-01-15/ndvi.tif"
    )
    assert fake_client.headers is not None
    assert fake_client.headers["x-upsert"] == "true"
    assert fake_client.content == b"binary-data"
    assert public_url.endswith(
        "/calibration-rasters/org-1/parcel-1/2025-01-15/ndvi.tif"
    )
