# Strapi CMS - Docker Setup Guide

## Quick Start

Your Strapi CMS is now configured to run with Docker!

### Production Mode

For production deployment (builds are baked into the image):

```bash
cd cms
docker-compose up -d
```

### Development Mode

For local development with hot reloading:

```bash
cd cms
docker-compose -f docker-compose.dev.yml up
```

### 2. Monitor Logs

```bash
docker-compose logs -f strapi
```

Wait for: `Server started on port 1337`

### 3. Access Admin Panel

- **Local**: http://localhost:1337/admin
- **Traefik**: http://cms-agritech-dashboard-g6sumg-2b12b9-5-75-154-125.traefik.me/admin

### 4. Create Admin User

First time only - create your admin account.

## Custom Code

Your Strapi project in `cms/` has full code access:

### Add Custom Routes

Create `cms/src/api/custom/routes/custom.ts`:

```typescript
export default {
  routes: [
    {
      method: 'GET',
      path: '/custom/hello',
      handler: 'custom.hello',
    },
  ],
};
```

### Add Custom Controllers

Create `cms/src/api/custom/controllers/custom.ts`:

```typescript
export default {
  async hello(ctx) {
    ctx.body = { message: 'Hello from custom API!' };
  },
};
```

### Add Custom Services

Create `cms/src/api/custom/services/custom.ts`:

```typescript
export default {
  async customLogic() {
    // Your business logic
    return result;
  },
};
```

## Development Workflow

### Local Development (without Docker)

```bash
cd cms
npm install
npm run develop
```

### With Docker

```bash
cd cms

# Rebuild after code changes
docker-compose build strapi

# Restart
docker-compose restart strapi
```

## Useful Commands

All commands should be run from the `cms/` directory:

```bash
cd cms

# View logs
docker-compose logs -f strapi

# Access container shell
docker-compose exec strapi sh

# Rebuild and restart
docker-compose up -d --build strapi

# Stop services
docker-compose down
```

## Database

PostgreSQL database for Strapi:
- Host: `strapi-db`
- Port: `5432`
- Database: `agritech_strapi`
- User: `strapi`

Access database:
```bash
cd cms
docker-compose exec strapi-db psql -U strapi -d agritech_strapi
```

## Environment Variables

All configuration in `.env`:

```bash
STRAPI_DB_NAME=agritech_strapi
STRAPI_DB_USER=strapi
STRAPI_DB_PASSWORD=<your-password>
STRAPI_JWT_SECRET=<your-secret>
STRAPI_ADMIN_JWT_SECRET=<your-secret>
STRAPI_APP_KEYS=<your-keys>
STRAPI_API_TOKEN_SALT=<your-salt>
STRAPI_TRANSFER_TOKEN_SALT=<your-salt>
```

## Next Steps

1. ✅ Start Strapi: `cd cms && docker-compose up -d`
2. 📝 Create admin user at http://localhost:1337/admin
3. 🎨 Build content types
4. 🔌 Add custom APIs
5. 🚀 Deploy to production
