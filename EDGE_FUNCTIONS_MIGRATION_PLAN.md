# Edge Functions to NestJS Migration Plan

## Overview

Migrating all 24 Edge Functions to NestJS for better performance, reliability, and maintainability.

---

## Migration Status

### ✅ Completed (2/24)

1. ✅ **on-user-created** - User signup with organization creation
   - **Route**: `POST /api/v1/auth/signup`
   - **Status**: Deployed and working
   - **Migration**: [SIGNUP_MIGRATION.md](agritech-api/SIGNUP_MIGRATION.md)

2. ✅ **create-trial-subscription** - Trial subscription creation
   - **Route**: `POST /api/v1/subscriptions/trial`
   - **Status**: Fixed, ready to deploy
   - **Migration**: [TRIAL_SUBSCRIPTION_MIGRATION.md](TRIAL_SUBSCRIPTION_MIGRATION.md)

---

## Priority 1: Critical User Flows (Currently Used)

These are actively called from the frontend and affect core user experience:

### 🔴 HIGH PRIORITY - Auth & Subscriptions

3. **check-subscription** ⭐ CRITICAL
   - **Purpose**: Verify user's subscription status and feature access
   - **Used by**: Multiple components for feature gating
   - **Complexity**: Low
   - **Target**: `GET /api/v1/subscriptions/check/:organizationId`
   - **ETA**: 30 minutes

4. **user-auth-data** ⭐ CRITICAL
   - **Purpose**: Get user profile and organization data
   - **Used by**: Auth context, dashboard
   - **Complexity**: Low
   - **Target**: `GET /api/v1/auth/me` (might already exist)
   - **ETA**: 15 minutes (verify existing endpoint)

### 🟡 HIGH PRIORITY - Farm Management

5. **delete-farm** ⭐ ACTIVE USE
   - **Purpose**: Delete farm with cascading rules
   - **Used by**: Farm management UI
   - **Complexity**: Medium
   - **Target**: `DELETE /api/v1/farms/:id`
   - **ETA**: 45 minutes

6. **delete-parcel** ⭐ ACTIVE USE
   - **Purpose**: Delete parcel with cascading rules
   - **Used by**: Parcel management UI
   - **Complexity**: Medium
   - **Target**: `DELETE /api/v1/parcels/:id`
   - **ETA**: 30 minutes

7. **export-farm** ⭐ ACTIVE USE
   - **Purpose**: Export farm data (GeoJSON, CSV)
   - **Used by**: Farm export feature
   - **Complexity**: Medium
   - **Target**: `POST /api/v1/farms/:id/export`
   - **ETA**: 1 hour

8. **import-farm**
   - **Purpose**: Import farm data from file
   - **Complexity**: High
   - **Target**: `POST /api/v1/farms/import`
   - **ETA**: 1.5 hours

### 🟢 HIGH PRIORITY - Satellite/Analytics

9. **generate-index-image** ⭐ ACTIVE USE
   - **Purpose**: Generate satellite index visualization
   - **Used by**: Satellite analysis UI
   - **Complexity**: High (image processing)
   - **Target**: `POST /api/v1/satellite/generate-image`
   - **ETA**: 2 hours
   - **Note**: May keep as Edge Function (better for CPU-intensive tasks)

---

## Priority 2: User & Access Management

10. **invite-user**
    - **Purpose**: Send invitation email to join organization
    - **Complexity**: Medium
    - **Target**: `POST /api/v1/organizations/:id/invitations`
    - **ETA**: 1 hour

11. **grant-worker-access**
    - **Purpose**: Grant worker access to specific farms/parcels
    - **Complexity**: Medium
    - **Target**: `POST /api/v1/workers/:id/grant-access`
    - **ETA**: 45 minutes

---

## Priority 3: Webhooks & Payments

12. **polar-webhook** ⭐ CRITICAL
    - **Purpose**: Handle Polar.sh payment webhooks
    - **Complexity**: Medium
    - **Target**: `POST /api/v1/webhooks/polar`
    - **Security**: Webhook signature verification
    - **ETA**: 1 hour

---

## Priority 4: Accounting (Already in NestJS!)

These might already be migrated based on your API structure:

13. **create-invoice**
    - **Check**: `POST /api/v1/invoices` - Might exist
    - **Module**: InvoicesModule already exists
    - **Action**: Verify and update frontend

