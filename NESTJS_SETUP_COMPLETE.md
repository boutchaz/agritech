# NestJS API Setup - Complete

## 🎉 Setup Complete!

A production-ready NestJS API has been created at `/agritech-api` to handle complex business logic migration from Supabase.

## 📦 What's Included

### Core Infrastructure
- ✅ **NestJS Framework** - Latest version with TypeScript
- ✅ **Supabase Integration** - Database service with RLS-aware clients
- ✅ **JWT Authentication** - Compatible with Supabase Auth tokens
- ✅ **Swagger/OpenAPI** - Auto-generated API documentation
- ✅ **Docker Support** - Production-ready containerization
- ✅ **Environment Configuration** - Type-safe config management

### Modules Created

#### 1. **Database Module** (Global)
- Supabase client management
- Three client types: Standard (RLS), Admin (bypass RLS), User-specific
- Raw SQL query support
- Connection pooling

#### 2. **Auth Module**
- JWT strategy with Passport
- Supabase token validation
- User profile management
- Role-based access control helpers
- Organization membership checks

**Guards & Decorators:**
- `@UseGuards(JwtAuthGuard)` - Protect routes
- `@CurrentUser()` - Get authenticated user
- `@Public()` - Mark routes as public

#### 3. **Sequences Module** (Fully Implemented)
- Generate sequential numbers for all document types
- Organization-scoped sequences
- Configurable prefixes

**Endpoints:**
```typescript
POST /api/v1/sequences/invoice        // INV-2024-00001
POST /api/v1/sequences/quote           // QUO-2024-00001
POST /api/v1/sequences/sales-order     // SO-2024-00001
POST /api/v1/sequences/purchase-order  // PO-2024-00001
```

#### 4. **Business Logic Modules** (Stubs Ready)
- `accounts/` - Chart of accounts management
- `invoices/` - Invoice creation & posting
- `journal-entries/` - Double-entry bookkeeping
- `payments/` - Payment processing & allocation
- `financial-reports/` - Balance sheets, P&L, trial balance
- `production-intelligence/` - Harvest analytics
- `harvests/` - Harvest record management
- `tasks/` - Task assignment & tracking
- `workers/` - Worker payments & availability
- `stock-entries/` - Inventory with FIFO/LIFO

## 🚀 Getting Started

### 1. Configure Environment

```bash
cd agritech-api
cp .env.example .env
```

**Edit `.env` with your Supabase credentials:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-here
```

### 2. Install Dependencies (Already Done)

```bash
npm install  # Already completed
```

### 3. Start Development Server

```bash
npm run start:dev
```

**Access:**
- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/health

### 4. Test Sequences Endpoint

```bash
curl -X POST http://localhost:3000/api/v1/sequences/invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -d '{"organizationId": "your-org-id"}'
```

## 🏗️ Architecture

### Request Flow

```
Frontend (React)
    ↓
    ├─→ Supabase Auth (Login/Signup)
    │   ↓
    │   JWT Token
    │
    ↓
NestJS API
    ├─→ JwtAuthGuard (Validate token)
    ├─→ Controller (Route handler)
    ├─→ Service (Business logic)
    └─→ DatabaseService
        ├─→ Supabase Client (RLS-enabled)
        ├─→ Admin Client (Bypass RLS)
        └─→ PostgreSQL
```

### Multi-Tenant Architecture

- **Organization-scoped**: All operations require `organizationId`
- **RLS Enforcement**: Row Level Security via Supabase
- **Role-based**: System Admin → Org Admin → Farm Manager → Worker → Viewer

## 📝 Next Steps

### Immediate (Phase 2 - Accounting)

1. **Implement Accounts Module**
   ```typescript
   // src/modules/accounts/accounts.service.ts
   - getChartOfAccounts(organizationId, country)
   - createAccount(accountData)
   - getAccountMappings(country)
   ```

2. **Implement Journal Entries Module**
   ```typescript
   // src/modules/journal-entries/journal-entries.service.ts
   - createJournalEntry(entryData)
   - validateDoubleEntry(items)
   - postJournalEntry(entryId)
   ```

3. **Implement Invoices Module**
   ```typescript
   // src/modules/invoices/invoices.service.ts
   - createInvoice(invoiceData)
   - postInvoice(invoiceId)  // Creates journal entries
   - getInvoiceById(invoiceId)
   ```

4. **Implement Payments Module**
   ```typescript
   // src/modules/payments/payments.service.ts
   - createPayment(paymentData)
   - allocatePayment(paymentId, allocations)
   - calculateWorkerPayment(workerId, period)
   ```

### Testing

```bash
# Add Jest config and write tests
npm test

