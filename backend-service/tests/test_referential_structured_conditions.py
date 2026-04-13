"""
Validate that crop referential JSON files use structured condition expressions
instead of natural-language strings (migration tasks 5-6).
"""

import json
import os
import pytest

REFERENTIAL_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "agritech-api", "referentials"
)

CROP_FILES = [
    "DATA_OLIVIER.json",
    "DATA_AGRUMES.json",
    "DATA_AVOCATIER.json",
    "DATA_PALMIER_DATTIER.json",
]

EXPECTED_PHASE_NAMES = [
    "DORMANCE",
    "DEBOURREMENT",
    "FLORAISON",
    "NOUAISON",
    "STRESS_ESTIVAL",
    "REPRISE_AUTOMNALE",
]

EXPECTED_STREAK_NAMES = [
    "warm_streak",
    "cold_streak",
    "hot_streak",
    "hot_dry_streak",
]


def _load(filename: str) -> dict:
    path = os.path.join(REFERENTIAL_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(params=CROP_FILES)
def crop_data(request):
    """Parametrized fixture: yields (filename, parsed_json) for each crop."""
    filename = request.param
    return filename, _load(filename)


class TestPhasesKeyedByName:
    """Phases must be keyed by human-readable name, not PHASE_N."""

    def test_no_phase_n_keys(self, crop_data):
        filename, data = crop_data
        phases = data["protocole_phenologique"]["phases"]
        phase_n_keys = [k for k in phases if k.startswith("PHASE_")]
        assert phase_n_keys == [], (
            f"{filename}: found legacy PHASE_N keys: {phase_n_keys}"
        )

    def test_all_named_phases_present(self, crop_data):
        filename, data = crop_data
        phases = data["protocole_phenologique"]["phases"]
        for name in EXPECTED_PHASE_NAMES:
            assert name in phases, (
                f"{filename}: missing phase '{name}'"
            )


class TestPhaseExitStructure:
    """Each phase must have an 'exit' array with structured 'when' dicts."""

    def test_exit_is_list(self, crop_data):
        filename, data = crop_data
        phases = data["protocole_phenologique"]["phases"]
        for name in EXPECTED_PHASE_NAMES:
            phase = phases[name]
            assert "exit" in phase, (
                f"{filename}.{name}: missing 'exit' key"
            )
            assert isinstance(phase["exit"], list), (
                f"{filename}.{name}: 'exit' should be a list, got {type(phase['exit']).__name__}"
            )
            assert len(phase["exit"]) >= 1, (
                f"{filename}.{name}: 'exit' list is empty"
            )

    def test_exit_when_is_dict(self, crop_data):
        filename, data = crop_data
        phases = data["protocole_phenologique"]["phases"]
        for name in EXPECTED_PHASE_NAMES:
            for i, exit_item in enumerate(phases[name]["exit"]):
                assert "when" in exit_item, (
                    f"{filename}.{name}.exit[{i}]: missing 'when'"
                )
                assert isinstance(exit_item["when"], dict), (
                    f"{filename}.{name}.exit[{i}]: 'when' should be dict, "
                    f"got {type(exit_item['when']).__name__}"
                )

    def test_exit_has_target(self, crop_data):
        filename, data = crop_data
        phases = data["protocole_phenologique"]["phases"]
        for name in EXPECTED_PHASE_NAMES:
            for i, exit_item in enumerate(phases[name]["exit"]):
                assert "target" in exit_item, (
                    f"{filename}.{name}.exit[{i}]: missing 'target'"
                )
                assert exit_item["target"] in EXPECTED_PHASE_NAMES, (
                    f"{filename}.{name}.exit[{i}]: target "
                    f"'{exit_item['target']}' is not a valid phase name"
                )


class TestSignauxStreaks:
    """Root-level signaux.streaks must exist with 4 entries."""

    def test_signaux_exists(self, crop_data):
        filename, data = crop_data
        assert "signaux" in data, f"{filename}: missing 'signaux' at root level"
        assert "streaks" in data["signaux"], (
            f"{filename}: missing 'signaux.streaks'"
        )

    def test_all_streaks_present(self, crop_data):
        filename, data = crop_data
        streaks = data["signaux"]["streaks"]
        for name in EXPECTED_STREAK_NAMES:
            assert name in streaks, (
                f"{filename}: missing streak '{name}'"
            )

    def test_streak_count(self, crop_data):
        filename, data = crop_data
        streaks = data["signaux"]["streaks"]
        assert len(streaks) == 4, (
            f"{filename}: expected 4 streaks, got {len(streaks)}: {list(streaks.keys())}"
        )


class TestPhaseParMaturitePreserved:
    """phases_par_maturite must still exist (not removed during migration)."""

    def test_phases_par_maturite_exists(self, crop_data):
        filename, data = crop_data
        proto = data["protocole_phenologique"]
        assert "phases_par_maturite" in proto, (
            f"{filename}: 'phases_par_maturite' was removed during migration"
        )


class TestDormanceSkipWhen:
    """DORMANCE should have skip_when structured condition."""

    def test_dormance_skip_when(self, crop_data):
        filename, data = crop_data
        dormance = data["protocole_phenologique"]["phases"]["DORMANCE"]
        assert "skip_when" in dormance, (
            f"{filename}: DORMANCE missing 'skip_when'"
        )
        sw = dormance["skip_when"]
        assert isinstance(sw, dict), (
            f"{filename}: DORMANCE.skip_when should be dict"
        )
        assert "var" in sw, (
            f"{filename}: DORMANCE.skip_when missing 'var'"
        )


class TestCropSpecificStreakThresholds:
    """Verify crop-specific hot_streak and hot_dry_streak thresholds."""

    EXPECTED_THRESHOLDS = {
        "DATA_OLIVIER.json": {"hot_streak_gt": 25, "hot_dry_tmax_gt": 30},
        "DATA_AGRUMES.json": {"hot_streak_gt": 30, "hot_dry_tmax_gt": 30},
        "DATA_AVOCATIER.json": {"hot_streak_gt": 25, "hot_dry_tmax_gt": 30},
        "DATA_PALMIER_DATTIER.json": {"hot_streak_gt": 35, "hot_dry_tmax_gt": 40},
    }

    @pytest.fixture(params=CROP_FILES)
    def crop_with_thresholds(self, request):
        filename = request.param
        data = _load(filename)
        expected = self.EXPECTED_THRESHOLDS[filename]
        return filename, data, expected

    def test_hot_streak_threshold(self, crop_with_thresholds):
        filename, data, expected = crop_with_thresholds
        hot_streak = data["signaux"]["streaks"]["hot_streak"]
        assert hot_streak["gt"] == expected["hot_streak_gt"], (
            f"{filename}: hot_streak.gt = {hot_streak['gt']}, "
            f"expected {expected['hot_streak_gt']}"
        )

    def test_hot_dry_streak_tmax(self, crop_with_thresholds):
        filename, data, expected = crop_with_thresholds
        hot_dry = data["signaux"]["streaks"]["hot_dry_streak"]
        # hot_dry_streak is an "and" array; first element has Tmax > threshold
        tmax_cond = hot_dry["and"][0]
        assert tmax_cond["var"] == "Tmax", (
            f"{filename}: hot_dry_streak first condition var should be 'Tmax'"
        )
        assert tmax_cond["gt"] == expected["hot_dry_tmax_gt"], (
            f"{filename}: hot_dry_streak Tmax.gt = {tmax_cond['gt']}, "
            f"expected {expected['hot_dry_tmax_gt']}"
        )
