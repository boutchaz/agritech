from __future__ import annotations

from datetime import timedelta
from statistics import mean, pstdev
from typing import Any, Literal

from ..referential_utils import get_satellite_thresholds_from_referential
from ..types import AnomalyRecord, Step1Output, Step2Output, Step4Output, Step5Output


def _nearest_weather_event(step2: Step2Output, target_date) -> str | None:
    for event in step2.extreme_events:
        if abs((event.date - target_date).days) <= 3:
            return event.event_type
    return None


_SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}


def _severity_from_ratio(ratio: float) -> Literal["low", "medium", "high", "critical"]:
    if ratio >= 0.4:
        return "critical"
    if ratio >= 0.25:
        return "high"
    if ratio >= 0.15:
        return "medium"
    return "low"


def detect_anomalies(
    satellite: Step1Output,
    weather: Step2Output,
    phenology: Step4Output,
    age_adjustment: dict[str, float] | None = None,
    reference_data: dict[str, Any] | None = None,
    planting_system: str | None = None,
    crop_type: str | None = None,
) -> Step5Output:
    _ = (phenology, age_adjustment)

    anomalies: list[AnomalyRecord] = []

    for index, points in satellite.index_time_series.items():
        observed_points = [
            point for point in points if point.is_observed
        ]
        if len(observed_points) < 6:
            continue

        ordered = sorted(observed_points, key=lambda point: point.date)

        # Referential thresholds: flag points below alerte (and optionally below vigilance)
        if reference_data and planting_system:
            thresholds = get_satellite_thresholds_from_referential(
                reference_data, planting_system, index
            )
            if thresholds:
                alerte = thresholds.get("alerte")
                vigilance = thresholds.get("vigilance")
                if alerte is not None:
                    for point in ordered:
                        if point.value < alerte:
                            severity = "critical"
                            if vigilance is not None and point.value >= vigilance:
                                severity = "high"
                            anomalies.append(
                                AnomalyRecord(
                                    date=point.date,
                                    anomaly_type="below_referential_alerte",
                                    severity=severity,
                                    index_name=index,
                                    value=point.value,
                                    previous_value=None,
                                    deviation=round(alerte - point.value, 4),
                                    weather_reference=_nearest_weather_event(
                                        weather, point.date
                                    ),
                                    excluded_from_reference=True,
                                )
                            )
        values = [point.value for point in ordered]
        avg = mean(values)
        sigma = pstdev(values) if len(values) > 1 else 0.0

        for idx in range(1, len(ordered)):
            prev = ordered[idx - 1]
            curr = ordered[idx]
            day_gap = (curr.date - prev.date).days
            if day_gap > 15 or prev.value <= 0:
                continue

            drop_ratio = (prev.value - curr.value) / prev.value
            if drop_ratio > 0.25:
                weather_ref = _nearest_weather_event(weather, curr.date)
                severity = _severity_from_ratio(drop_ratio)
                anomalies.append(
                    AnomalyRecord(
                        date=curr.date,
                        anomaly_type="sudden_drop",
                        severity=severity,
                        index_name=index,
                        value=curr.value,
                        previous_value=prev.value,
                        deviation=round(drop_ratio, 4),
                        weather_reference=weather_ref,
                        excluded_from_reference=severity in {"high", "critical"},
                    )
                )

        for idx in range(2, len(ordered)):
            a = ordered[idx - 2].value
            b = ordered[idx - 1].value
            c = ordered[idx].value
            if a > b > c and a > 0 and ((a - c) / a) > 0.2:
                anomalies.append(
                    AnomalyRecord(
                        date=ordered[idx].date,
                        anomaly_type="progressive_decline",
                        severity="medium",
                        index_name=index,
                        value=c,
                        previous_value=a,
                        deviation=round((a - c) / a, 4),
                        weather_reference=_nearest_weather_event(
                            weather, ordered[idx].date
                        ),
                        excluded_from_reference=False,
                    )
                )
                break

        if sigma > 0:
            lower = avg - 2 * sigma
            upper = avg + 2 * sigma
            for point in ordered:
                if point.value < lower or point.value > upper:
                    anomalies.append(
                        AnomalyRecord(
                            date=point.date,
                            anomaly_type="abnormal_value",
                            severity="medium",
                            index_name=index,
                            value=point.value,
                            previous_value=round(avg, 4),
                            deviation=round(abs(point.value - avg) / sigma, 4)
                            if sigma > 0
                            else None,
                            weather_reference=_nearest_weather_event(
                                weather, point.date
                            ),
                            excluded_from_reference=False,
                        )
                    )
                    break

        third = max(1, len(values) // 3)
        early_mean = mean(values[:third])
        late_mean = mean(values[-third:])
        if early_mean > 0 and abs(late_mean - early_mean) / early_mean > 0.15:
            anomalies.append(
                AnomalyRecord(
                    date=ordered[-1].date,
                    anomaly_type="trend_break",
                    severity="medium",
                    index_name=index,
                    value=round(late_mean, 4),
                    previous_value=round(early_mean, 4),
                    deviation=round((late_mean - early_mean) / early_mean, 4),
                    weather_reference=_nearest_weather_event(weather, ordered[-1].date),
                    excluded_from_reference=False,
                )
            )

        if len(values) >= 8:
            window = values[-8:]
            window_std = pstdev(window)
            if window_std < 0.01:
                anomalies.append(
                    AnomalyRecord(
                        date=ordered[-1].date,
                        anomaly_type="prolonged_stagnation",
                        severity="low",
                        index_name=index,
                        value=round(mean(window), 4),
                        previous_value=None,
                        deviation=round(window_std, 6),
                        weather_reference=None,
                        excluded_from_reference=False,
                    )
                )

    # --- Causal deduplication ---
    # Two layers of deduplication to reduce alert fatigue:
    #
    # 1) Cross-detector: multiple detectors fire on the same event for the
    #    same index (e.g. sudden_drop + abnormal_value + trend_break).
    #    Keep the highest-severity anomaly per (index, date ±3 days).
    #
    # 2) Cross-index: the same event fires for all indices on the same date
    #    (e.g. sudden_drop on NDVI, EVI, NDRE all at once = one real event).
    #    Keep the highest-severity anomaly per (anomaly_type, date ±3 days).

    # Layer 1: collapse across detectors per index
    sorted_anomalies = sorted(
        anomalies,
        key=lambda a: (a.date, -_SEVERITY_RANK.get(a.severity, 0)),
    )
    per_index: list[AnomalyRecord] = []
    for anomaly in sorted_anomalies:
        merged = False
        for existing in per_index:
            if (
                existing.index_name == anomaly.index_name
                and abs((existing.date - anomaly.date).days) <= 3
            ):
                if _SEVERITY_RANK.get(anomaly.severity, 0) > _SEVERITY_RANK.get(
                    existing.severity, 0
                ):
                    per_index.remove(existing)
                    per_index.append(anomaly)
                merged = True
                break
        if not merged:
            per_index.append(anomaly)

    # Layer 2: collapse across indices per anomaly type
    deduplicated: list[AnomalyRecord] = []
    for anomaly in sorted(per_index, key=lambda a: (a.date, -_SEVERITY_RANK.get(a.severity, 0))):
        merged = False
        for existing in deduplicated:
            if (
                existing.anomaly_type == anomaly.anomaly_type
                and abs((existing.date - anomaly.date).days) <= 3
            ):
                if _SEVERITY_RANK.get(anomaly.severity, 0) > _SEVERITY_RANK.get(
                    existing.severity, 0
                ):
                    deduplicated.remove(existing)
                    deduplicated.append(anomaly)
                merged = True
                break
        if not merged:
            deduplicated.append(anomaly)

    deduplicated.sort(key=lambda a: (a.date, a.anomaly_type))
    return Step5Output(anomalies=deduplicated)
