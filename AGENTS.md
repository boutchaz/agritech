# Repository Guidelines

## Project Structure & Modules
- `project/`: React + TypeScript frontend (Vite, TanStack Router, Tailwind). Source in `project/src/` with `components/`, `routes/`, `lib/`, `utils/`.
- `satellite-indices-service/`: FastAPI backend. API in `app/api/`, services in `app/services/`, config in `app/core/`.
- `project/supabase/`: Local Supabase config, schema, and migrations.
- Root utilities: `docker-compose.yml`, `.env.example`, scripts like `pg_dump_schema.sh`.

## Build, Test, and Dev Commands
- Frontend dev: `cd project && npm install && npm run dev` – start Vite dev server.
- Frontend build/preview: `npm run build` then `npm run preview` – production build and local preview.
- Frontend lint: `npm run lint` – ESLint per `eslint.config.js`.
- Frontend tests: `npm run test` or `npm run test:watch` – Vitest.
- Backend dev: `cd satellite-indices-service && pip install -r requirements.txt && uvicorn app.main:app --reload` – run FastAPI.
- Docker (root): `docker-compose up -d` – start services with defaults.
- Database (from `project/`): `npm run db:migrate`, `npm run db:generate-types`, `npm run db:deploy` – manage Supabase schema/types.

## Coding Style & Naming
- TypeScript/React: 2-space indent, `camelCase` variables, `PascalCase` components, route files like `settings.profile.tsx` and dynamic routes like `$moduleId.tsx`.
- Python: type hints required; keep modules small and focused under `app/services` and `app/api`.
- Linting/formatting: ESLint enabled for TS; keep imports sorted and avoid unused exports. Prefer functional React components and hooks.

## Testing Guidelines
- Frontend: place tests alongside code or under `project/src/test/` as `*.test.ts(x)`. Run with `npm run test`.
- Backend: prefer `pytest` with files named `test_*.py` (examples: `test_supabase_storage.py`). Add API tests per router in `app/api/`.
- Aim for meaningful coverage on business logic in `services/` and critical routes.

## Commit & PR Guidelines
- Messages: imperative, concise subjects (e.g., "Fix heatmap data schema", "Add raster grid sampling"). Avoid "wip" in main branch history.
- PRs: include scope (`frontend`, `backend`, `db`), clear description, linked issues, and screenshots or curl examples for UI/API changes. Note breaking changes and env vars.

## Security & Config
- Do not commit secrets. Copy `.env.example` to `.env` where needed (`project/`, `satellite-indices-service/`).
- Required keys: Supabase (`URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`) and GEE credentials for the backend.
- Regenerate DB types after schema changes: `npm run db:generate-types`.

