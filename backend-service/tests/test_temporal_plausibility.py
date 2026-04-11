"""Tests for temporal plausibility artefact detection (replaces IQR outlier detection)."""
from __future__ import annotations

from datetime import date, timedelta
from importlib import import_module
from unittest.mock import MagicMock
import sys

# scipy may not be installed in test env — mock it before importing s1
if "scipy" not in sys.modules:
    scipy_mock = MagicMock()
    sys.modules["scipy"] = scipy_mock
    sys.modules["scipy.signal"] = scipy_mock.signal

s1 = import_module("app.services.calibration.pipeline.s1_satellite_extraction")

_mark_temporal_artefacts = getattr(s1, "_mark_temporal_artefacts")
_extract_plausibility_config = getattr(s1, "_extract_plausibility_config")
IndexTimePoint = getattr(
    import_module("app.services.calibration.types"), "IndexTimePoint"
)


def _pt(day_offset: int, value: float, base: date = date(2025, 1, 1)) -> object:
    return IndexTimePoint(
        date=base + timedelta(days=day_offset),
        value=value,
        outlier=False,
        interpolated=False,
    )


# ---------------------------------------------------------------------------
# Spike detection + confirmation
# ---------------------------------------------------------------------------


def test_spike_with_snapback_is_artefact() -> None:
    """A 40% spike that snaps back within 5 days → marked as artefact."""
    points = [
        _pt(0, 0.10),    # baseline
        _pt(5, 0.15),    # 50% spike → suspect
        _pt(10, 0.105),  # snaps back to ±10% of 0.10 → confirmed artefact
    ]
    count = _mark_temporal_artefacts(points)
    assert count == 1
    assert points[1].outlier is True
    assert points[0].outlier is False
    assert points[2].outlier is False


def test_spike_without_snapback_is_real_growth() -> None:
    """A 40% jump that stays high → NOT an artefact (real growth)."""
    points = [
        _pt(0, 0.10),
        _pt(5, 0.14),    # 40% jump
        _pt(10, 0.15),   # stays high → not snapping back
        _pt(15, 0.16),
    ]
    count = _mark_temporal_artefacts(points)
    assert count == 0
    assert all(not p.outlier for p in points)


def test_spike_snapback_outside_window_not_confirmed() -> None:
    """Snapback after 15 days (outside 10-day window) → NOT confirmed."""
    points = [
        _pt(0, 0.10),
        _pt(5, 0.15),     # 50% spike
        _pt(20, 0.105),   # returns to baseline, but 15 days later (> 10 day window)
    ]
    count = _mark_temporal_artefacts(points)
    assert count == 0
    assert all(not p.outlier for p in points)


def test_small_change_not_flagged() -> None:
    """A 20% change (below 30% threshold) → not even suspect."""
    points = [
        _pt(0, 0.10),
        _pt(5, 0.12),    # 20% change < 30% threshold
        _pt(10, 0.10),   # returns to baseline
    ]
    count = _mark_temporal_artefacts(points)
    assert count == 0


def test_drop_artefact_detected() -> None:
    """A sudden drop (negative spike) that recovers → artefact."""
    points = [
        _pt(0, 0.15),
        _pt(5, 0.09),    # -40% drop → suspect
        _pt(8, 0.155),   # recovers within 3 days to ±10% of 0.15
    ]
    count = _mark_temporal_artefacts(points)
    assert count == 1
    assert points[1].outlier is True


def test_multiple_artefacts_in_series() -> None:
    """Multiple spikes in a longer series → each independently checked."""
    points = [
        _pt(0, 0.10),
        _pt(5, 0.15),     # spike 1
        _pt(8, 0.105),    # confirms spike 1
        _pt(15, 0.11),
        _pt(20, 0.17),    # spike 2 (55% from 0.11)
        _pt(25, 0.115),   # confirms spike 2
        _pt(30, 0.12),
    ]
    count = _mark_temporal_artefacts(points)
    assert count == 2
    assert points[1].outlier is True
    assert points[4].outlier is True


def test_legitimate_seasonal_transition_not_flagged() -> None:
    """Dormancy exit: gradual rise over weeks → no artefact flags."""
    points = [
        _pt(0, 0.06),
        _pt(5, 0.07),
        _pt(10, 0.08),
        _pt(15, 0.09),
        _pt(20, 0.10),
        _pt(25, 0.12),
        _pt(30, 0.14),   # 17% jump from 0.12 — below threshold
    ]
    count = _mark_temporal_artefacts(points)
    assert count == 0


def test_zero_value_skipped() -> None:
    """Points with value=0 don't cause division by zero."""
    points = [
        _pt(0, 0.0),
        _pt(5, 0.10),
        _pt(10, 0.09),
    ]
    count = _mark_temporal_artefacts(points)
    assert count == 0


def test_too_few_points_returns_zero() -> None:
    """Fewer than 3 points → no processing."""
    points = [_pt(0, 0.10), _pt(5, 0.20)]
    count = _mark_temporal_artefacts(points)
    assert count == 0


# ---------------------------------------------------------------------------
# Custom thresholds
# ---------------------------------------------------------------------------


def test_custom_spike_threshold() -> None:
    """With a stricter 20% threshold, smaller spikes are caught."""
    points = [
        _pt(0, 0.10),
        _pt(5, 0.125),   # 25% — above 20% custom threshold
        _pt(8, 0.105),   # snaps back
    ]
    count = _mark_temporal_artefacts(points, spike_threshold=0.20)
    assert count == 1


# ---------------------------------------------------------------------------
# Config extraction from referential
# ---------------------------------------------------------------------------


def test_extract_config_from_olive_referential() -> None:
    """Reads spike threshold from protocole_phenologique."""
    import json
    with open("../agritech-api/referentials/DATA_OLIVIER.json") as f:
        ref = json.load(f)
    spike, window, tol = _extract_plausibility_config(ref)
    assert spike == 0.30
    assert window == 10
    assert tol == 0.10


def test_extract_config_no_referential() -> None:
    """Defaults when no referential."""
    spike, window, tol = _extract_plausibility_config(None)
    assert spike == 0.30
    assert window == 10
    assert tol == 0.10


def test_extract_config_no_protocole() -> None:
    """Defaults when referential has no protocole_phenologique."""
    spike, window, tol = _extract_plausibility_config({"gdd": {}})
    assert spike == 0.30