14. **post-invoice**
    - **Check**: `POST /api/v1/invoices/:id/post`
    - **Module**: InvoicesModule
    - **Action**: Add endpoint if missing

15. **allocate-payment**
    - **Check**: `POST /api/v1/payments/:id/allocate`
    - **Module**: PaymentsModule already exists
    - **Action**: Verify endpoint

16. **generate-financial-report**
    - **Check**: `GET /api/v1/financial-reports`
    - **Module**: FinancialReportsModule already exists
    - **Action**: Verify endpoint

17. **generate-quote-pdf**
    - **Target**: `POST /api/v1/invoices/:id/quote-pdf`
    - **Complexity**: Medium (PDF generation)
    - **ETA**: 1.5 hours

---

## Priority 5: Analytics & AI Features

These are complex but lower priority (might not be actively used):

18. **recommendations**
    - **Purpose**: Crop recommendations based on soil/climate
    - **Complexity**: High (ML/AI)
    - **Target**: `POST /api/v1/analytics/recommendations`
    - **ETA**: 2 hours
    - **Note**: Consider keeping as Edge Function

19. **crop-planning**
    - **Purpose**: Automated crop planning
    - **Complexity**: High
    - **Target**: `POST /api/v1/analytics/crop-planning`
    - **ETA**: 2 hours

20. **yield-prediction**
    - **Purpose**: Predict harvest yields
    - **Complexity**: High (ML)
    - **Target**: `POST /api/v1/analytics/yield-prediction`
    - **ETA**: 2 hours

21. **farm-analytics**
    - **Purpose**: General farm analytics
    - **Complexity**: Medium
    - **Target**: `GET /api/v1/analytics/farm/:id`
    - **ETA**: 1.5 hours

22. **irrigation-scheduling**
    - **Purpose**: Optimize irrigation schedule
    - **Complexity**: High
    - **Target**: `POST /api/v1/analytics/irrigation-schedule`
    - **ETA**: 2 hours

23. **task-assignment**
    - **Purpose**: Auto-assign tasks to workers
    - **Complexity**: Medium
    - **Target**: `POST /api/v1/tasks/auto-assign`
    - **ETA**: 1 hour

---

## Priority 6: Reporting

24. **generate-parcel-report**
    - **Purpose**: Generate PDF reports for parcels
    - **Complexity**: High (PDF generation)
    - **Target**: `POST /api/v1/parcels/:id/report`
    - **ETA**: 2 hours

25. **sensor-data**
    - **Purpose**: Process IoT sensor data
    - **Complexity**: Medium
    - **Target**: `POST /api/v1/sensors/data`
    - **ETA**: 1 hour

---

## Recommended Migration Order

### Phase 1: Critical Flows (Week 1)
**Priority: Get core features working on NestJS**

1. ✅ on-user-created (DONE)
2. ✅ create-trial-subscription (DONE)
3. check-subscription - **START HERE** ⭐
4. user-auth-data
5. polar-webhook

**Impact**: Core auth and payment flows working
**Estimated Time**: 3-4 hours

### Phase 2: Farm Management (Week 1-2)
**Priority: Enable full farm CRUD operations**

6. delete-farm
7. delete-parcel
8. export-farm
9. import-farm

**Impact**: Complete farm management workflow
**Estimated Time**: 4-5 hours

### Phase 3: User Management (Week 2)

10. invite-user
11. grant-worker-access

**Impact**: Team collaboration features
**Estimated Time**: 2 hours

### Phase 4: Accounting Verification (Week 2)
**Priority: Verify existing endpoints or add missing**

12. Verify InvoicesModule endpoints
13. Verify PaymentsModule endpoints
14. Verify FinancialReportsModule endpoints
15. generate-quote-pdf (if missing)

**Impact**: Complete accounting workflow
**Estimated Time**: 2-3 hours

### Phase 5: Analytics (Week 3-4)
**Priority: Can be deferred if not actively used**

16. Farm analytics
17. Task assignment
18. Parcel reports
19. Sensor data

**Impact**: Enhanced features
**Estimated Time**: 6-8 hours

### Phase 6: AI Features (Future/Optional)
**Priority: Keep as Edge Functions if CPU-intensive**

20. Recommendations
21. Crop planning
22. Yield prediction
23. Irrigation scheduling
24. generate-index-image

