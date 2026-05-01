"""Tests for the generic condition evaluator."""

import pytest

from app.services.calibration.support.condition_evaluator import evaluate


# ---------------------------------------------------------------------------
# 1. Constant comparison operators — true and false cases
# ---------------------------------------------------------------------------

class TestEq:
    def test_eq_true(self):
        assert evaluate({"var": "x", "eq": 10}, {"x": 10}) is True

    def test_eq_false(self):
        assert evaluate({"var": "x", "eq": 10}, {"x": 5}) is False

    def test_eq_bool(self):
        assert evaluate({"var": "x", "eq": True}, {"x": True}) is True

    def test_eq_string(self):
        assert evaluate({"var": "x", "eq": "wheat"}, {"x": "wheat"}) is True


class TestNeq:
    def test_neq_true(self):
        assert evaluate({"var": "x", "neq": 0}, {"x": 5}) is True

    def test_neq_false(self):
        assert evaluate({"var": "x", "neq": 0}, {"x": 0}) is False


class TestGt:
    def test_gt_true(self):
        assert evaluate({"var": "x", "gt": 10}, {"x": 15}) is True

    def test_gt_false_equal(self):
        assert evaluate({"var": "x", "gt": 10}, {"x": 10}) is False

    def test_gt_false_less(self):
        assert evaluate({"var": "x", "gt": 10}, {"x": 5}) is False


class TestGte:
    def test_gte_true_greater(self):
        assert evaluate({"var": "x", "gte": 10}, {"x": 15}) is True

    def test_gte_true_equal(self):
        assert evaluate({"var": "x", "gte": 10}, {"x": 10}) is True

    def test_gte_false(self):
        assert evaluate({"var": "x", "gte": 10}, {"x": 5}) is False


class TestLt:
    def test_lt_true(self):
        assert evaluate({"var": "x", "lt": 10}, {"x": 5}) is True

    def test_lt_false_equal(self):
        assert evaluate({"var": "x", "lt": 10}, {"x": 10}) is False

    def test_lt_false_greater(self):
        assert evaluate({"var": "x", "lt": 10}, {"x": 15}) is False


class TestLte:
    def test_lte_true_less(self):
        assert evaluate({"var": "x", "lte": 10}, {"x": 5}) is True

    def test_lte_true_equal(self):
        assert evaluate({"var": "x", "lte": 10}, {"x": 10}) is True

    def test_lte_false(self):
        assert evaluate({"var": "x", "lte": 10}, {"x": 15}) is False


# ---------------------------------------------------------------------------
# 2. between — inside, boundary (inclusive), outside
# ---------------------------------------------------------------------------

class TestBetween:
    def test_inside(self):
        assert evaluate({"var": "GDD", "between": [350, 700]}, {"GDD": 500}) is True

    def test_lower_boundary(self):
        assert evaluate({"var": "GDD", "between": [350, 700]}, {"GDD": 350}) is True

    def test_upper_boundary(self):
        assert evaluate({"var": "GDD", "between": [350, 700]}, {"GDD": 700}) is True

    def test_below(self):
        assert evaluate({"var": "GDD", "between": [350, 700]}, {"GDD": 100}) is False

    def test_above(self):
        assert evaluate({"var": "GDD", "between": [350, 700]}, {"GDD": 800}) is False


# ---------------------------------------------------------------------------
# 3. in — match, no match, strings
# ---------------------------------------------------------------------------

class TestIn:
    def test_match(self):
        assert evaluate({"var": "x", "in": [1, 2, 3]}, {"x": 2}) is True

    def test_no_match(self):
        assert evaluate({"var": "x", "in": [1, 2, 3]}, {"x": 5}) is False

    def test_strings(self):
        assert evaluate({"var": "crop", "in": ["wheat", "barley"]}, {"crop": "barley"}) is True

    def test_strings_no_match(self):
        assert evaluate({"var": "crop", "in": ["wheat", "barley"]}, {"crop": "corn"}) is False


