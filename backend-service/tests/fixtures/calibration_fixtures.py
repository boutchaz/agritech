from __future__ import annotations

from datetime import date, timedelta
import math


def build_satellite_fixture() -> list[dict[str, float | str]]:
    start = date(2024, 1, 1)
    readings: list[dict[str, float | str]] = []

    for step in range(48):
        current = start + timedelta(days=step * 15)
        seasonal = math.sin((2 * math.pi * step) / 24)

        ndvi = round(0.52 + 0.18 * seasonal, 3)
        nirv = round(0.42 + 0.14 * seasonal, 3)
        ndmi = round(0.26 + 0.12 * seasonal, 3)
        ndre = round(0.31 + 0.10 * seasonal, 3)
        evi = round(0.29 + 0.11 * seasonal, 3)
        msavi = round(0.34 + 0.13 * seasonal, 3)
        msi = round(0.92 - 0.08 * seasonal, 3)
        gci = round(1.20 + 0.28 * seasonal, 3)

        readings.append(
            {
                "date": current.isoformat(),
                "ndvi": ndvi,
                "nirv": nirv,
                "ndmi": ndmi,
                "ndre": ndre,
                "evi": evi,
                "msavi": msavi,
                "msi": msi,
                "gci": gci,
            }
        )

    return readings


def build_weather_fixture() -> list[dict[str, float | str]]:
    start = date(2024, 1, 1)
    total_days = 365 * 2
    rows: list[dict[str, float | str]] = []

    for day_offset in range(total_days):
        current = start + timedelta(days=day_offset)
        seasonal = math.sin((2 * math.pi * day_offset) / 365)

        tmin = round(7 + 7 * seasonal, 1)
        tmax = round(20 + 9 * seasonal, 1)
        precip = round(
            max(0, 2.5 + 2.2 * math.sin((2 * math.pi * (day_offset + 45)) / 365)), 2
        )
        et0 = round(max(0.4, 2.4 + 1.2 * seasonal), 2)
        humidity = round(55 + 20 * math.cos((2 * math.pi * day_offset) / 365), 1)
        wind = round(18 + 6 * math.sin((2 * math.pi * (day_offset + 90)) / 365), 1)
        solar = round(max(6, 18 + 8 * seasonal), 2)

        rows.append(
            {
                "date": current.isoformat(),
                "temp_min": tmin,
                "temp_max": tmax,
                "precip": precip,
                "et0": et0,
                "relative_humidity_mean": humidity,
                "wind_speed_max": wind,
                "shortwave_radiation_sum": solar,
            }
        )

    return rows


def build_soil_analysis_fixture() -> dict[str, float]:
    return {
        "ph_level": 7.2,
        "electrical_conductivity": 1.1,
        "organic_matter_percentage": 2.9,
        "nitrogen_ppm": 31.0,
        "phosphorus_ppm": 19.0,
        "potassium_ppm": 230.0,
    }


def build_water_analysis_fixture() -> dict[str, float]:
    return {
        "ph_level": 7.1,
        "ec_ds_per_m": 1.0,
        "sar": 2.2,
        "chloride_ppm": 84.0,
        "sodium_ppm": 47.0,
    }


def build_harvest_fixture() -> list[dict[str, float | int | str]]:
    rows: list[dict[str, float | int | str]] = []
    for i, year in enumerate([2021, 2022, 2023, 2024, 2025]):
        rows.append(
            {
                "harvest_date": f"{year}-11-15",
                "yield_quantity": round(18.5 + i * 1.8, 2),
                "yield_unit": "t",
            }
        )
    return rows


def build_crop_reference_fixture() -> dict[str, object]:
    return {
        "culture": "olivier",
        "varietes": [
            {
                "nom": "Picholine Marocaine",
                "code": "picholine_marocaine",
                "rendement_kg_arbre": {
                    "juvenile": [5, 12],
                    "entree_production": [15, 28],
                    "pleine_production": [28, 45],
                    "maturite_avancee": [35, 55],
                    "senescence": [20, 30],
                },
            }
        ],
    }


def build_parcel_context_fixture() -> dict[str, object]:
    return {
        "parcel_id": "fixture-parcel-001",
        "organization_id": "fixture-org-001",
        "crop_type": "olivier",
        "variety": "picholine_marocaine",
        "planting_year": 2000,
        "planting_system": "intensif",
    }
