---
sidebar_position: 1
slug: /
---

# AgriTech Platform Documentation

Welcome to the **AgriTech Platform** documentation! This comprehensive agricultural technology platform combines multi-tenant architecture, satellite data analysis via Google Earth Engine, and AI-powered insights to revolutionize farm management.

## What is AgriTech Platform?

AgriTech Platform is a full-stack web application designed to help agricultural businesses manage their operations efficiently. It provides:

- **Multi-Tenant Architecture**: Organizations, farms, and parcels with role-based access control
- **Satellite Data Analysis**: Real-time vegetation indices (NDVI, NDRE, NDMI, etc.) via Google Earth Engine
- **Agricultural Accounting**: Campaigns, crop cycles, biological assets, and fiscal year management
- **Task Management**: Comprehensive task tracking with cost allocation
- **Inventory Management**: Stock tracking with automatic product creation
- **Accounting Module**: Full double-entry bookkeeping with invoices, payments, and financial reports
- **Billing & Sales**: Purchase orders, sales orders, and quotes management
- **Production Intelligence**: Data-driven insights for crop yield and performance
- **Profitability Analysis**: Real-time P&L tracking per parcel and crop cycle
- **Weather Analytics**: Historical weather data and forecasting for precise farm management
- **Worker Management**: Track permanent workers and day laborers
- **Harvest Tracking**: Record harvests and calculate profitability
- **Subscription System**: Feature gating with Polar.sh integration
- **Marketplace**: Connect producers with buyers and service providers
- **Quality Control**: Lab services, reception batches, and quality tracking

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **TanStack Router** (file-based routing)
- **TanStack Query** (React Query) for server state
- **React Hook Form** with Zod validation
- **Tailwind CSS** for styling
- **Leaflet** & **OpenLayers** for maps
- **ECharts** for data visualization

### Backend
- **Supabase** (PostgreSQL with Row Level Security)
- **FastAPI** (Python) for satellite processing
- **Google Earth Engine** for satellite imagery
- **Celery + Redis** for background jobs

### DevOps
- **Vite** for build tooling
- **Vitest** for unit testing
- **Playwright** for E2E testing
- **ESLint** & **Prettier** for code quality

## Key Features

### 🌍 Satellite Analysis
Leverage Google Earth Engine to analyze crop health with 12+ vegetation indices. Get cloud-free imagery, historical time series, and export GeoTIFF files for GIS software.

### 💰 Agricultural Accounting
Advanced financial management for agriculture:
- **Campaigns**: Multi-year agricultural campaigns
- **Crop Cycles**: Track costs and revenues per specific crop cycle
- **Biological Assets**: Manage and value trees, livestock, and permanent crops
- **Fiscal Years**: Standardized financial periods and closing procedures

### 💹 Profitability & Intelligence
Data-driven decision making:
- **Parcel Profitability**: Real-time P&L analysis per parcel
- **Production Intelligence**: Comparative analysis of yields and inputs
- **Weather Analytics**: Correlate weather patterns with crop performance

### 📊 Accounting & Billing
Full double-entry bookkeeping system with:
- Chart of Accounts hierarchy
- Sales and purchase invoices
- Purchase Orders & Sales Orders
- Payment tracking and allocation
- Financial reports (Balance Sheet, P&L, Trial Balance)
- Multi-currency support

### 🌾 Farm Management
Organize your agricultural operations with:
- Multi-level hierarchy (Organizations → Farms → Parcels → Sub-parcels)
- Tree management and mapping
- Role-based access control (6 role levels)
- Cost center tracking per farm/parcel
- Geospatial boundaries with GeoJSON

### 📋 Task Management
Track all farm activities:
- Task types: irrigation, fertilization, pesticide, harvest, maintenance
- Worker assignment and labor tracking
- Cost allocation (labor, materials, utilities)
- Payment status tracking
- Calendar view

### 📦 Inventory & QC
Smart inventory management and quality control:
- Automatic product creation from purchases
- Packaging type support (bidon, sac, etc.)
- Stock level alerts
- Reception batches and quality control (QC)
- Lab services integration
- Invoice attachments via Supabase Storage

### 🛒 Marketplace
Platform for agricultural commerce:
- Quote requests and bidding
- Order management
- Supplier/Buyer networking

### 💳 Subscriptions
Monetize with feature gating:
- Plans: Free, Basic, Pro, Enterprise
- Usage limits (farms, parcels, users, reports)
- Feature flags (analytics, sensors, API access)
- Polar.sh integration for payments

## Getting Started

Ready to dive in? Check out our guides:

1. [Installation](getting-started/installation) - Set up your development environment
2. [Quick Start](getting-started/quick-start) - Get the app running locally
3. [Environment Setup](getting-started/environment-setup) - Configure environment variables
4. [First Deployment](getting-started/first-deployment) - Deploy to production

## Architecture Overview

The platform follows a modern, scalable architecture:

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React App<br/>TanStack Router]
    end

    subgraph "Backend Layer"
        B[Supabase<br/>PostgreSQL + Auth]
        C[Satellite Service<br/>FastAPI + GEE]
        D[Edge Functions<br/>Deno]
        H[NestJS API<br/>Business Logic]
    end

    subgraph "External Services"
        E[Google Earth Engine]
        F[Polar.sh Payments]
        G[Supabase Storage]
    end

    A --> B
    A --> C
    A --> D
    A --> H
    C --> E
    B --> F
    B --> G
    H --> B
```

## Documentation Structure

- **Getting Started**: Installation, setup, and deployment guides
- **Architecture**: System design, multi-tenancy, and component overview
- **Frontend**: React components, routing, state management, and UI patterns
- **Backend**: Supabase setup, NestJS API, Python satellite service
- **Database**: Schema, migrations, RLS policies, and type generation
- **Features**: Detailed guides for each platform feature
- **Guides**: Step-by-step tutorials for common tasks
- **Development**: Coding standards, testing, and best practices
- **Deployment**: Production deployment and monitoring
- **API Reference**: Complete API documentation

## Community & Support

- **GitHub**: [Report issues and contribute](https://github.com/agritech/platform)
- **License**: Proprietary (update based on your licensing)

## Next Steps

- 📖 Read the [Architecture Overview](architecture/overview)
- 🚀 Follow the [Quick Start Guide](getting-started/quick-start)
- 💻 Learn about the [Frontend Stack](frontend/tech-stack)
- 🗄️ Explore the [Database Schema](database/schema)