# ---------------------------------------------------------------------------
# 4. var-vs-var: gt_var, lt_var — basic, with factor, missing ref var
# ---------------------------------------------------------------------------

class TestVarVsVar:
    def test_gt_var_true(self):
        assert evaluate({"var": "Tmoy", "gt_var": "Tmoy_Q75"}, {"Tmoy": 30, "Tmoy_Q75": 25}) is True

    def test_gt_var_false(self):
        assert evaluate({"var": "Tmoy", "gt_var": "Tmoy_Q75"}, {"Tmoy": 20, "Tmoy_Q75": 25}) is False

    def test_lt_var_true(self):
        assert evaluate({"var": "Tmoy", "lt_var": "Tmoy_Q25"}, {"Tmoy": 10, "Tmoy_Q25": 15}) is True

    def test_lt_var_false(self):
        assert evaluate({"var": "Tmoy", "lt_var": "Tmoy_Q25"}, {"Tmoy": 20, "Tmoy_Q25": 15}) is False

    def test_gte_var(self):
        assert evaluate({"var": "x", "gte_var": "y"}, {"x": 10, "y": 10}) is True

    def test_lte_var(self):
        assert evaluate({"var": "x", "lte_var": "y"}, {"x": 10, "y": 10}) is True

    def test_lt_var_with_factor(self):
        # 5 < 10 * 0.6 = 6.0 → True
        assert evaluate(
            {"var": "NIRv", "lt_var": "NIRv_mean", "factor": 0.6},
            {"NIRv": 5, "NIRv_mean": 10},
        ) is True

    def test_lt_var_with_factor_false(self):
        # 7 < 10 * 0.6 = 6.0 → False
        assert evaluate(
            {"var": "NIRv", "lt_var": "NIRv_mean", "factor": 0.6},
            {"NIRv": 7, "NIRv_mean": 10},
        ) is False

    def test_gt_var_with_factor(self):
        # 8 > 10 * 0.6 = 6.0 → True
        assert evaluate(
            {"var": "x", "gt_var": "y", "factor": 0.6},
            {"x": 8, "y": 10},
        ) is True

    def test_missing_ref_var(self):
        assert evaluate({"var": "Tmoy", "lt_var": "missing"}, {"Tmoy": 10}) is False


# ---------------------------------------------------------------------------
# 5. and — all true, one false
# ---------------------------------------------------------------------------

class TestAnd:
    def test_all_true(self):
        cond = {"and": [
            {"var": "x", "gt": 0},
            {"var": "y", "lt": 10},
        ]}
        assert evaluate(cond, {"x": 5, "y": 3}) is True

    def test_one_false(self):
        cond = {"and": [
            {"var": "x", "gt": 0},
            {"var": "y", "lt": 10},
        ]}
        assert evaluate(cond, {"x": 5, "y": 15}) is False


# ---------------------------------------------------------------------------
# 6. or — one true, none true
# ---------------------------------------------------------------------------

class TestOr:
    def test_one_true(self):
        cond = {"or": [
            {"var": "x", "gt": 100},
            {"var": "y", "lt": 10},
        ]}
        assert evaluate(cond, {"x": 5, "y": 3}) is True

    def test_none_true(self):
        cond = {"or": [
            {"var": "x", "gt": 100},
            {"var": "y", "lt": 10},
        ]}
        assert evaluate(cond, {"x": 5, "y": 15}) is False


# ---------------------------------------------------------------------------
# 7. not — true→false, false→true
# ---------------------------------------------------------------------------

class TestNot:
    def test_negate_true(self):
        cond = {"not": {"var": "x", "gt": 5}}
        assert evaluate(cond, {"x": 10}) is False

    def test_negate_false(self):
        cond = {"not": {"var": "x", "gt": 5}}
        assert evaluate(cond, {"x": 3}) is True