**Impact**: Advanced analytics
**Decision**: Keep some as Edge Functions for better scaling

---

## Migration Template

For each Edge Function, follow this pattern:

### 1. Analysis
- [ ] Read Edge Function code
- [ ] Identify dependencies
- [ ] Check database operations
- [ ] List required permissions

### 2. NestJS Implementation
- [ ] Create/update module
- [ ] Create DTO for request/response
- [ ] Create service with business logic
- [ ] Create controller with endpoint
- [ ] Add JWT auth guard
- [ ] Add validation
- [ ] Add error handling
- [ ] Add logging

### 3. Testing
- [ ] Unit tests for service
- [ ] Integration tests for endpoint
- [ ] Manual testing with Postman/curl
- [ ] Test with frontend

### 4. Frontend Update
- [ ] Find all `functions.invoke()` calls
- [ ] Replace with fetch/axios to NestJS
- [ ] Update error handling
- [ ] Test end-to-end

### 5. Deployment
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Monitor logs
- [ ] Verify functionality

### 6. Cleanup
- [ ] Mark Edge Function as deprecated
- [ ] Remove Edge Function (after 2 weeks stable)
- [ ] Update documentation

---

## Benefits of Migration

### Performance
- **No cold starts**: NestJS runs continuously
- **Faster response**: ~200-500ms vs 1-3 seconds
- **Connection pooling**: Reuse database connections

### Development
- **Type safety**: Full TypeScript with validation
- **Testing**: Better unit/integration testing
- **Debugging**: Better logging and error traces
- **Code reuse**: Shared services and utilities

### Operations
- **Monitoring**: Better observability with NestJS
- **Scaling**: Horizontal scaling with load balancer
- **Deployment**: Single Docker container vs 24 functions
- **Costs**: Potentially lower (depends on usage)

### Maintenance
- **Centralized logic**: All business logic in one codebase
- **Easier updates**: Update once, affects all endpoints
- **Consistency**: Uniform error handling and patterns

---

## When to Keep Edge Functions

Some functions might be better as Edge Functions:

1. **CPU-intensive tasks**: Image processing, ML models
2. **Long-running jobs**: > 30 seconds execution
3. **Scheduled tasks**: Cron jobs
4. **Infrequent use**: Called once per day/week

**Candidates to keep as Edge Functions:**
- generate-index-image (image processing)
- AI/ML features (recommendations, predictions)
- Scheduled reports (if implemented as cron)

---

## Success Metrics

Track these to measure migration success:

- ✅ Response time improvement
- ✅ Error rate reduction
- ✅ User satisfaction (fewer bugs)
- ✅ Development velocity (easier to add features)
- ✅ Cost savings (if applicable)

---

## Next Steps

1. **Review this plan** with your team
2. **Start with Phase 1**: check-subscription (highest impact)
3. **Deploy incrementally**: One endpoint at a time
4. **Monitor closely**: Watch logs and user feedback
5. **Iterate**: Adjust plan based on learnings

---

## Migration Checklist Template

Use this for each function:

```markdown
## [Function Name]

### Analysis
- [ ] Code reviewed
- [ ] Dependencies identified
- [ ] Database schema checked
- [ ] RLS policies reviewed
- [ ] Frontend usage mapped

### Implementation
- [ ] Module created/updated
- [ ] DTO created
- [ ] Service implemented
- [ ] Controller created
- [ ] Auth guard added
- [ ] Validation added
- [ ] Error handling added
- [ ] Logging added

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual API test
- [ ] Frontend integration test

### Deployment
- [ ] Code reviewed
- [ ] Backend deployed
- [ ] Frontend updated
- [ ] End-to-end tested
- [ ] Monitoring enabled

### Cleanup
- [ ] Edge Function deprecated
- [ ] Documentation updated
- [ ] Edge Function removed (after 2 weeks)

**Status**: 🟢 Complete / 🟡 In Progress / 🔴 Blocked
**Deployed**: YYYY-MM-DD
**Notes**: [Any issues or learnings]
```

---

**Total Functions**: 24
**Migrated**: 2 (8%)
**In Progress**: 1 (check-subscription next)
**Remaining**: 21 (92%)

**Estimated Total Time**: 30-40 hours
**Recommended Timeline**: 3-4 weeks at steady pace

🚀 **Ready to start Phase 1!**
