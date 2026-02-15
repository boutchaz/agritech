# Dev Scripts: Add Marketplace Frontend

## TL;DR

> **Quick Summary**: Update `start-dev.sh` and `stop-dev.sh` to include the marketplace frontend (Next.js) on port 3002, create `.env.local` for local development, and ensure CORS allows the new port.
> 
> **Deliverables**:
> - Updated `start-dev.sh` with marketplace section
> - Updated `stop-dev.sh` to kill marketplace process
> - `marketplace-frontend/.env.local` pointing to local services
> - Updated `marketplace-frontend/package.json` dev port to 3002
> - Updated `agritech-api/.env` CORS to include port 3002
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 1 wave (all independent file edits)
> **Critical Path**: All tasks can run in parallel

---

## Context

### Original Request
Update `start-dev.sh` to also start the marketplace frontend and connect everything for local development.

### Key Discovery: Port Conflict
- NestJS API runs on port **3001** (configured in `agritech-api/.env`: `PORT=3001`)
- Marketplace `package.json` has `next dev --port 3001` — **CONFLICT**
- **Resolution**: Marketplace moves to port **3002**

### Port Matrix (After Changes)
| Service | Port | Process |
|---------|------|---------|
| Supabase | 54321/54322 | Docker |
| NestJS API | 3001 | `nest start` |
| Satellite Service | 8001 | `uvicorn` |
| Main Frontend (Vite) | 5173 | `vite` |
| **Marketplace Frontend** | **3002** | `next dev` |

### Connection Map
```
Marketplace (3002) ──→ NestJS API (3001) ──→ Supabase (54321)
     │                      ↑
     └──→ Supabase (54321)  │
                             │
Main Frontend (5173) ────────┘
```

---

## Work Objectives

### Core Objective
Make `./start-dev.sh` start ALL services including marketplace, with correct local environment configuration.

### Must Have
- Marketplace starts on port 3002 automatically
- Marketplace connects to local Supabase (127.0.0.1:54321)
- Marketplace connects to local NestJS API (localhost:3001)
- `stop-dev.sh` kills marketplace process
- No port conflicts

### Must NOT Have (Guardrails)
- Do NOT change the production `.env` file (`marketplace-frontend/.env`) — it points to remote services
- Do NOT change NestJS API port (keep 3001)
- Do NOT modify any source code files — only scripts and config
- Do NOT use `pnpm` in the scripts — match existing pattern using `npm` and `npx`

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: N/A (shell scripts)
- **Automated tests**: None
- **Agent-Executed QA**: Script runs, port checks

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (All Parallel):
├── Task 1: Update start-dev.sh
├── Task 2: Update stop-dev.sh
├── Task 3: Create marketplace-frontend/.env.local
├── Task 4: Update marketplace-frontend/package.json dev port
└── Task 5: Update agritech-api/.env CORS
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | None | 2, 3, 4, 5 |
| 2 | None | None | 1, 3, 4, 5 |
| 3 | None | None | 1, 2, 4, 5 |
| 4 | None | None | 1, 2, 3, 5 |
| 5 | None | None | 1, 2, 3, 4 |

---

## TODOs

