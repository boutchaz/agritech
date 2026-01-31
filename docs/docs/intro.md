---
sidebar_position: 1
---

# AgriTech Platform Documentation

Welcome to the AgriTech Platform - a comprehensive agricultural technology solution built for modern farming operations.

## Overview

AgriTech Platform is a multi-tenant SaaS application designed to help farmers manage their operations efficiently. Built with a microservices architecture, it provides:

- **Farm Management**: Complete parcel, crop, and harvest tracking
- **Satellite Analysis**: NDVI and other vegetation indices from satellite imagery
- **Agricultural Accounting**: Specialized accounting for farming operations
- **Task Management**: Field operations and worker assignments
- **Inventory Management**: Stock tracking across warehouses
- **Module System**: Dynamic feature-based subscription tiers

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **React Router v7** file-based routing
- **TanStack Query** for server state management
- **Zustand** for client state
- **TailwindCSS** for styling
- **Radix UI** for accessible components

### Backend
- **NestJS** API framework
- **PostgreSQL** with Supabase
- **Polar.sh** for subscription management
- **Supabase Auth** for authentication

### Infrastructure
- **pnpm** workspace monorepo
- **Docker** for containerization
- **Directus** for CMS
- **Strapi** for content management

## Module-Based Architecture

The platform uses a dynamic module system where features are enabled based on subscription tiers:

- **Essential Plan** ($25/mo): Fruit Trees, Cereals, Vegetables
- **Professional Plan** ($75/mo): All Essential + Mushrooms, Livestock, Satellite Analysis
- **Enterprise Plan** (Custom): All modules + API access + Priority support

See [Subscriptions](/features/subscriptions) for details on module configuration.

## Getting Started

1. [Installation](/getting-started/installation) - Set up your development environment
2. [Quick Start](/getting-started/quick-start) - Get the platform running locally
3. [Environment Setup](/getting-started/environment-setup) - Configure required services
4. [Architecture Overview](/architecture/overview) - Understand the system design

## Documentation Structure

- **Getting Started**: Setup and initial deployment guides
- **Architecture**: System design, multi-tenancy, and service architecture
- **Frontend**: React components, routing, state management
- **Features**: Detailed documentation of platform features
- **Guides**: How-to guides for common tasks
- **API Reference**: REST API documentation

## Support

For issues, questions, or contributions, please visit our [GitHub repository](https://github.com/agritech/platform).
