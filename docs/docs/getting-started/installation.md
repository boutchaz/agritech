---
sidebar_position: 1
---

# Installation

This guide will help you set up the AgriTech Platform development environment on your local machine.

## Prerequisites

- **Node.js** 20.x or 22.x (recommended)
- **pnpm** 8.x or later
- **Docker** and Docker Compose
- **PostgreSQL** client tools (optional)
- **Git**

## Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v20.x or v22.x

# Check pnpm installation
pnpm --version  # Should be 8.x or later

# Check Docker
docker --version
docker-compose --version
```

If Node.js is not installed or the wrong version:

```bash
# Using nvm (recommended)
nvm install 22
nvm use 22

# Install pnpm
npm install -g pnpm
```

## Clone the Repository

```bash
git clone https://github.com/agritech/platform.git agritech
cd agritech
```

## Environment Setup

### 1. Install Dependencies

The project uses pnpm workspaces. Install all dependencies:

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment files and configure them:

```bash
# Backend environment
cp agritech-api/.env.example agritech-api/.env

# Frontend environment
cp project/.env.example project/.env
```

#### Backend Environment Variables

```bash
# agritech-api/.env

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agritech

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRATION=7d

# Polar.sh
POLAR_CHECKOUT_URL=https://polar.sh/checkout
POLAR_WEBHOOK_SECRET=your-webhook-secret

# API
PORT=3001
API_URL=http://localhost:3001
```

#### Frontend Environment Variables

```bash
# project/.env

# API
VITE_API_URL=http://localhost:3001

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Polar
VITE_POLAR_CHECKOUT_URL=https://polar.sh/checkout
```

#### Satellite/AI Backend Environment Variables

```bash
# backend-service/.env
SATELLITE_PROVIDER=auto
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY='{"type": "service_account", ...}'
```

### 3. Start Services

Start the database and other services using Docker Compose:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Redis (for caching)
- Any other required services

### 4. Run Database Migrations

```bash
cd agritech-api
pnpm migration:run
```

### 5. Seed Database (Optional)

For development, you can seed the database with sample data:

```bash
cd agritech-api
pnpm seed
```

## Running the Development Servers

### Backend (NestJS API)

```bash
cd agritech-api
pnpm start:dev
```

The API will be available at `http://localhost:3001`

- API Documentation (Swagger): `http://localhost:3001/api`
- GraphQL Playground (if enabled): `http://localhost:3001/graphql`

### Frontend (React App)

```bash
cd project
pnpm dev
```

The app will be available at `http://localhost:5173`

### Mobile App (React Native)

```bash
cd mobile
pnpm start
```

### Satellite/AI Backend Service (Python)

```bash
cd backend-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

The service will be available at `http://localhost:8001`

- API Documentation (Swagger): `http://localhost:8001/docs`

### Desktop App (Tauri)

Requires the Rust toolchain. Install from [rustup.rs](https://rustup.rs) if not already installed.

```bash
# Desktop (requires Rust toolchain)
pnpm tauri:dev     # Dev with hot-reload
pnpm tauri:build   # Build for current platform
```

### Admin App

```bash
cd admin-app
pnpm dev
```

### Summary: All Development Servers

| Service | Command | URL |
|---------|---------|-----|
| NestJS API | `pnpm --filter agritech-api start:dev` | http://localhost:3001 |
| Frontend | `pnpm --filter agriprofy dev` | http://localhost:5173 |
| Satellite & AI Service (Python) | `uvicorn app.main:app --reload --port 8001` | http://localhost:8001/docs |
| Mobile | `cd mobile && pnpm start` | Expo DevTools |
| Desktop | `pnpm tauri:dev` | Native window |

```bash
# Satellite & AI Service (Python)
cd backend-service
uvicorn app.main:app --reload --port 8001
# Available at http://localhost:8001/docs (Swagger)
```

## Verify Installation

### 1. Check API Health

```bash
curl http://localhost:3001/health
```

Should return: `{"status":"ok"}`

### 2. Access Swagger Documentation

Visit `http://localhost:3001/api` in your browser

### 3. Access Frontend

Visit `http://localhost:5173` in your browser

## Supabase Setup

If you don't have a Supabase project:

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and keys from Settings > API
4. Update your `.env` files with these values

### Run Supabase Migrations

```bash
cd supabase
supabase db push
```

## Polar.sh Setup (for Subscriptions)

1. Create a Polar.sh account at [polar.sh](https://polar.sh)
2. Create products matching your plan tiers:
   - Essential Plan ($25/mo)
   - Professional Plan ($75/mo)
   - Enterprise Plan (Custom)
3. Configure webhook endpoint: `https://your-api.com/webhooks/polar`
4. Copy product IDs to `subscription-config.ts`

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port in .env
PORT=3002
```

### Database Connection Issues

```bash
# Check Docker containers
docker-compose ps

# Restart database
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

### Migration Errors

```bash
# Rollback migrations
cd agritech-api
pnpm migration:revert

# Check migration status
pnpm migration:show
```

### pnpm Install Issues

```bash
# Clear pnpm store
pnpm store prune

# Delete node_modules and reinstall
rm -rf node_modules agritech-api/node_modules project/node_modules
pnpm install
```

## Development Tools

### Recommended VS Code Extensions

- **ESLint** - Linting
- **Prettier** - Code formatting
- **Prisma** - Database tools
- **Thunder Client** - API testing
- **GitLens** - Git supercharged
- **Material Icon Theme** - File icons

### Git Hooks

The project uses Lefthook for Git hooks:

```bash
# Lefthook configuration is in lefthook.yml
# Hooks run automatically on pre-commit
```

## Next Steps

- [Quick Start](/getting-started/quick-start) - First-time setup guide
- [Environment Setup](/getting-started/environment-setup) - Detailed environment configuration
- [First Deployment](/getting-started/first-deployment) - Deploy to production

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](/troubleshooting) guide
2. Search existing [GitHub issues](https://github.com/agritech/platform/issues)
3. Create a new issue with details about your environment

## References

- [Environment Setup](/getting-started/environment-setup)
- [Quick Start](/getting-started/quick-start)
- [Development](/development/coding-standards)
