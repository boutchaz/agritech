# Spec: Condition Evaluator

## evaluate(condition, context) → bool

### Constant comparisons

GIVEN context `{"GDD_cumul": 400}`
WHEN evaluating `{"var": "GDD_cumul", "gte": 350}`
THEN returns `true`

GIVEN context `{"GDD_cumul": 280}`
WHEN evaluating `{"var": "GDD_cumul", "gte": 350}`
THEN returns `false`

GIVEN context `{"Tmoy": 25.5}`
WHEN evaluating `{"var": "Tmoy", "gt": 25}`
THEN returns `true`

GIVEN context `{"Tmoy": 25.0}`
WHEN evaluating `{"var": "Tmoy", "gt": 25}`
THEN returns `false` (gt is strict)

GIVEN context `{"chill_satisfied": true}`
WHEN evaluating `{"var": "chill_satisfied", "eq": true}`
THEN returns `true`

GIVEN context `{"option_C": true}`
WHEN evaluating `{"var": "option_C", "neq": true}`
THEN returns `false`

### Range and set membership

GIVEN context `{"GDD_cumul": 500}`
WHEN evaluating `{"var": "GDD_cumul", "between": [350, 700]}`
THEN returns `true`

GIVEN context `{"GDD_cumul": 350}`
WHEN evaluating `{"var": "GDD_cumul", "between": [350, 700]}`
THEN returns `true` (inclusive)

GIVEN context `{"GDD_cumul": 800}`
WHEN evaluating `{"var": "GDD_cumul", "between": [350, 700]}`
THEN returns `false`

GIVEN context `{"systeme": "intensif"}`
WHEN evaluating `{"var": "systeme", "in": ["intensif", "super_intensif"]}`
THEN returns `true`

GIVEN context `{"systeme": "traditionnel"}`
WHEN evaluating `{"var": "systeme", "in": ["intensif", "super_intensif"]}`
THEN returns `false`

### Variable-vs-variable comparisons

GIVEN context `{"Tmoy": 12, "Tmoy_Q25": 15}`
WHEN evaluating `{"var": "Tmoy", "lt_var": "Tmoy_Q25"}`
THEN returns `true`

GIVEN context `{"NIRv_current": 0.3, "NIRv_summer_mean": 0.6}`
WHEN evaluating `{"var": "NIRv_current", "lt_var": "NIRv_summer_mean", "factor": 0.6}`
THEN returns `true` (0.3 < 0.6 * 0.6 = 0.36)

GIVEN context `{"NIRv_current": 0.4, "NIRv_summer_mean": 0.6}`
WHEN evaluating `{"var": "NIRv_current", "lt_var": "NIRv_summer_mean", "factor": 0.6}`
THEN returns `false` (0.4 >= 0.36)

### Boolean combinators

GIVEN context `{"GDD_cumul": 400, "Tmoy": 19}`
WHEN evaluating `{"and": [{"var": "GDD_cumul", "gte": 350}, {"var": "Tmoy", "gte": 18}]}`
THEN returns `true`

GIVEN context `{"GDD_cumul": 400, "Tmoy": 16}`
WHEN evaluating `{"and": [{"var": "GDD_cumul", "gte": 350}, {"var": "Tmoy", "gte": 18}]}`
THEN returns `false` (Tmoy fails)

GIVEN context `{"GDD_cumul": 800, "hot_streak": 3}`
WHEN evaluating `{"or": [{"var": "GDD_cumul", "gt": 700}, {"var": "hot_streak", "gte": 5}]}`
THEN returns `true` (GDD passes, streak irrelevant)

GIVEN context `{"option_C": true}`
WHEN evaluating `{"not": {"var": "option_C", "eq": true}}`
THEN returns `false`

### Nested combinators

GIVEN context `{"GDD_cumul": 500, "Tmoy": 26, "hot_streak": 6}`
WHEN evaluating `{"and": [{"var": "GDD_cumul", "between": [350, 700]}, {"or": [{"var": "Tmoy", "gt": 25}, {"var": "hot_streak", "gte": 5}]}]}`
THEN returns `true`

### Missing variables

GIVEN context `{}` (empty)
WHEN evaluating `{"var": "GDD_cumul", "gte": 350}`
THEN returns `false` (missing variable = not met)

GIVEN context `{"Tmoy": 20}`
WHEN evaluating `{"var": "Tmoy", "lt_var": "Tmoy_Q25"}`
THEN returns `false` (reference variable missing)

### Bare arrays rejected

GIVEN condition `[{"var": "x", "eq": 1}, {"var": "y", "eq": 2}]`
WHEN evaluating
THEN raises ValueError (must use explicit and/or wrapper)

### Diagnostics

GIVEN context `{"GDD_cumul": 280, "Tmoy": 19}` and diagnostics=[]
WHEN evaluating `{"and": [{"var": "GDD_cumul", "gte": 350}, {"var": "Tmoy", "gte": 18}]}`
THEN returns `false`
AND diagnostics contains entry `{"var": "GDD_cumul", "op": "gte", "expected": 350, "actual": 280, "result": false}`
AND diagnostics contains entry `{"var": "Tmoy", "op": "gte", "expected": 18, "actual": 19, "result": true}`
