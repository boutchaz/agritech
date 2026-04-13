"""
Generic condition evaluator for JSON condition trees.

Walks a nested condition structure and evaluates it against a flat context dict.
Used by the calibration state machine to decide crop-stage transitions.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def evaluate(
    condition: Any,
    context: Dict[str, Any],
    diagnostics: Optional[List[Dict[str, Any]]] = None,
) -> bool:
    """Evaluate a JSON condition tree against a context dict.

    Parameters
    ----------
    condition : dict
        A condition node — either a boolean combinator (and/or/not)
        or an atomic clause with ``var`` + operator.
    context : dict
        Flat key→value mapping of current state variables.
    diagnostics : list or None
        When a list is passed, each atomic evaluation appends an entry
        ``{"var", "op", "expected", "actual", "result"}``.
        Pass ``None`` (the default) to skip diagnostic logging entirely.

    Returns
    -------
    bool

    Raises
    ------
    ValueError
        If *condition* is a bare list (not wrapped in and/or/not).
    """
    if isinstance(condition, list):
        raise ValueError(
            "Bare list conditions are not supported. "
            "Wrap in {'and': [...]} or {'or': [...]}."
        )

    # -- Boolean combinators ------------------------------------------------
    if "and" in condition:
        return all(evaluate(c, context, diagnostics) for c in condition["and"])

    if "or" in condition:
        return any(evaluate(c, context, diagnostics) for c in condition["or"])

    if "not" in condition:
        return not evaluate(condition["not"], context, diagnostics)

    # -- Atomic clause ------------------------------------------------------
    return _evaluate_atomic(condition, context, diagnostics)


# Operator helpers mapping op-name → comparison function (actual, expected)
_CONST_OPS: Dict[str, Any] = {
    "eq":      lambda a, e: a == e,
    "neq":     lambda a, e: a != e,
    "gt":      lambda a, e: a > e,
    "gte":     lambda a, e: a >= e,
    "lt":      lambda a, e: a < e,
    "lte":     lambda a, e: a <= e,
    "between": lambda a, e: e[0] <= a <= e[1],
    "in":      lambda a, e: a in e,
}

_VAR_OPS: Dict[str, Any] = {
    "gt_var":  lambda a, ref: a > ref,
    "gte_var": lambda a, ref: a >= ref,
    "lt_var":  lambda a, ref: a < ref,
    "lte_var": lambda a, ref: a <= ref,
}


def _evaluate_atomic(
    clause: Dict[str, Any],
    context: Dict[str, Any],
    diagnostics: Optional[List[Dict[str, Any]]],
) -> bool:
    var_name: str = clause["var"]
    actual = context.get(var_name)

    if actual is None and var_name not in context:
        # Missing variable → False
        _record(diagnostics, var_name, _detect_op(clause), _detect_expected(clause), None, False)
        return False

    # --- var-vs-var operators ----------------------------------------------
    for op_key, cmp_fn in _VAR_OPS.items():
        if op_key in clause:
            ref_name = clause[op_key]
            if ref_name not in context:
                _record(diagnostics, var_name, op_key, ref_name, actual, False)
                return False
            factor = clause.get("factor", 1.0)
            ref_val = context[ref_name] * factor
            result = cmp_fn(actual, ref_val)
            _record(diagnostics, var_name, op_key, ref_val, actual, result)
            return result

    # --- constant operators ------------------------------------------------
    for op_key, cmp_fn in _CONST_OPS.items():
        if op_key in clause:
            expected = clause[op_key]
            result = cmp_fn(actual, expected)
            _record(diagnostics, var_name, op_key, expected, actual, result)
            return result

    # No recognised operator — treat as always-false
    return False


def _detect_op(clause: Dict[str, Any]) -> str:
    """Best-effort detect the operator name in a clause (for diagnostics)."""
    for key in list(_CONST_OPS) + list(_VAR_OPS):
        if key in clause:
            return key
    return "unknown"


def _detect_expected(clause: Dict[str, Any]) -> Any:
    """Best-effort extract the expected value from a clause (for diagnostics)."""
    for key in list(_CONST_OPS) + list(_VAR_OPS):
        if key in clause:
            return clause[key]
    return None


def _record(
    diagnostics: Optional[List[Dict[str, Any]]],
    var: str,
    op: str,
    expected: Any,
    actual: Any,
    result: bool,
) -> None:
    if diagnostics is None:
        return
    diagnostics.append({
        "var": var,
        "op": op,
        "expected": expected,
        "actual": actual,
        "result": result,
    })
