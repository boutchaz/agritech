# Design: Referential Condition Engine

## Design Decisions

### 1. Explicit wrapping required for condition arrays

`conditions_activation` and any other condition list MUST be explicitly wrapped
in `{"and": [...]}` or `{"or": [...]}`. No auto-wrapping of bare arrays.

**Why:** Implicit AND is a hidden default. When an agronomist adds a condition to
a list, they should know whether it's AND or OR. Explicit wrapping makes the logic
visible and prevents bugs where someone assumes OR when the system applies AND.

```json
// CORRECT — explicit
"conditions_activation": {
  "and": [
    { "var": "systeme", "in": ["intensif", "super_intensif"] },
    { "var": "historique_satellite", "gte": 24 }
  ]
}

// WRONG — bare array, evaluator rejects
"conditions_activation": [
  { "var": "systeme", "in": ["intensif"] },
  { "var": "historique_satellite", "gte": 24 }
]
```

### 2. Evaluator logs failed clauses for debugging

`evaluate()` accepts an optional diagnostics collector. When provided, every
clause that evaluates to `false` is recorded with its variable name, expected
value, and actual value from context. This enables:
- Calibration debug view: "why didn't this phase transition fire?"
- Alert triage: "which condition blocked this alert?"
- No performance cost when diagnostics not requested (default path skips logging)

```python
diag = []
result = evaluate(condition, context, diagnostics=diag)
# diag = [
#   {"var": "GDD_cumul", "op": "gte", "expected": 350, "actual": 280, "result": False},
#   {"var": "Tmoy", "op": "gte", "expected": 18, "actual": 19.2, "result": True},
# ]
```

### 3. Streak definitions live in referential `signaux.streaks` block

Streak thresholds are defined in the referential using the same condition schema.
The signal layer reads these definitions and pre-computes counters daily. Phase
conditions then check the counter values as simple numeric comparisons.

**Why:** Streaks require state across days (the signal layer tracks consecutive
days). The evaluator is stateless (evaluates one point in time). Putting streak
thresholds in phase conditions would force the evaluator to become stateful.
Instead, the signal layer evaluates streak conditions daily to maintain counters,
and the phase evaluator checks the pre-computed counters.

```json
"signaux": {
  "streaks": {
    "warm_streak":    { "var": "Tmoy", "gt_var": "Tmoy_Q25" },
    "cold_streak":    { "var": "Tmoy", "lt_var": "Tmoy_Q25" },
    "hot_streak":     { "var": "Tmoy", "gt": 25 },
    "hot_dry_streak": { "and": [
      { "var": "Tmax", "gt": 30 },
      { "var": "precip_30j", "lt": 5 }
    ]}
  }
}
```

Signal layer each day: for each streak definition, evaluate condition against
raw weather context. If true, increment counter. If false, reset to 0. Expose
counter as `context[streak_name]`. New streak type = add key to JSON, zero Python.

```
signaux.streaks (referential)    signal layer              phase conditions
─────────────────────────        ──────────────            ─────────────────
hot_streak: {Tmoy > 25}  ──→  evaluate daily ──→  hot_streak: 3  ──→  {var: hot_streak, gte: 5}
                               true? count++                           → false (3 < 5)
                               false? reset 0
```

---

## Condition Schema Specification

### Atomic Clauses

```
Comparison against constant:
  { "var": "<name>", "<op>": <value> }
  ops: eq, neq, gt, gte, lt, lte

Range check:
  { "var": "<name>", "between": [<min>, <max>] }
  Evaluates: min <= ctx[name] <= max

Set membership:
  { "var": "<name>", "in": [<val1>, <val2>, ...] }
  Evaluates: ctx[name] in set

Variable-vs-variable:
  { "var": "<name>", "<op>_var": "<other>", "factor": <f> }
  ops: gt_var, gte_var, lt_var, lte_var
  Evaluates: ctx[name] <op> ctx[other] * factor
  factor defaults to 1.0 if omitted
```

### Combinators

