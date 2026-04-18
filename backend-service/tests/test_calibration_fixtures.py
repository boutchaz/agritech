from importlib import import_module
from typing import Callable, cast


fixtures_module = import_module("tests.fixtures.calibration_fixtures")

build_satellite_fixture = cast(
    Callable[[], list[dict[str, float | str]]],
    getattr(fixtures_module, "build_satellite_fixture"),
)
build_weather_fixture = cast(
    Callable[[], list[dict[str, float | str]]],
    getattr(fixtures_module, "build_weather_fixture"),
)
build_soil_analysis_fixture = cast(
    Callable[[], dict[str, float]],
    getattr(fixtures_module, "build_soil_analysis_fixture"),
)
build_water_analysis_fixture = cast(
    Callable[[], dict[str, float]],
    getattr(fixtures_module, "build_water_analysis_fixture"),
)
build_harvest_fixture = cast(
    Callable[[], list[dict[str, float | int | str]]],
    getattr(fixtures_module, "build_harvest_fixture"),
)


def test_fixtures_load_and_shape_are_valid() -> None:
    satellite = build_satellite_fixture()
    weather = build_weather_fixture()
    soil = build_soil_analysis_fixture()
    water = build_water_analysis_fixture()
    harvest = build_harvest_fixture()

    assert len(satellite) >= 48
    assert len(weather) >= 700
    assert len(harvest) == 5

    assert {
        "date",
        "ndvi",
        "nirv",
        "ndmi",
        "ndre",
        "evi",
        "msavi",
        "msi",
        "gci",
    }.issubset(satellite[0].keys())
    assert {"date", "temp_min", "temp_max", "precip", "et0"}.issubset(weather[0].keys())

    assert {
        "ph_level",
        "electrical_conductivity",
        "organic_matter_percentage",
        "nitrogen_ppm",
        "phosphorus_ppm",
        "potassium_ppm",
    }.issubset(soil.keys())
    assert {"ph_level", "ec_ds_per_m", "sar", "chloride_ppm", "sodium_ppm"}.issubset(
        water.keys()
    )


def test_harvest_fixture_spans_five_distinct_years() -> None:
    harvest = build_harvest_fixture()
    years = {str(row["harvest_date"])[:4] for row in harvest}
    assert len(years) == 5