- [ ] 1. Update `start-dev.sh` — Add marketplace frontend section

  **What to do**:
  - Add a new section **6** (between current section 5 "Frontend" and current section 6 "Show Status")
  - Renumber current sections 6 and 7 to 7 and 8
  - The new section should:
    1. `cd "$AGRITECH_ROOT/marketplace-frontend"`
    2. Auto-create `.env.local` if missing (same pattern as the Vite `.env` check)
    3. Run: `nohup npx next dev --port 3002 > "$LOG_DIR/marketplace.log" 2>&1 &`
    4. Echo: `"✅ Marketplace starting on port 3002..."`
    5. `sleep 5`
  - In the status table (section 7), add row: `Marketplace (Next.js)| 3002  | http://localhost:3002  | $LOG_DIR/marketplace.log`
  - In "View logs" section, add: `tail -f $LOG_DIR/marketplace.log`
  - In verification section (section 8), add: `check_port 3002  # Marketplace`
  - In final message, add: `echo "   Marketplace:  http://localhost:3002"`
  - In section 2 (Stop existing services), add: `pkill -f "next dev" 2>/dev/null || true`  — to kill any lingering Next.js dev processes

  **The .env.local auto-creation block** (inside start-dev.sh):
  ```bash
  if [ ! -f .env.local ]; then
      echo "⚠️  Creating .env.local for local development..."
      cat > .env.local << 'MKTENVEOF'
  # Local Development - Marketplace Frontend
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
  NEXT_PUBLIC_API_URL=http://localhost:3001
  MKTENVEOF
  fi
  ```

  **Must NOT do**:
  - Do NOT change existing sections 1-5 (except adding pkill in section 2)
  - Do NOT change npm to pnpm — match existing script patterns

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: Shell script editing, simple file modifications
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `start-dev.sh` — Full file (129 lines), the script to modify
  - `start-dev.sh:29-34` — Section 2 "Stop existing services" — add `pkill -f "next dev"` here
  - `start-dev.sh:66-79` — Section 5 "Start Frontend" — pattern to follow for new section 6
  - `start-dev.sh:83-104` — Section 6 "Show Status" — add marketplace row to table, renumber to section 7
  - `start-dev.sh:108-128` — Section 7 "Verify Services" — add port 3002 check, renumber to section 8
  - `project/.env` line 8 — `VITE_SUPABASE_URL=http://127.0.0.1:54321` — local Supabase URL to reuse
  - `project/.env` line 9 — `VITE_SUPABASE_ANON_KEY=...` — local anon key to reuse

  **Acceptance Criteria**:
  - [ ] Section 2 includes `pkill -f "next dev" 2>/dev/null || true`
  - [ ] New section 6 starts marketplace with `npx next dev --port 3002`
  - [ ] `.env.local` auto-creation with correct local Supabase URL + API URL
  - [ ] Status table shows 5 services including Marketplace on port 3002
  - [ ] `check_port 3002` present in verification section
  - [ ] Log path `$LOG_DIR/marketplace.log` configured
  - [ ] Script syntax valid: `bash -n start-dev.sh` exits 0

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Script syntax is valid
    Tool: Bash
    Steps:
      1. bash -n start-dev.sh
      2. Assert: exit code 0 (no syntax errors)
    Expected Result: No syntax errors
    Evidence: Command output

  Scenario: Script contains all marketplace references
    Tool: Bash (grep)
    Steps:
      1. grep -c "marketplace" start-dev.sh
      2. Assert: count >= 6 (section header, cd, nohup, log line, port check, URL echo)
      3. grep "3002" start-dev.sh
      4. Assert: at least 3 occurrences (dev command, status table, port check)
      5. grep 'pkill -f "next dev"' start-dev.sh
      6. Assert: found in section 2
    Expected Result: All marketplace references present
    Evidence: grep output
  ```

  **Commit**: YES (groups with 2, 3, 4, 5)
  - Message: `chore(devtools): add marketplace frontend to dev scripts and connect local services`
  - Files: `start-dev.sh`

---

- [ ] 2. Update `stop-dev.sh` — Kill marketplace process

  **What to do**:
  - Add `pkill -f "next dev"` in the "Stop Node processes" section
  - Add echo line: `pkill -f "next dev" 2>/dev/null && echo "✅ Marketplace stopped" || echo "ℹ️  Marketplace not running"`

  **Exact edit** — after line 12 (`pkill -f "vite"`), add:
  ```bash
  pkill -f "next dev" 2>/dev/null && echo "✅ Marketplace stopped" || echo "ℹ️  Marketplace not running"
  ```

  **Must NOT do**:
  - Do NOT remove existing pkill commands
  - Do NOT change the Docker/Supabase stop section

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `stop-dev.sh` — Full file (29 lines)
  - `stop-dev.sh:9-12` — "Stop Node processes" section — add marketplace kill here
  - `stop-dev.sh:11` — `pkill -f "nest start"` — pattern to follow

  **Acceptance Criteria**:
  - [ ] `pkill -f "next dev"` present in stop-dev.sh
  - [ ] "Marketplace stopped" echo message present
  - [ ] Script syntax valid: `bash -n stop-dev.sh` exits 0

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Stop script syntax valid and contains marketplace kill
    Tool: Bash
    Steps:
      1. bash -n stop-dev.sh
      2. Assert: exit code 0
      3. grep "next dev" stop-dev.sh
      4. Assert: found
      5. grep -i "marketplace" stop-dev.sh
      6. Assert: found
    Expected Result: Valid script with marketplace stop command
    Evidence: grep output
  ```

  **Commit**: YES (groups with 1, 3, 4, 5)
  - Message: `chore(devtools): add marketplace frontend to dev scripts and connect local services`
  - Files: `stop-dev.sh`

