---
title: Quick Start
sidebar_position: 2
---

# Quick Start Guide

This guide will help you get the AgriTech Platform up and running on your local machine in just a few minutes.

## Prerequisites

Before you begin, make sure you've completed the [Installation](./installation.md) guide and have all required software installed.

## Step 1: Clone the Repository

Clone the AgriTech Platform repository to your local machine:

```bash
git clone https://github.com/your-org/agritech.git
cd agritech
```

## Step 2: Install Frontend Dependencies

Navigate to the project directory and install the frontend dependencies:

```bash
cd project
npm install
```

This will install all required packages including:
- React 19 with TypeScript
- TanStack Router and Query
- Tailwind CSS
- React Hook Form with Zod validation
- Supabase client libraries
- UI components and utilities

:::tip
If you prefer Yarn, you can use `yarn install` instead.
:::

## Step 3: Set Up Environment Variables

Create a `.env` file in the `project` directory:

```bash
# From the project directory
cp .env.example .env
```

Edit the `.env` file with your configuration:

```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key
VITE_SATELLITE_SERVICE_URL=http://localhost:8001
VITE_POLAR_ACCESS_TOKEN=your_polar_token_optional
```

:::info
For local development, you can use the Supabase local instance. The default URL is `http://localhost:54321`. See [Environment Setup](./environment-setup.md) for detailed configuration.
:::

## Step 4: Start Local Supabase

Start the local Supabase instance (this requires Docker to be running):

```bash
# From the project directory
npm run db:start
```

This command will:
- Start PostgreSQL database
- Start Supabase Studio (database UI) at `http://localhost:54323`
- Start authentication service
- Start storage service
- Apply all database migrations

:::warning
Make sure Docker Desktop is running before executing this command. The process may take a few minutes on first run as it downloads Docker images.
:::

**Verify Supabase is running:**

