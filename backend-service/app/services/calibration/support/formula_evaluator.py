"""Safe arithmetic formula evaluator for referential calculs_preliminaires.

Parses formula strings from the referential JSON and evaluates them against
a context of named variables. Uses Python's ``ast`` module — no ``eval()``,
no arbitrary code execution.

Supported syntax:
  - Variables: ``Tmax``, ``GDD_cumul``, ``NDVI``, etc.
  - Arithmetic: ``+``, ``-``, ``*``, ``/``
  - Functions: ``max(a, b)``, ``min(a, b)``
  - Parentheses: ``(a + b) / c``
  - Numeric literals: ``0.01``, ``2``

Temporal references like ``NDVI(t)`` and ``NDVI(t-1)`` are resolved by the
caller — the evaluator receives a flat context dict where ``NDVI_t`` and
``NDVI_t_1`` are already populated.

Usage::

    evaluator = FormulaEvaluator()
    result = evaluator.evaluate(
        "max(0, (min(Tmax, Tplafond) + max(Tmin, Tbase)) / 2 - Tbase)",
        {"Tmax": 30, "Tmin": 10, "Tplafond": 35, "Tbase": 7.5},
    )
"""

from __future__ import annotations

import ast
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# Pre-compile the temporal reference pattern: NDVI(t) → NDVI_t, NDVI(t-1) → NDVI_t_1
_TEMPORAL_RE = re.compile(r"(\w+)\(t(?:-(\d+))?\)")


def _normalize_formula(formula: str) -> str:
    """Normalize temporal refs and special chars for AST parsing.

    ``NDVI(t)``   → ``NDVI_t``
    ``NDVI(t-1)`` → ``NDVI_t_1``
    """

    def _replace_temporal(m: re.Match) -> str:
        name = m.group(1)
        offset = m.group(2)
        if offset:
            return f"{name}_t_{offset}"
        return f"{name}_t"

    return _TEMPORAL_RE.sub(_replace_temporal, formula)


class FormulaEvaluator:
    """Evaluate arithmetic formulas safely using ast."""

    _SAFE_NAMES = {"max", "min", "abs"}

    def evaluate(self, formula: str, context: dict[str, float]) -> float | None:
        """Evaluate a formula string with the given variable context.

        Returns None if evaluation fails (missing variable, parse error, etc.).
        """
        try:
            normalized = _normalize_formula(formula)
            tree = ast.parse(normalized, mode="eval")
            return self._eval_node(tree.body, context)
        except Exception as e:
            logger.debug("Formula evaluation failed for '%s': %s", formula, e)
            return None

    def _eval_node(self, node: ast.AST, ctx: dict[str, float]) -> float:
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return float(node.value)
            raise ValueError(f"Unsupported constant: {node.value}")

        if isinstance(node, ast.Name):
            if node.id in ctx:
                return float(ctx[node.id])
            raise KeyError(f"Unknown variable: {node.id}")

        if isinstance(node, ast.BinOp):
            left = self._eval_node(node.left, ctx)
            right = self._eval_node(node.right, ctx)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                if right == 0:
                    return 0.0
                return left / right
            raise ValueError(f"Unsupported operator: {type(node.op).__name__}")

        if isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand, ctx)
            if isinstance(node.op, ast.USub):
                return -operand
            if isinstance(node.op, ast.UAdd):
                return operand
            raise ValueError(f"Unsupported unary op: {type(node.op).__name__}")

        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise ValueError("Only simple function calls allowed")
            fname = node.func.id
            if fname not in self._SAFE_NAMES:
                raise ValueError(f"Unsupported function: {fname}")
            args = [self._eval_node(arg, ctx) for arg in node.args]
            if fname == "max":
                return max(*args)
            if fname == "min":
                return min(*args)
            if fname == "abs":
                return abs(args[0])
            raise ValueError(f"Unknown function: {fname}")

        raise ValueError(f"Unsupported AST node: {type(node).__name__}")


# Module-level singleton
_evaluator = FormulaEvaluator()


def compute_preliminary_signals(
    formulas: dict[str, str],
    context: dict[str, float],
) -> dict[str, float]:
    """Compute all calculs_preliminaires formulas and return results.

    Formulas are evaluated in definition order. Each computed result is added
    to the context so subsequent formulas can reference it (dependency chain).

    Args:
        formulas: ``calculs_preliminaires`` dict from referential.
        context: Current signal context (Tmax, Tmin, NDVI, etc.).

    Returns:
        Dict of computed signal name → value (only successfully computed ones).
    """
    results: dict[str, float] = {}
    # Work on a copy so formula results can chain
    ctx = dict(context)

    for name, formula in formulas.items():
        if not isinstance(formula, str):
            continue
        value = _evaluator.evaluate(formula, ctx)
        if value is not None:
            results[name] = round(value, 6)
            ctx[name] = value  # available for subsequent formulas

    return results