---

- [ ] 3. Create `marketplace-frontend/.env.local` — Local development environment

  **What to do**:
  - Create `marketplace-frontend/.env.local` with local service URLs
  - This overrides the production `.env` (Next.js loads `.env.local` over `.env`)

  **File contents**:
  ```
  # ===========================================
  # LOCAL DEVELOPMENT - Marketplace Frontend
  # ===========================================
  # Overrides .env for local development
  # Points to local Supabase + local NestJS API

  # Local Supabase (started with docker compose in supabase/)
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

  # Local NestJS API
  NEXT_PUBLIC_API_URL=http://localhost:3001
  ```

  **Must NOT do**:
  - Do NOT modify the existing `marketplace-frontend/.env` — it has production URLs
  - Do NOT add secrets or service role keys — marketplace is public-facing

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `marketplace-frontend/.env` — Production env (DO NOT MODIFY), use as template for structure
  - `project/.env` lines 8-9 — Local Supabase URL and anon key to copy
  - `agritech-api/.env` line 8 — `PORT=3001` — confirms API runs on 3001 locally
  - `marketplace-frontend/next.config.ts` lines 22-24 — env vars consumed by Next.js (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`)
  - `marketplace-frontend/src/lib/api.ts` line 89 — `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'` — fallback URL (we override to 3001)

  **Acceptance Criteria**:
  - [ ] File `marketplace-frontend/.env.local` exists
  - [ ] Contains `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  - [ ] Contains `NEXT_PUBLIC_SUPABASE_ANON_KEY` matching local Supabase key
  - [ ] Contains `NEXT_PUBLIC_API_URL=http://localhost:3001`
  - [ ] Original `.env` file unchanged (still has production URLs)

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: .env.local exists with correct values
    Tool: Bash
    Steps:
      1. test -f marketplace-frontend/.env.local && echo "EXISTS" || echo "MISSING"
      2. Assert: "EXISTS"
      3. grep "NEXT_PUBLIC_API_URL=http://localhost:3001" marketplace-frontend/.env.local
      4. Assert: found
      5. grep "127.0.0.1:54321" marketplace-frontend/.env.local
      6. Assert: found
      7. grep "agritech-api.thebzlab.online" marketplace-frontend/.env
      8. Assert: found (production .env unchanged)
    Expected Result: Local env overrides production, production untouched
    Evidence: grep output
  ```

  **Commit**: YES (groups with 1, 2, 4, 5)
  - Message: `chore(devtools): add marketplace frontend to dev scripts and connect local services`
  - Files: `marketplace-frontend/.env.local`

---

- [ ] 4. Update `marketplace-frontend/package.json` — Change dev port to 3002

  **What to do**:
  - Change `"dev": "next dev --port 3001"` to `"dev": "next dev --port 3002"`
  - This makes `pnpm --filter marketplace-frontend dev` also use port 3002
  - The start-dev.sh uses `npx next dev --port 3002` directly, but package.json should match

  **Must NOT do**:
  - Do NOT change any other scripts or dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `marketplace-frontend/package.json` line 6 — `"dev": "next dev --port 3001"` — the line to change
  - `agritech-api/.env` line 8 — `PORT=3001` — proves API occupies 3001

  **Acceptance Criteria**:
  - [ ] `marketplace-frontend/package.json` contains `"dev": "next dev --port 3002"`
  - [ ] No other lines changed in `package.json`

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: package.json has correct dev port
    Tool: Bash
    Steps:
      1. grep '"dev"' marketplace-frontend/package.json
      2. Assert: contains "--port 3002"
      3. Assert: does NOT contain "--port 3001"
    Expected Result: Dev script uses port 3002
    Evidence: grep output
  ```

  **Commit**: YES (groups with 1, 2, 3, 5)
  - Message: `chore(devtools): add marketplace frontend to dev scripts and connect local services`
  - Files: `marketplace-frontend/package.json`

---

- [ ] 5. Update `agritech-api/.env` — Add port 3002 to CORS

  **What to do**:
  - Change `CORS_ORIGIN=http://localhost:5173,http://localhost:3001,http://localhost:8001`
  - To: `CORS_ORIGIN=http://localhost:5173,http://localhost:3001,http://localhost:3002,http://localhost:8001`
  - Add `http://localhost:3002` for the marketplace frontend

  **Note**: The NestJS CORS config in `main.ts` already allows all localhost origins in development mode (line 201: `origin.includes('localhost')`), but it's best practice to be explicit in `.env` too.

  **Must NOT do**:
  - Do NOT change `main.ts` CORS logic
  - Do NOT remove existing CORS origins

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `agritech-api/.env` line 24 — `CORS_ORIGIN=http://localhost:5173,http://localhost:3001,http://localhost:8001`
  - `agritech-api/src/main.ts` lines 164-214 — CORS configuration (already allows all localhost in dev, but explicit is better)

  **Acceptance Criteria**:
  - [ ] `agritech-api/.env` CORS_ORIGIN includes `http://localhost:3002`
  - [ ] All previous origins still present (5173, 3001, 8001)

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: CORS includes marketplace port
    Tool: Bash
    Steps:
      1. grep "CORS_ORIGIN" agritech-api/.env
      2. Assert: contains "localhost:3002"
      3. Assert: contains "localhost:5173" (main frontend)
      4. Assert: contains "localhost:3001" (API self-reference)
      5. Assert: contains "localhost:8001" (satellite)
    Expected Result: All 4 localhost origins present
    Evidence: grep output
  ```

  **Commit**: YES (groups with 1, 2, 3, 4)
  - Message: `chore(devtools): add marketplace frontend to dev scripts and connect local services`
  - Files: `agritech-api/.env`

---

## Commit Strategy

| After Tasks | Message | Files | Verification |
|-------------|---------|-------|--------------|
| 1-5 (all) | `chore(devtools): add marketplace frontend to dev scripts and connect local services` | `start-dev.sh`, `stop-dev.sh`, `marketplace-frontend/.env.local`, `marketplace-frontend/package.json`, `agritech-api/.env` | `bash -n start-dev.sh && bash -n stop-dev.sh` |

---

## Success Criteria

### Verification Commands
```bash
bash -n start-dev.sh          # Expected: exit 0 (syntax valid)
bash -n stop-dev.sh           # Expected: exit 0 (syntax valid)
grep "3002" start-dev.sh      # Expected: multiple matches
grep "next dev" stop-dev.sh   # Expected: 1 match
cat marketplace-frontend/.env.local  # Expected: local URLs
grep "3002" marketplace-frontend/package.json  # Expected: dev script port
grep "3002" agritech-api/.env  # Expected: in CORS_ORIGIN
```

### Final Checklist
- [ ] All 5 services start from `./start-dev.sh`
- [ ] All 5 services stop from `./stop-dev.sh`
- [ ] Marketplace connects to local NestJS API on port 3001
- [ ] Marketplace connects to local Supabase on port 54321
- [ ] No port conflicts between services
- [ ] Production `.env` files unchanged
