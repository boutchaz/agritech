# Pre-Launch Testing Checklist

**Status:** 🚧 In Progress  
**Last Updated:** 2025-01-21  
**Priority:** Critical items must be completed before launch

---

## 📋 Testing Priority

### 🔴 Critical (Must Test Before Launch)
1. Authentication & Authorization
2. Multi-Tenant Security (RLS)
3. Subscription & Billing
4. Payment Processing
5. Data Integrity

### 🟠 High Priority
6. Farm Hierarchy Management
7. Accounting & Financial Reports
8. Satellite Analysis
9. Task & Worker Management
10. Inventory Management

### 🟡 Medium Priority
11. Marketplace
12. AI Reports
13. Dashboard & Analytics
14. API Integrations

### 🟢 Lower Priority
15. Internationalization
16. Performance Optimization
17. Browser Compatibility
18. Documentation

---

## 1. Authentication & Authorization

### User Authentication
- [ ] User signup with email/password
- [ ] User login with email/password
- [ ] Password reset flow (forgot password → email → reset)
- [ ] Email verification
- [ ] Session management (token refresh, expiration)
- [ ] Logout functionality
- [ ] Multi-organization user switching
- [ ] OAuth/social login (if implemented)

### Role-Based Access Control (CASL)
- [ ] System admin: full access
- [ ] Organization admin: org management, user invites
- [ ] Farm manager: farm/parcel operations
- [ ] Farm worker: task execution, limited edits
- [ ] Day laborer: limited task access
- [ ] Viewer: read-only access
- [ ] Permission checks on all protected routes
- [ ] UI components respect permissions (`<Can>` component)

### Multi-Tenant Security
- [ ] Row Level Security (RLS) policies enforce data isolation
- [ ] Users cannot access other organizations' data
- [ ] API endpoints require `X-Organization-Id` header
- [ ] Organization membership validation
- [ ] Cross-organization data leak prevention
- [ ] RLS policies on all tables (farms, parcels, invoices, etc.)

---

## 2. Subscription & Billing

### Subscription Management
- [ ] Free plan: limits enforced (1 farm, 5 parcels, 2 users, 10 satellite reports)
- [ ] Basic plan: limits enforced (3 farms, 25 parcels, 5 users, 50 reports)
- [ ] Pro plan: limits enforced (10 farms, 100 parcels, 20 users, 200 reports)
- [ ] Enterprise plan: unlimited access
- [ ] Trial subscription creation and expiration
- [ ] Subscription upgrade flow (Polar.sh integration)
- [ ] Subscription downgrade flow
- [ ] Subscription cancellation
- [ ] Payment webhook handling (Polar.sh)
- [ ] Subscription status updates (active, trialing, past_due, canceled)

### Feature Gating
- [ ] Analytics features (Pro+ only)
- [ ] Accounting module (Pro+ only)
- [ ] Advanced reporting (Pro+ only)
- [ ] Multi-currency (Pro+ only)
- [ ] API access (Enterprise only)
- [ ] Feature gate components show upgrade prompts

### Usage Limits
- [ ] Farm creation limit enforcement
- [ ] Parcel creation limit enforcement
- [ ] User invitation limit enforcement
- [ ] Satellite report limit enforcement (monthly quota)
- [ ] Limit warnings at 80% usage
- [ ] Hard blocking at 100% usage
- [ ] Usage counter accuracy

---

## 3. Farm Hierarchy & Management

### Organization Management
- [ ] Create organization
- [ ] Update organization details
- [ ] Organization settings (modules, preferences)
- [ ] Organization deletion (with data cleanup)
- [ ] Organization slug uniqueness

### Farm Management
- [ ] Create farm (with organization context)
- [ ] Update farm details
- [ ] Delete farm (with cascade to parcels)
- [ ] Farm geospatial boundaries (GeoJSON)
- [ ] Farm cost center assignment
- [ ] Farm list filtering and search

### Parcel Management
- [ ] Create parcel (linked to farm)
- [ ] Update parcel details
- [ ] Delete parcel (with cascade to sub-parcels)
- [ ] Parcel geospatial boundaries
- [ ] Parcel crop type assignment
- [ ] Parcel planting system tracking
- [ ] Sub-parcel creation and management
- [ ] Parcel area calculations

### Infrastructure
- [ ] Buildings management (create, update, delete)
- [ ] Equipment tracking
- [ ] Utilities management
- [ ] Infrastructure cost allocation

---

## 4. Satellite Analysis & Vegetation Indices

### Google Earth Engine Integration
- [ ] GEE authentication and initialization
- [ ] Sentinel-2 imagery retrieval
- [ ] Cloud coverage filtering
- [ ] Date range queries
- [ ] Geometry-based queries

