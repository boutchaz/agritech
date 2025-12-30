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

Deploy with Docker
------------------

### Local

```bash
cd docs
DOCS_PASSWORD=secret docker-compose up --build
# Access http://localhost:9473 (user: admin)
```

### Dokploy

1. Create **Docker Compose** application
2. Set **Compose Path:** `docs/docker-compose.yml`
3. Add environment variables:
   - `DOCS_USERNAME=admin`
   - `DOCS_PASSWORD=your-secure-password`
4. Deploy and map domain to port 9473

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCS_PORT` | `9473` | Port to expose |
| `DOCS_USERNAME` | `admin` | Basic auth username |
| `DOCS_PASSWORD` | `changeme` | Basic auth password |

Notes
-----

- The site supports Mermaid diagrams and local search.
- The API page reads `openapi/openapi.json`; re-export whenever the backend changes.
- **Security:** Never commit `.htpasswd` to git. It's in `.gitignore`.
- Health check endpoint `/health` is available without authentication.