# ---------------------------------------------------------------------------
# 8. Nested: and containing or
# ---------------------------------------------------------------------------

class TestNested:
    def test_and_containing_or(self):
        cond = {"and": [
            {"or": [
                {"var": "a", "eq": 1},
                {"var": "b", "eq": 2},
            ]},
            {"var": "c", "gt": 0},
        ]}
        # a != 1 but b == 2 → or is True; c > 0 → True; and → True
        assert evaluate(cond, {"a": 99, "b": 2, "c": 5}) is True

    def test_and_containing_or_fails(self):
        cond = {"and": [
            {"or": [
                {"var": "a", "eq": 1},
                {"var": "b", "eq": 2},
            ]},
            {"var": "c", "gt": 0},
        ]}
        # neither a==1 nor b==2 → or is False → and is False
        assert evaluate(cond, {"a": 99, "b": 99, "c": 5}) is False


# ---------------------------------------------------------------------------
# 9. Missing variable → False
# ---------------------------------------------------------------------------

class TestMissingVar:
    def test_missing_variable(self):
        assert evaluate({"var": "missing", "gt": 5}, {"x": 10}) is False

    def test_missing_in_and(self):
        cond = {"and": [
            {"var": "x", "gt": 0},
            {"var": "missing", "lt": 10},
        ]}
        assert evaluate(cond, {"x": 5}) is False


# ---------------------------------------------------------------------------
# 10. Empty context → False
# ---------------------------------------------------------------------------

class TestEmptyContext:
    def test_empty_context(self):
        assert evaluate({"var": "x", "gt": 5}, {}) is False


# ---------------------------------------------------------------------------
# 11. Bare list → ValueError
# ---------------------------------------------------------------------------

class TestBareList:
    def test_bare_list_raises(self):
        with pytest.raises(ValueError):
            evaluate([{"var": "x", "gt": 5}], {"x": 10})


# ---------------------------------------------------------------------------
# 12. Diagnostics: verify entries
# ---------------------------------------------------------------------------

class TestDiagnostics:
    def test_diagnostics_and_with_failure(self):
        cond = {"and": [
            {"var": "x", "gte": 350},
            {"var": "y", "lt": 10},
        ]}
        diag = []
        result = evaluate(cond, {"x": 400, "y": 15}, diagnostics=diag)
        assert result is False
        assert len(diag) == 2

        # First clause: x >= 350 with x=400 → True
        assert diag[0]["var"] == "x"
        assert diag[0]["op"] == "gte"
        assert diag[0]["expected"] == 350
        assert diag[0]["actual"] == 400
        assert diag[0]["result"] is True

        # Second clause: y < 10 with y=15 → False
        assert diag[1]["var"] == "y"
        assert diag[1]["op"] == "lt"
        assert diag[1]["expected"] == 10
        assert diag[1]["actual"] == 15
        assert diag[1]["result"] is False

    def test_diagnostics_var_vs_var(self):
        cond = {"var": "a", "lt_var": "b", "factor": 0.5}
        diag = []
        evaluate(cond, {"a": 3, "b": 10}, diagnostics=diag)
        assert len(diag) == 1
        assert diag[0]["op"] == "lt_var"
        assert diag[0]["result"] is True

    def test_diagnostics_missing_var(self):
        diag = []
        evaluate({"var": "missing", "gt": 5}, {"x": 1}, diagnostics=diag)
        assert len(diag) == 1
        assert diag[0]["actual"] is None
        assert diag[0]["result"] is False


# ---------------------------------------------------------------------------
# 13. Diagnostics=None (default) works without error
# ---------------------------------------------------------------------------

class TestDiagnosticsNone:
    def test_default_none(self):
        # Should not raise
        result = evaluate({"var": "x", "gt": 5}, {"x": 10})
        assert result is True

    def test_explicit_none(self):
        result = evaluate({"var": "x", "gt": 5}, {"x": 10}, diagnostics=None)
        assert result is True
