# AgriTech Platform

## Project Overview

This is a comprehensive agricultural technology platform with a multi-tenant architecture. It consists of several services, including a main frontend application, an admin frontend, a marketplace frontend, a backend API, a Python backend for data processing, and a Strapi CMS. The platform uses Supabase for its database and authentication, and integrates with Google Earth Engine for satellite data analysis.

### Architecture

The project is a monorepo with the following services:

-   **`project` (Main Frontend):** A React/Vite application that serves as the main user-facing dashboard for farm and parcel management.
-   **`admin-app` (Admin Frontend):** A React/Vite application for administrative tasks.
-   **`agritech-api` (Backend API):** A NestJS application that provides the core business logic and API endpoints.
-   **`backend-service` (Python Backend):** A Python/FastAPI service for data processing, including satellite data analysis with Google Earth Engine and PDF generation.
-   **`marketplace-frontend` (Marketplace):** A Next.js application for the marketplace feature.
-   **`cms` (Strapi CMS):** A Strapi application for content management, likely for the blog and other static content.
-   **`supabase` (Database):** Contains Supabase migrations, functions, and seeding scripts.
-   **`docker-compose.yml`:** The main Docker Compose file orchestrates the `frontend` and `backend-service`.

## Building and Running

### With Docker (Recommended)

The easiest way to run the core services is with Docker Compose:

```bash
docker-compose up -d
```

This will start the `project` (frontend) and `backend-service`.

### Manual

#### Main Frontend (`project`)

```bash
cd project
npm install
npm run dev
```

#### Admin Frontend (`admin-app`)

```bash
cd admin-app
npm install
npm run dev
```

#### Backend API (`agritech-api`)

```bash
cd agritech-api
npm install
npm run start:dev
```

#### Marketplace Frontend (`marketplace-frontend`)

```bash
cd marketplace-frontend
npm install
npm run dev
```

#### Strapi CMS (`cms`)

```bash
cd cms
npm install
npm run develop
```

#### Backend Service (`backend-service`)

```bash
cd backend-service
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Database

The project uses Supabase for the database. There are several scripts in the `project/package.json` file for managing the database, including migrations, seeding, and generating types.

-   **Start local Supabase instance:** `npm run db:start` (in the `project` directory)
-   **Reset local database:** `npm run db:reset`
-   **Seed local database:** `npm run db:seed`
-   **Generate TypeScript types from schema:** `npm run db:generate-types`

## Development Conventions

-   **Linting and Formatting:** The project uses ESLint and Prettier for code quality and consistency. You can run the linters with `npm run lint` in the respective service directories.
-   **Testing:**
    -   Unit and integration tests are run with Vitest in the `project` and `admin-app` frontends (`npm test`).
    -   The `agritech-api` uses Jest for testing (`npm test`).
    -   End-to-end tests are set up with Playwright in the `project` directory (`npm run test:e2e`).
-   **Git Hooks:** Husky is used with `lint-staged` to run linters on pre-commit.
-   **Environment Variables:** Each service has its own `.env.example` file. Copy this to a `.env` file and fill in the required values.