```
{ "and": [ <clause>, <clause>, ... ] }   all must be true
{ "or":  [ <clause>, <clause>, ... ] }   at least one true
{ "not": <clause> }                       negation
```

Nesting is unlimited: `{ "and": [{ "or": [c1, c2] }, c3] }`

### Phase Transition

```json
{
  "target": "<phase_name>",
  "when": <condition>,
  "confidence": "ELEVEE | MODEREE | FAIBLE"
}
```

### Phase Definition (new referential format)

```json
"phases": {
  "DORMANCE": {
    "skip_when": { "var": "Tmoy_Q25", "gte": 15 },
    "entry": {
      "when": { "and": [
        { "var": "Tmoy", "lt_var": "Tmoy_Q25" },
        { "var": "NIRv_norm", "lte": 0.15 }
      ]}
    },
    "exit": [
      {
        "target": "DEBOURREMENT",
        "when": { "and": [
          { "var": "chill_satisfied", "eq": true },
          { "var": "warm_streak", "gte": 10 }
        ]},
        "confidence": "MODEREE"
      }
    ]
  },
  "DEBOURREMENT": {
    "exit": [
      {
        "target": "FLORAISON",
        "when": { "and": [
          { "var": "GDD_cumul", "gte": 350 },
          { "var": "Tmoy", "gte": 18 }
        ]},
        "confidence": "MODEREE"
      }
    ]
  },
  "FLORAISON": {
    "exit": [
      {
        "target": "NOUAISON",
        "when": { "or": [
          { "var": "GDD_cumul", "gt": 700 },
          { "var": "hot_streak", "gte": 5 }
        ]},
        "confidence": "MODEREE"
      }
    ]
  },
  "NOUAISON": {
    "exit": [
      {
        "target": "STRESS_ESTIVAL",
        "when": { "var": "hot_dry_streak", "gte": 3 },
        "confidence": "ELEVEE"
      }
    ]
  },
  "STRESS_ESTIVAL": {
    "exit": [
      {
        "target": "REPRISE_AUTOMNALE",
        "when": { "and": [
          { "var": "precip_30j", "gt": 20 },
          { "var": "Tmoy", "lt": 25 },
          { "var": "d_nirv_dt", "gt": 0 }
        ]},
        "confidence": "MODEREE"
      },
      {
        "target": "DORMANCE",
        "when": { "var": "cold_streak", "gte": 10 },
        "confidence": "ELEVEE"
      }
    ]
  },
  "REPRISE_AUTOMNALE": {
    "exit": [
      {
        "target": "DORMANCE",
        "when": { "var": "cold_streak", "gte": 10 },
        "confidence": "ELEVEE"
      }
    ]
  }
}
```

Key changes from current format:
- Phase names are the dict keys (not PHASE_0, PHASE_1, etc.)
- `exit` is an array — multiple exit transitions per phase (ordered by priority)
- `skip_when` replaces `verification_prealable`
- `entry.when` replaces `condition_entree`
- No `condition_maintien` — maintenance is implicit (stay until an exit fires)
- Streak thresholds embedded in conditions (not separate config fields)

## Evaluator Pseudocode

```python
def evaluate(condition: dict, context: dict) -> bool:
    if "and" in condition:
        return all(evaluate(c, context) for c in condition["and"])
    if "or" in condition:
        return any(evaluate(c, context) for c in condition["or"])
    if "not" in condition:
        return not evaluate(condition["not"], context)

    var_name = condition["var"]
    value = context.get(var_name)
    if value is None:
        return False  # missing variable = condition not met

    # Variable-vs-variable comparisons
    for op_var in ("gt_var", "gte_var", "lt_var", "lte_var"):
        if op_var in condition:
            other = context.get(condition[op_var])
            if other is None:
                return False
            factor = condition.get("factor", 1.0)
            ref = other * factor
            op = op_var.replace("_var", "")  # gt, gte, lt, lte
            return _compare(value, op, ref)

    # Constant comparisons
    if "eq" in condition:    return value == condition["eq"]
    if "neq" in condition:   return value != condition["neq"]
    if "gt" in condition:    return value > condition["gt"]
    if "gte" in condition:   return value >= condition["gte"]
    if "lt" in condition:    return value < condition["lt"]
    if "lte" in condition:   return value <= condition["lte"]
    if "between" in condition:
        lo, hi = condition["between"]
        return lo <= value <= hi
    if "in" in condition:
        return value in condition["in"]

    return False  # unknown operator
```