### Vegetation Indices Calculation
- [ ] NDVI calculation and display
- [ ] NDRE calculation and display
- [ ] NDMI calculation and display
- [ ] MNDWI calculation and display
- [ ] GCI, SAVI, OSAVI, MSAVI2, PRI, MSI, MCARI, TCARI
- [ ] Index statistics (min, max, mean, std dev)
- [ ] Time series analysis
- [ ] Historical data retrieval

### Visualization
- [ ] Interactive heatmaps (ECharts)
- [ ] Index image viewer
- [ ] Statistics calculator
- [ ] GeoTIFF export
- [ ] Cloud mask visualization
- [ ] Date selection for imagery

### Satellite Service API
- [ ] `/api/indices/calculate` endpoint
- [ ] `/api/indices/available-dates` endpoint
- [ ] `/api/indices/time-series` endpoint
- [ ] Error handling for GEE failures
- [ ] Rate limiting on satellite requests
- [ ] Monthly quota tracking

---

## 5. Accounting & Financial Management

### Chart of Accounts
- [ ] Create account hierarchy
- [ ] Account types (Asset, Liability, Equity, Revenue, Expense)
- [ ] Account numbering system
- [ ] Account activation/deactivation
- [ ] Multi-currency accounts

### Journal Entries
- [ ] Create manual journal entry
- [ ] Double-entry validation (debits = credits)
- [ ] Entry status workflow (draft → posted → locked)
- [ ] Entry posting date vs transaction date
- [ ] Cost center allocation
- [ ] Reference number generation
- [ ] Automated entries from invoices/payments

### Invoices
- [ ] Sales invoice creation
- [ ] Purchase invoice creation
- [ ] Invoice numbering (INV-YYYY-00001)
- [ ] Invoice status tracking (draft, submitted, paid, overdue, cancelled)
- [ ] Tax calculations
- [ ] Payment allocation to invoices
- [ ] Invoice PDF generation
- [ ] Invoice email delivery (if implemented)

### Payments
- [ ] Payment creation (received/made)
- [ ] Payment allocation to invoices
- [ ] Partial payment handling
- [ ] Overpayment handling
- [ ] Payment methods (cash, check, bank transfer, etc.)
- [ ] Payment numbering
- [ ] Automatic GL posting

### Quotes & Orders
- [ ] Quote creation and management
- [ ] Quote status (draft, sent, accepted, rejected, expired)
- [ ] Quote to Sales Order conversion
- [ ] Sales Order creation and management
- [ ] Purchase Order creation and management
- [ ] Order status tracking
- [ ] Order to Invoice conversion

### Financial Reports
- [ ] Balance Sheet generation
- [ ] Profit & Loss Statement
- [ ] Trial Balance report
- [ ] General Ledger report
- [ ] Aged Receivables report
- [ ] Aged Payables report
- [ ] Date range filtering
- [ ] Cost center breakdown
- [ ] Report export (PDF/Excel)

### Cost Centers
- [ ] Cost center creation (farm/parcel level)
- [ ] Cost allocation to cost centers
- [ ] Profitability by cost center
- [ ] Cost center hierarchy

---

## 6. Task & Worker Management

### Task Management
- [ ] Task creation (irrigation, fertilization, pesticide, harvest, maintenance)
- [ ] Task assignment to workers
- [ ] Task status tracking
- [ ] Task calendar view
- [ ] Task scheduling and due dates
- [ ] Task cost allocation (labor, materials, utilities)
- [ ] Task completion tracking
- [ ] Recurring tasks

### Worker Management
- [ ] Worker creation (permanent, day laborer, metayage)
- [ ] Worker profile management
- [ ] Worker skill tracking
- [ ] Worker availability tracking
- [ ] Work record tracking
- [ ] Advance payment management
- [ ] Payment calculations (fixed salary, daily rates, share-based)

### AI Task Assignment
- [ ] Optimal task assignment algorithm
- [ ] Skill-based matching
- [ ] Availability-based matching
- [ ] Cost optimization

### Work Units & Piece Work
- [ ] Work unit definition
- [ ] Piece work tracking
- [ ] Payment record creation
- [ ] Work unit productivity analysis

---

## 7. Inventory & Stock Management

### Items & Warehouses
- [ ] Item creation and management
- [ ] Item categories and groups
- [ ] Warehouse creation and management
- [ ] Warehouse activation/deactivation

### Stock Entries
- [ ] Stock receipt (purchase)
- [ ] Stock issue (consumption)
- [ ] Stock transfer (warehouse to warehouse)
- [ ] Stock adjustment
- [ ] FIFO inventory valuation
- [ ] Stock valuation tracking
- [ ] Stock movement audit trail

### Inventory Reports
- [ ] Current stock levels
- [ ] Stock valuation report
- [ ] Stock movement history
- [ ] Low stock alerts
- [ ] Inventory turnover analysis