Open your browser and navigate to:
- **Supabase Studio**: [http://localhost:54323](http://localhost:54323)
- **API**: [http://localhost:54321](http://localhost:54321)

## Step 5: Install Satellite Service Dependencies

In a new terminal window, navigate to the satellite service directory and install Python dependencies:

```bash
cd satellite-indices-service

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Step 6: Configure Satellite Service

Create a `.env` file in the `satellite-indices-service` directory:

```bash
cp .env.example .env
```

Edit the `.env` file:

```bash
# Google Earth Engine credentials (required for satellite features)
GEE_SERVICE_ACCOUNT=your_gee_service_account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY=your_gee_private_key
GEE_PROJECT_ID=your_gee_project_id

# Supabase connection
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=your_service_role_key

# Redis (optional, for background jobs)
REDIS_URL=redis://localhost:6379/0
```

:::tip
You can skip Google Earth Engine configuration for initial setup. The app will work without satellite features, but you won't be able to perform vegetation analysis. See [Environment Setup](./environment-setup.md) for GEE setup instructions.
:::

## Step 7: Start the Satellite Service

With the virtual environment activated, start the FastAPI server:

```bash
# From satellite-indices-service directory
python -m uvicorn app.main:app --reload --port 8001
```

The satellite service will be available at [http://localhost:8001](http://localhost:8001).

**Verify the service is running:**

```bash
curl http://localhost:8001/health
# Should return: {"status":"healthy"}
```

**View API documentation:**

Open [http://localhost:8001/docs](http://localhost:8001/docs) in your browser to see the interactive API documentation.

## Step 8: Start the Frontend Development Server

In another terminal window, start the Vite development server:

```bash
cd project
npm run dev
```

The application will be available at [http://localhost:5173](http://localhost:5173).

:::success
You should now see the AgriTech Platform login page! The app will automatically reload when you make changes to the code.
:::

## Step 9: Create Your First User

1. Open [http://localhost:5173](http://localhost:5173) in your browser
2. Click on "Sign Up" to create a new account
3. Enter your email and password
4. Check your email for a confirmation link (in development, check the Supabase Studio Logs)
5. Log in with your credentials

:::info
In local development, Supabase uses Inbucket for email testing. Access the inbox at [http://localhost:54324](http://localhost:54324) to see confirmation emails.
:::

## Step 10: Set Up Your Organization

After logging in for the first time:

1. You'll be prompted to create your first organization
2. Enter your organization name (e.g., "My Farm")
3. Select your timezone and currency
4. Click "Create Organization"

You're now ready to start using the platform!

## Optional: Start Background Job Processing

If you need background job processing for batch satellite analysis:

```bash
# Start Redis server (in a new terminal)
redis-server

# Start Celery worker (in the satellite-indices-service directory)
celery -A app.celery_app worker --loglevel=info
```

## Quick Reference: Running Services

Here's a quick reference for starting all services:

```bash
# Terminal 1: Supabase (from project directory)
cd project
npm run db:start

# Terminal 2: Frontend (from project directory)
cd project
npm run dev

# Terminal 3: Satellite Service (from satellite-indices-service directory)
cd satellite-indices-service
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8001

# Terminal 4 (optional): Redis
redis-server

# Terminal 5 (optional): Celery Worker
cd satellite-indices-service
source venv/bin/activate
celery -A app.celery_app worker --loglevel=info
```

## Using Docker Compose (Alternative)

For a simpler setup, you can use Docker Compose to start both frontend and satellite service:

```bash
# From the root directory
docker-compose up -d
```

This will start:
- Frontend dev server on port 5173
- Satellite service on port 8001
- Redis on port 6379

**Stop all services:**

```bash
docker-compose down
```

## Verify Your Setup

To verify everything is working correctly:

1. **Frontend**: Open [http://localhost:5173](http://localhost:5173) - You should see the login page
2. **Supabase Studio**: Open [http://localhost:54323](http://localhost:54323) - Database management UI
3. **Satellite Service**: Open [http://localhost:8001/docs](http://localhost:8001/docs) - API documentation
4. **Create a test organization**: Sign up and create your first organization

## Next Steps

Now that you have the platform running locally:

1. **Explore the Features**: Navigate through the dashboard, create farms, add parcels
2. **Configure Environment**: See [Environment Setup](./environment-setup.md) for production configuration
3. **Set Up Google Earth Engine**: Follow the GEE setup guide to enable satellite features
4. **Read the Architecture Docs**: Learn about the multi-tenant architecture and authorization system
5. **Start Developing**: Check out the development guides for adding features

## Common Issues

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::5173`

**Solution**: Another process is using the port. Either stop the other process or change the port:

```bash
# Use a different port
npm run dev -- --port 3000
```

### Supabase Won't Start

**Problem**: `Error: Docker is not running`

**Solution**: Start Docker Desktop and wait for it to fully initialize before running `npm run db:start`.

### Satellite Service Connection Failed

**Problem**: Frontend can't connect to satellite service

**Solution**:
1. Verify the satellite service is running: `curl http://localhost:8001/health`
2. Check the `VITE_SATELLITE_SERVICE_URL` in your frontend `.env` file
3. Ensure there are no CORS issues (should be handled by default in development)

### Database Migration Errors

**Problem**: `Error: migration failed`

**Solution**: Reset the local database:

```bash
npm run db:reset
```

This will drop all tables and reapply all migrations.

### Python Package Installation Fails

**Problem**: `ERROR: Could not build wheels for package`

**Solution**:
1. Ensure you have Python development headers installed:
   - macOS: `brew install python@3.9`
   - Linux: `sudo apt-get install python3-dev`
2. Upgrade pip: `pip install --upgrade pip`
3. Try installing again: `pip install -r requirements.txt`

## Stopping Services

To stop all services:

```bash
# Stop Supabase
cd project
npm run db:stop

# Stop frontend (Ctrl+C in the terminal)
# Stop satellite service (Ctrl+C in the terminal)
# Stop Redis (Ctrl+C in the terminal)
# Stop Celery (Ctrl+C in the terminal)
```

## Clean Up

To completely clean up your local development environment:

```bash
# Remove node_modules
cd project
rm -rf node_modules

# Remove Python virtual environment
cd ../satellite-indices-service
rm -rf venv

# Stop and remove Supabase containers
cd ../project
npm run db:stop
docker volume prune  # Remove Supabase data volumes
```

## Additional Resources

- [Environment Setup Guide](./environment-setup.md)
- [First Deployment Guide](./first-deployment.md)
- [Development Guidelines](../development/guidelines.md)
- [Architecture Overview](../architecture/overview.md)
