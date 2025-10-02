---
id: intro
title: Welcome
sidebar_position: 1
---

This site documents the Agritech project:

- Frontend: React + TypeScript (Vite, TanStack Query/Router, Tailwind).
- Backend: FastAPI service under `satellite-indices-service/`.
- Database: Supabase/Postgres with migrations in `project/supabase/`.
- DevOps: Docker/Dokploy deployments.

## Quick Links

- API Reference: See the OpenAPI page under "/API". Before building, export the schema:

```bash
cd docs
npm run export:openapi
```

- Frontend dev:

```bash
cd project
npm install
npm run dev
```

- Backend dev:

```bash
cd satellite-indices-service
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Contributing to Docs

- Write guides as Markdown/MDX under this folder.
- Use Mermaid diagrams in Markdown blocks: `mermaid` fenced code blocks are supported.
- Keep pages short and task oriented; link to source files where helpful.