# Run specific module tests
npm test -- sequences
```

### Deployment

```bash
# Build Docker image
docker build -t agritech-api .

# Run with Docker Compose
docker-compose up -d

# Deploy to Dokploy/production
# (Similar to backend-service deployment)
```

## 🔄 Migration Strategy

### Incremental Migration

1. **Keep Supabase Edge Functions running** (don't break existing functionality)
2. **Implement NestJS endpoint** (parallel implementation)
3. **Update frontend** to call NestJS instead of Edge Function
4. **Test thoroughly** in production
5. **Deprecate Edge Function** after 1-2 weeks

### Example: Migrate Invoice Number Generation

**Before (Frontend calls Supabase):**
```typescript
// Frontend: src/lib/supabase.ts
const { data } = await supabase.functions.invoke('generate-invoice-number', {
  body: { organizationId }
});
```

**After (Frontend calls NestJS):**
```typescript
// Frontend: src/lib/api-client.ts
const response = await fetch('http://localhost:3000/api/v1/sequences/invoice', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ organizationId })
});
```

## 📊 Monitoring & Logging

### Built-in Features

- **Health Checks**: `/health` endpoint
- **Swagger UI**: `/api/docs` for API testing
- **Logging**: NestJS Logger with configurable levels
- **Error Handling**: Global exception filters

### Add Monitoring (Optional)

```bash
npm install @nestjs/terminus @nestjs/axios
```

Then add health indicators:
- Database connectivity
- Supabase API availability
- Memory usage
- Disk space

## 🔧 Development Tools

### VS Code Extensions (Recommended)

- **Prettier** - Code formatting
- **ESLint** - Code linting
- **REST Client** - Test API endpoints
- **Docker** - Container management

### Useful Commands

```bash
# Generate new module
nest generate module feature-name

# Generate controller
nest generate controller feature-name

# Generate service
nest generate service feature-name

# Generate complete resource
nest generate resource feature-name
```

## 📚 Documentation References

- **Analysis Reports:**
  - [BUSINESS_LOGIC_ANALYSIS.md](./BUSINESS_LOGIC_ANALYSIS.md) - Complete analysis
  - [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) - Executive summary
  - [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick lookup

- **NestJS Documentation:**
  - https://docs.nestjs.com
  - https://docs.nestjs.com/modules
  - https://docs.nestjs.com/security/authentication

- **Supabase Client:**
  - https://supabase.com/docs/reference/javascript
  - https://supabase.com/docs/guides/auth

## 🎯 Success Criteria

### Phase 2 Complete When:
- [ ] All accounting endpoints implemented
- [ ] Double-entry validation working
- [ ] Invoice creation & posting functional
- [ ] Payment allocation working
- [ ] Frontend migrated from Edge Functions
- [ ] Unit tests covering >80% of code
- [ ] Integration tests for critical paths
- [ ] Production deployment successful

### Performance Targets:
- **Response Time**: < 200ms for simple queries
- **Throughput**: > 1000 req/s
- **Availability**: 99.9% uptime
- **Error Rate**: < 0.1%

## 🚨 Important Notes

### Security

1. **Never commit `.env`** files
2. **Use service role key carefully** - It bypasses RLS
3. **Validate all user inputs** - Use class-validator DTOs
4. **Implement rate limiting** for production
5. **Enable CORS properly** - Only allow trusted origins

### Database

1. **Respect RLS policies** - Use standard client when possible
2. **Use transactions** for multi-table operations
3. **Index frequently queried fields**
4. **Monitor query performance**

### Testing

1. **Write tests first** (TDD approach)
2. **Mock Supabase client** in unit tests
3. **Use test database** for integration tests
4. **Clean up test data** after each test

## 📞 Support

If you encounter issues:

1. Check the **Swagger docs**: http://localhost:3000/api/docs
2. Review **NestJS logs** in console
3. Verify **Supabase credentials** in `.env`
4. Check **database connection** with health endpoint
5. Consult the **analysis documents** for business logic details

## ✅ Checklist

- [x] NestJS project initialized
- [x] Dependencies installed
- [x] Database module configured
- [x] Authentication implemented
- [x] Sequences module complete
- [x] Docker setup ready
- [x] Documentation created
- [ ] Environment configured (`.env`)
- [ ] First test run successful
- [ ] Swagger docs accessible
- [ ] Frontend integration started

---

**Status**: ✅ **Setup Complete - Ready for Development**

**Next Action**: Configure `.env` and run `npm run start:dev`
