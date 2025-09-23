# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React + TypeScript app (Vite). Key folders: `components/`, `routes/`, `hooks/`, `services/`, `utils/`, `types/`.
- `supabase/`: Local dev stack, SQL, migrations, and edge functions.
- `dist/`: Production build output (ignored by lint/tests).
- Root tooling: `eslint.config.js`, `tailwind.config.js`, `vite.config.ts`, `tsconfig*.json`, Docker files, and env files (`.env`). See `ENVIRONMENT_SETUP.md` for local setup.

## Build, Test, and Development Commands
- `npm run dev`: Start Vite dev server.
- `npm run build`: Type-check then build to `dist/`.
- `npm run preview`: Serve the production build locally.
- `npm run lint`: Lint TS/TSX with ESLint.
- `npm test`: Run Vitest suite once (CI-friendly).
- `npm run test:watch`: Watch mode for tests.
- Database:
  - `npm run db:start|db:stop`: Start/stop local Supabase.
  - `npm run db:migrate`: Apply migrations via `simple-migrate.ts`.
  - `npm run db:reset`: Recreate local DB (destructive).
  - `npm run db:setup`: Seed/initialize local DB.

## Coding Style & Naming Conventions
- Language: TypeScript, React 18.
- Linting: ESLint (recommended + React Hooks rules). Fix issues before PRs.
- Indentation: 2 spaces; use Prettier-compatible style if configured by editor.
- Components: `PascalCase` in `src/components` (e.g., `UserCard.tsx`).
- Hooks: `useXxx` in `src/hooks` (e.g., `useParcels.ts`).
- Services/Utils: `camelCase` files (e.g., `satelliteIndicesService.ts`).
- Tailwind: Prefer utility classes; keep component styles local.

## Testing Guidelines
- Runner: Vitest (`vitest.config.ts`) with `jsdom`, globals, and `@testing-library/jest-dom` in setup.
- Layout: `src/**/__tests__/*.test.tsx` or co-located `*.test.tsx`.
- Example: `src/components/__tests__/UserCard.test.tsx`.
- Keep tests deterministic; mock network/Supabase where practical.

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (`feat:`, `fix:`, `chore:`). Small, focused changes.
- PRs: Include summary, screenshots for UI, and steps to verify. Link issues.
- DB changes: Describe migration intent and update `DATABASE_MIGRATION_SUMMARY.md` when relevant.

## Security & Configuration Tips
- Never commit secrets. Use `.env` (see `.env.backup` for reference) and `.dockerignore`.
- Supabase: Ensure local keys match `supabase/config.toml`. Rotate keys if leaked.
- Migrations: Review SQL before applying; verify on a fresh `db:reset`.

## Architecture Overview
- SPA built with Vite + React Query + TanStack Router; Supabase for auth/data; OpenLayers for maps; optional Socket.IO client for realtime.