### Reception Batches
- [ ] Batch creation
- [ ] Quality control tracking
- [ ] Batch to stock conversion

---

## 8. Production & Harvest Management

### Harvest Tracking
- [ ] Harvest creation
- [ ] Quantity and quality tracking
- [ ] Destination tracking
- [ ] Harvest date recording
- [ ] Harvest cost allocation

### Deliveries
- [ ] Delivery creation
- [ ] Delivery status tracking
- [ ] Delivery to invoice linking

### Production Intelligence
- [ ] Yield history tracking
- [ ] Harvest forecasting
- [ ] Comparative yield analysis
- [ ] Production reports

### Crop Cycles
- [ ] Crop cycle creation
- [ ] Cycle planning and tracking
- [ ] Cycle cost tracking
- [ ] Cycle revenue tracking

---

## 9. Soil Analysis & Lab Services

### Soil Analysis
- [ ] Soil analysis creation
- [ ] Analysis parameter tracking
- [ ] Analysis date and location
- [ ] Analysis reports

### Lab Services Marketplace
- [ ] Lab service listing
- [ ] Service ordering
- [ ] Order status tracking
- [ ] Results integration

---

## 10. Marketplace

### Product Listings
- [ ] Create marketplace listing
- [ ] Update listing details
- [ ] Product image upload (up to 5 images)
- [ ] Image reordering
- [ ] Listing visibility (public/private)
- [ ] Stock quantity management

### Shopping Cart
- [ ] Add items to cart
- [ ] Update cart quantities
- [ ] Remove items from cart
- [ ] Stock validation in cart
- [ ] Cart persistence

### Order Processing
- [ ] Order creation from cart
- [ ] Automatic stock deduction on order
- [ ] Stock restoration on cancellation
- [ ] Order status tracking (pending, confirmed, shipped, delivered, cancelled)
- [ ] Payment status tracking
- [ ] Order history

### Quote Requests
- [ ] Send quote request
- [ ] Receive quote requests
- [ ] Quote request status tracking

### Reviews & Ratings
- [ ] Product reviews
- [ ] Rating system
- [ ] Review moderation

---

## 11. AI Reports

### AI Report Generation
- [ ] Report generation with OpenAI
- [ ] Report generation with Gemini
- [ ] Report generation with Groq
- [ ] Organization AI settings (API key management)
- [ ] Encrypted API key storage
- [ ] Data aggregation (parcel data, satellite indices, weather, tasks, harvests)
- [ ] Report sections (executive summary, satellite analysis, weather, tasks, recommendations)

### Report Features
- [ ] Report export (PDF, DOCX)
- [ ] Report history
- [ ] Report sharing
- [ ] Data availability preview

---

## 12. Dashboard & Analytics

### Dashboard Widgets
- [ ] Parcels overview widget
- [ ] Harvest summary widget
- [ ] Analysis widget
- [ ] Task calendar widget
- [ ] Financial summary widget
- [ ] Accounting widget
- [ ] Sales overview widget

### Analytics
- [ ] Parcel profitability analysis
- [ ] Production intelligence
- [ ] Weather analytics
- [ ] Comparative analysis
- [ ] Trend analysis

---

## 13. Settings & Configuration

### User Settings
- [ ] User profile management
- [ ] Password change
- [ ] Language preferences (EN, FR, AR)
- [ ] Timezone settings
- [ ] Notification preferences

### Organization Settings
- [ ] Organization details
- [ ] Module activation/deactivation
- [ ] User management (invite, remove, role assignment)
- [ ] Subscription management
- [ ] AI provider settings
- [ ] Account mappings
- [ ] Biological assets settings
- [ ] Fiscal years management
- [ ] Document templates
- [ ] File management

---

## 14. API & Integrations

### NestJS API
- [ ] All endpoints require authentication
- [ ] Organization context validation
- [ ] Rate limiting (100 req/min per IP)
- [ ] Error handling and responses
- [ ] Swagger documentation (`/api/docs`)
- [ ] Health check endpoints

### Satellite Service API (Python/FastAPI)
- [ ] GEE service initialization
- [ ] Index calculation endpoints
- [ ] Error handling
- [ ] Supabase integration

### Polar.sh Integration
- [ ] Webhook handling
- [ ] Subscription sync
- [ ] Payment processing
- [ ] Checkout flow

---

## 15. Data Integrity & Validation

### Database Constraints
- [ ] Foreign key constraints
- [ ] Unique constraints
- [ ] Check constraints
- [ ] Not null constraints
- [ ] Data type validation

### Business Logic Validation
- [ ] Double-entry accounting validation
- [ ] Stock quantity validation
- [ ] Date range validation
- [ ] Currency validation
- [ ] Tax calculation accuracy

