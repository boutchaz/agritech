from __future__ import annotations

from datetime import timedelta
from statistics import mean, pstdev
from typing import Literal

from .types import AnomalyRecord, Step1Output, Step2Output, Step4Output, Step5Output


def _nearest_weather_event(step2: Step2Output, target_date) -> str | None:
    for event in step2.extreme_events:
        if abs((event.date - target_date).days) <= 3:
            return event.event_type
    return None


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
) -> Step5Output:
    _ = (phenology, age_adjustment)

    anomalies: list[AnomalyRecord] = []

    for index, points in satellite.index_time_series.items():
        if len(points) < 6:
            continue

        ordered = sorted(points, key=lambda point: point.date)
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

    unique: list[AnomalyRecord] = []
    seen: set[tuple[str, str]] = set()
    for anomaly in sorted(anomalies, key=lambda item: (item.date, item.anomaly_type)):
        key = (anomaly.date.isoformat(), anomaly.anomaly_type)
        if key in seen:
            continue
        seen.add(key)
        unique.append(anomaly)

    return Step5Output(anomalies=unique)
