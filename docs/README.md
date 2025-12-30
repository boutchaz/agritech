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

Deploy with Basic Auth
----------------------

The documentation is protected with HTTP Basic Authentication in production.

### Quick Start

```bash
cd docs

npm ci && npm run build

cd deploy
cp .env.example .env

./setup-auth.sh admin yourpassword

docker-compose up -d
```

### Manual Setup

1. **Build the documentation:**
   ```bash
   cd docs && npm ci && npm run build
   ```

2. **Create credentials file:**
   ```bash
   cd deploy
   
   # Option A: Interactive (prompts for password)
   ./setup-auth.sh admin
   
   # Option B: Non-interactive
   ./setup-auth.sh admin yourpassword
   
   # Option C: Using htpasswd directly
   htpasswd -c .htpasswd admin
   ```

3. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   # Edit .env to change port or hostname
   ```

4. **Start the server:**
   ```bash
   docker-compose up -d
   ```

5. **Access:** Open `http://localhost:8080` and enter credentials.

### Adding More Users

```bash
htpasswd deploy/.htpasswd newuser
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCS_PORT` | `8080` | Port to expose the docs |
| `DOCS_HOST` | `localhost` | Hostname for the server |
| `DOCS_USERNAME` | `admin` | Default username for setup script |
| `DOCS_PASSWORD` | - | Password (prompted if not set) |

Deploy on Dokploy
-----------------

1. Build locally: `cd docs && npm ci && npm run build`
2. Create `.htpasswd` file: `cd deploy && ./setup-auth.sh admin`
3. In Dokploy, create a Docker Compose app using `docs/deploy/docker-compose.yml`
4. Upload the `deploy/` folder including `.htpasswd` and `nginx.conf`
5. Map your domain to the `docs` service (port 8080)

Notes
-----

- The site supports Mermaid diagrams and local search.
- The API page reads `openapi/openapi.json`; re-export whenever the backend changes.
- **Security:** Never commit `.htpasswd` to git. It's in `.gitignore`.
- Health check endpoint `/health` is available without authentication.
