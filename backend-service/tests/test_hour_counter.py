"""Tests for the generic hour counter used by phenological-counters service."""
from datetime import datetime, timezone
import math

from app.services.weather.hour_counter import count_hours


def _row(iso: str, temp):
    return {"recorded_at": iso, "temperature_2m": temp}


def test_below_strict_comparison():
    rows = [_row(f"2025-11-01T{h:02d}:00:00+00:00", t) for h, t in enumerate([2, 5, 7.2, 8, 10])]
    assert count_hours(rows, threshold=7.2, compare="below") == 2


def test_above_strict_comparison():
    rows = [_row(f"2025-06-01T{h:02d}:00:00+00:00", t) for h, t in enumerate([10, 35, 36, 40])]
    assert count_hours(rows, threshold=35, compare="above") == 2


def test_between_inclusive_range():
    rows = [_row(f"2025-04-01T{h:02d}:00:00+00:00", t) for h, t in enumerate([14, 15, 20, 25, 26])]
    assert count_hours(rows, threshold=15, compare="between", upper=25) == 3


def test_months_filter_restricts_row_set():
    rows = [
        _row("2025-01-15T01:00:00+00:00", 3),    # Jan -> in window
        _row("2025-04-15T01:00:00+00:00", 3),    # Apr -> excluded
        _row("2025-11-15T01:00:00+00:00", 3),    # Nov -> in window
    ]
    assert count_hours(rows, threshold=7.2, compare="below", months={11, 12, 1, 2}) == 2


def test_null_and_nan_temperatures_are_excluded():
    rows = [
        _row("2025-01-01T01:00:00+00:00", 5),
        _row("2025-01-01T02:00:00+00:00", None),
        _row("2025-01-01T03:00:00+00:00", 6),
        _row("2025-01-01T04:00:00+00:00", float("nan")),
    ]
    assert count_hours(rows, threshold=7, compare="below") == 2