## State Machine Rewrite

### Current: hardcoded handlers + PhaseConfig

```python
class PhaseConfig:
    gdd_debourrement_exit: float = 350.0
    tmoy_floraison_min: float = 18.0
    gdd_floraison_exit: float = 700.0
    # ... 15 more fields

def _handle_debourrement(machine, signals):
    machine.gdd_cumul += signals.gdd_jour
    if (machine.gdd_cumul >= machine.cfg.gdd_debourrement_exit
            and signals.tmoy >= machine.cfg.tmoy_floraison_min):
        machine._transition_to(OlivePhase.FLORAISON, signals)
```

### New: generic handler driven by condition trees

```python
@dataclass
class PhaseDefinition:
    name: str
    exits: list[dict]        # [{target, when, confidence}]
    skip_when: dict | None   # condition to skip this phase entirely
    entry_when: dict | None  # condition for entering this phase

class CropPhaseStateMachine:
    def __init__(self, phases: list[PhaseDefinition], ...):
        self.phases_by_name = {p.name: p for p in phases}

    def process_day(self, signals: DailySignals):
        context = self._build_context(signals)
        phase_def = self.phases_by_name[self.current_phase.value]

        for exit_rule in phase_def.exits:
            if evaluate(exit_rule["when"], context):
                target = exit_rule["target"]
                confidence = exit_rule.get("confidence", "MODEREE")
                # Resolve through active_phases (maturity filtering)
                self._transition_to(target, signals, confidence)
                break

    def _build_context(self, signals: DailySignals) -> dict:
        return {
            "Tmoy": signals.tmoy,
            "Tmax": signals.tmax,
            "Tmin": signals.tmin,
            "precip": signals.precip,
            "precip_30j": signals.precip_30j,
            "GDD_cumul": self.gdd_cumul,
            "gdd_jour": signals.gdd_jour,
            "d_nirv_dt": signals.d_nirv_dt,
            "d_ndvi_dt": signals.d_ndvi_dt,
            "Tmoy_Q25": self.tmoy_q25,
            "chill_satisfied": self.chill_satisfied,
            "chill_cumul": self.chill_cumul,
            "warm_streak": self.warm_streak,
            "cold_streak": self.cold_streak,
            "hot_streak": self.hot_streak,
            "hot_dry_streak": self.hot_dry_streak,
            "current_phase": self.current_phase.value,
            # ... satellite values, NIRv norm, etc.
        }
```

The 6 `_handle_*()` functions collapse into ONE `process_day()` loop.
PhaseConfig's 15+ threshold fields disappear. The referential JSON IS the config.

## Signal Computer Changes

Streak tracking currently lives inside the state machine handlers.
Extract to the signal layer so they're available in the context dict:

```python
# In process_day(), before evaluate():
if signals.tmoy > self.tmoy_q25:
    self.warm_streak += 1
else:
    self.warm_streak = 0

if signals.tmoy < self.tmoy_q25:
    self.cold_streak += 1
else:
    self.cold_streak = 0

# ... same for hot_streak, hot_dry_streak
```

This stays in the machine (it needs state across days) but happens
BEFORE the condition evaluation, making streaks available as context vars.

## Migration Strategy

1. Write `condition_evaluator.py` + tests
2. Migrate DATA_OLIVIER.json phases to structured format
3. Rewrite `extract_phase_config()` to parse new format (with fallback to regex for unmigrated crops)
4. Rewrite phase handlers to use evaluate()
5. Migrate remaining 3 crop referentials
6. Remove regex extractors and PhaseConfig threshold fields
7. Write TypeScript mirror evaluator
8. Align alert-taxonomy.ts with shared schema