### Data Migration
- [ ] Migration scripts tested
- [ ] Rollback procedures
- [ ] Data backup before migration

---

## 16. Performance & Scalability

### Frontend Performance
- [ ] Page load times (< 3s)
- [ ] Image optimization
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Query caching (TanStack Query)

### Backend Performance
- [ ] API response times (< 500ms for simple queries)
- [ ] Database query optimization
- [ ] Index usage
- [ ] Connection pooling
- [ ] Caching strategy

### Satellite Service Performance
- [ ] GEE request timeout handling
- [ ] Large geometry processing
- [ ] Batch processing efficiency

---

## 17. Error Handling & Logging

### Error Handling
- [ ] User-friendly error messages
- [ ] Error logging (backend)
- [ ] Error tracking (Sentry or similar)
- [ ] Graceful degradation

### Logging
- [ ] API request logging
- [ ] Error logging
- [ ] Security event logging
- [ ] Performance logging

---

## 18. Security Testing

### Security Checks
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] JWT token security
- [ ] API key encryption
- [ ] Sensitive data encryption
- [ ] Rate limiting effectiveness
- [ ] RLS policy bypass attempts

---

## 19. Browser & Device Compatibility

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### Responsive Design
- [ ] Desktop (1920x1080, 1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667, 414x896)

---

## 20. Internationalization

### Language Support
- [ ] English (EN) - all strings translated
- [ ] French (FR) - all strings translated
- [ ] Arabic (AR) - all strings translated
- [ ] RTL layout for Arabic
- [ ] Date/time formatting per locale
- [ ] Currency formatting per locale

---

## 21. Onboarding & User Experience

### Onboarding Flow
- [ ] 5-step onboarding wizard
- [ ] User profile setup
- [ ] Organization setup
- [ ] Farm creation
- [ ] Parcel creation
- [ ] Module selection

### User Experience
- [ ] Navigation flow
- [ ] Form validation messages
- [ ] Loading states
- [ ] Success/error toasts
- [ ] Empty states
- [ ] Help tooltips

---

## 22. Documentation & Support

### Documentation
- [ ] User documentation
- [ ] API documentation (Swagger)
- [ ] Developer documentation
- [ ] Deployment guides

### Support Features
- [ ] Help center
- [ ] Contact support
- [ ] FAQ section

---

## 23. Deployment & Infrastructure

### Environment Setup
- [ ] Production environment variables
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] API endpoints configured
- [ ] CDN setup (if applicable)

### Monitoring
- [ ] Application monitoring
- [ ] Error tracking
- [ ] Performance monitoring
- [ ] Uptime monitoring

---

## 24. Data Backup & Recovery

### Backup Procedures
- [ ] Database backup strategy
- [ ] File storage backup
- [ ] Backup restoration tested

---

## 25. Legal & Compliance

### Compliance Checks
- [ ] GDPR compliance (if applicable)
- [ ] Data privacy policy
- [ ] Terms of service
- [ ] Cookie consent (if applicable)

---

## Testing Tools & Methods

### Automated Testing
- [ ] Unit tests (Vitest for frontend, Jest for NestJS)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] API tests (Postman/Newman)

### Manual Testing
- [ ] User acceptance testing (UAT)
- [ ] Security penetration testing
- [ ] Performance testing
- [ ] Cross-browser testing

### Test Data
- [ ] Test organizations with different subscription tiers
- [ ] Test users with different roles
- [ ] Sample farms, parcels, and data
- [ ] Test payment scenarios

---

## Progress Tracking

**Total Items:** ~300+  
**Completed:** 0  
**In Progress:** 0  
**Not Started:** ~300+

### Completion by Category
- Authentication & Authorization: 0/23
- Subscription & Billing: 0/25
- Farm Hierarchy: 0/20
- Satellite Analysis: 0/24
- Accounting: 0/45
- Task & Worker Management: 0/20
- Inventory: 0/15
- Production & Harvest: 0/12
- Soil Analysis: 0/8
- Marketplace: 0/20
- AI Reports: 0/11
- Dashboard: 0/12
- Settings: 0/15
- API & Integrations: 0/12
- Data Integrity: 0/11
- Performance: 0/13
- Error Handling: 0/8
- Security: 0/8
- Browser Compatibility: 0/9
- Internationalization: 0/6
- Onboarding: 0/11
- Documentation: 0/7
- Deployment: 0/8
- Backup & Recovery: 0/3
- Legal & Compliance: 0/4

---

## Notes

- Update this file as items are completed
- Add specific test cases and results in comments
- Document any blockers or issues found
- Track time spent on each category

---

**Last Review Date:** _To be filled_  
**Next Review Date:** _To be filled_  
**Launch Target Date:** _To be filled_

