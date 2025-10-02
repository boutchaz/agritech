Agritech Docs
=============

Commands
--------

- Install: `cd docs && npm install`
- Export OpenAPI: `npm run export:openapi` (writes to `openapi/openapi.json`)
- Dev server: `npm start`
- Build: `npm run build` (outputs to `build/`)
- Build all (export API + build): `npm run build:all`

FastAPI OpenAPI Export
----------------------

- Requires Python deps installed for `satellite-indices-service`.
- Script: `satellite-indices-service/scripts/export_openapi.py`
- Example:

```bash
cd docs
python3 ../satellite-indices-service/scripts/export_openapi.py > openapi/openapi.json
```

Deploy on Dokploy (static)
--------------------------

1. Build locally: `cd docs && npm ci && npm run build:all`.
2. In Dokploy, create a Docker Compose app using `docs/deploy/docker-compose.yml`.
3. Map your domain to the `docs` service (port 8080→80 as needed).

Notes
-----

- The site supports Mermaid diagrams and local search.
- The API page reads `openapi/openapi.json`; re-export whenever the backend changes.

