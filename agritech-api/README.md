# AgriTech API - Business Logic Service

NestJS-based backend service for handling complex business logic from the AgriTech platform. This service migrates critical functionality from Supabase Edge Functions and SQL functions to a dedicated, scalable backend API.

## 🌾 Overview

This API handles:
- **Sequences**: Number generation for invoices, quotes, purchase orders, etc.
- **Accounting**: Double-entry bookkeeping, journal entries, multi-country accounts
- **Financial Reports**: Balance sheets, P&L statements, trial balances
- **Production Intelligence**: Harvest analytics, performance metrics
- **Worker Management**: Payment calculations, task assignments
- **Stock Management**: Inventory tracking with FIFO/LIFO valuation
- **Invoicing & Payments**: Invoice creation, payment allocation

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase project (URL and API keys)
- PostgreSQL database (via Supabase)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
# Required:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - JWT_SECRET
```

### Development

```bash
# Start development server (with hot reload)
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

The API will be available at:
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs

## 📁 Project Structure

```
agritech-api/
├── src/
│   ├── modules/
│   │   ├── auth/                 # Authentication & authorization
│   │   │   ├── strategies/       # Passport JWT strategy
│   │   │   ├── guards/           # Auth guards
│   │   │   └── decorators/       # Custom decorators
│   │   ├── database/             # Supabase client setup
│   │   ├── sequences/            # Number sequence generation
│   │   ├── accounts/             # Chart of accounts
│   │   ├── invoices/             # Invoice operations
│   │   ├── journal-entries/      # Journal entry management
│   │   ├── payments/             # Payment processing
│   │   ├── financial-reports/    # Financial analytics
│   │   ├── production-intelligence/ # Harvest analytics
│   │   ├── harvests/             # Harvest management
│   │   ├── tasks/                # Task management
│   │   ├── workers/              # Worker management
│   │   └── stock-entries/        # Inventory management
│   ├── common/                   # Shared utilities
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── interfaces/
│   ├── config/                   # Configuration
│   ├── utils/                    # Helper functions
│   ├── app.module.ts             # Root module
│   └── main.ts                   # Application entry point
├── test/                         # Tests
├── dist/                         # Compiled output
├── Dockerfile                    # Docker configuration
├── docker-compose.yml            # Docker Compose setup
└── package.json
```

## 🔐 Authentication

The API uses JWT-based authentication compatible with Supabase Auth:

1. **Frontend** authenticates with Supabase
2. **Supabase** returns JWT token
3. **API** validates token and extracts user info
4. **RLS policies** in Supabase enforce data access

### Usage

Include the Supabase JWT token in request headers:

```bash
Authorization: Bearer <supabase-jwt-token>
```

### Decorators

```typescript
// Protect route with authentication
@UseGuards(JwtAuthGuard)

// Get current user
@CurrentUser() user

// Make route public
@Public()
```

## 📊 Core Modules

### Sequences Module

Generate unique sequential numbers for documents:

```typescript
POST /api/v1/sequences/invoice
Body: { organizationId: "uuid" }
Response: { invoiceNumber: "INV-2024-00001" }
```

Supported sequences:
- Invoices (`INV-`)
- Quotes (`QUO-`)
- Sales Orders (`SO-`)
- Purchase Orders (`PO-`)
- Journal Entries (`JE-`)
- Payments (`PAY-`)
- Stock Entries (`SE-`)

### Database Module

Provides three Supabase clients:

1. **Standard Client** - RLS-enabled for user operations
2. **Admin Client** - Bypasses RLS for service operations
3. **User-Auth Client** - RLS-enabled with specific user token

```typescript
// Inject DatabaseService
constructor(private databaseService: DatabaseService) {}

// Get client with RLS
const client = this.databaseService.getClient();

// Get admin client (bypass RLS)
const admin = this.databaseService.getAdminClient();

// Get client for specific user
const userClient = this.databaseService.getClientWithAuth(token);
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Build Docker image
docker build -t agritech-api .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f agritech-api

# Stop services
docker-compose down
```

### Production Deployment

1. Set environment variables in `.env`
2. Build production image:
   ```bash
   docker-compose -f docker-compose.yml up -d --build
   ```
3. Configure reverse proxy (Nginx, Traefik, Caddy)
4. Set up SSL certificates

### Health Checks

The API includes built-in health checks:

```bash
GET /health
Response: {
  status: "ok",
  timestamp: "2024-11-21T12:00:00.000Z",
  uptime: 3600,
  environment: "production"
}
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## 📝 API Documentation

Interactive API documentation is available via Swagger UI:

**URL**: http://localhost:3000/api/docs

All endpoints are documented with:
- Request/response schemas
- Authentication requirements
- Example payloads
- Error codes

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production) | `development` | No |
| `PORT` | Server port | `3000` | No |
| `API_PREFIX` | API route prefix | `api/v1` | No |
| `SUPABASE_URL` | Supabase project URL | - | **Yes** |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | - | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | - | **Yes** |
| `JWT_SECRET` | JWT signing secret | - | **Yes** |
| `JWT_EXPIRES_IN` | JWT expiration time | `1d` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | No |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:5173` | No |
| `LOG_LEVEL` | Logging level | `debug` | No |
| `RATE_LIMIT_TTL` | Rate limit window (seconds) | `60` | No |
| `RATE_LIMIT_MAX` | Max requests per window | `100` | No |

## 🚦 Migration Roadmap

### Phase 1: Foundation (✅ Complete)
- [x] NestJS project setup
- [x] Supabase database integration
- [x] Authentication middleware
- [x] Sequences module

### Phase 2: Accounting (In Progress)
- [ ] Chart of accounts management
- [ ] Journal entry creation & validation
- [ ] Invoice operations
- [ ] Payment processing & allocation

### Phase 3: Production Intelligence
- [ ] Harvest analytics
- [ ] Performance metrics
- [ ] Caching layer for analytics

### Phase 4: Workforce
- [ ] Worker payment calculations
- [ ] Task assignment logic
- [ ] Availability management

### Phase 5: Inventory
- [ ] Stock entry operations
- [ ] FIFO/LIFO valuation
- [ ] Stock reconciliation

## 📚 Related Documentation

- [Business Logic Analysis](../BUSINESS_LOGIC_ANALYSIS.md) - Detailed analysis of migrated logic
- [Migration Summary](../MIGRATION_SUMMARY.md) - Executive migration overview

## 🤝 Contributing

1. Create a feature branch
2. Implement changes with tests
3. Ensure all tests pass: `npm test`
4. Submit pull request

## 📄 License

ISC

## 🙋 Support

For questions or issues:
- Check the [API Documentation](http://localhost:3000/api/docs)
- Review the [Business Logic Analysis](../BUSINESS_LOGIC_ANALYSIS.md)
- Create an issue in the repository
