# Staging Environment

Guide for setting up and maintaining a staging environment for the AgriTech Platform.

## Purpose

Staging environment serves as a production-like environment for:
- Testing new features before production
- QA and user acceptance testing
- Performance testing
- Integration testing with external services
- Training and demos

## Setup

### 1. Create Staging Supabase Project

```bash
# Create new Supabase project
# Name: agritech-staging
# Region: Same as production
# Tier: Can be lower than production for cost savings

# Link to staging project
npx supabase link --project-ref your-staging-ref
```

### 2. Apply Database Migrations

```bash
cd project

# Apply all migrations to staging
npx supabase db push

# Generate types for staging
npx supabase gen types typescript --linked > src/types/database.staging.types.ts

# Seed test data
npx supabase db seed
```

### 3. Deploy Frontend to Staging

**Vercel**:

```bash
# Deploy to preview
vercel

# Or use branch deployments
# Vercel automatically deploys develop branch to staging URL
```

**Netlify**:

```bash
# Deploy to staging
netlify deploy --alias staging
```

**Environment Variables** (Staging):

```bash
VITE_SUPABASE_URL=https://staging-xxx.supabase.co
VITE_SUPABASE_ANON_KEY=staging-anon-key
VITE_SATELLITE_SERVICE_URL=https://satellite-staging.yourdomain.com
VITE_POLAR_ACCESS_TOKEN=polar_at_staging
VITE_POLAR_SERVER=sandbox
VITE_POLAR_CHECKOUT_URL=https://sandbox.polar.sh/checkout/...
NODE_ENV=staging
```

### 4. Deploy Satellite Service to Staging

```bash
# SSH to staging server
ssh user@staging-server

# Clone and deploy
git clone https://github.com/yourusername/agritech.git
cd agritech/satellite-indices-service

# Use staging environment
cp .env.staging .env

# Build and run
docker build -t satellite-service:staging .
docker run -d -p 8001:8001 --env-file .env --name satellite-staging satellite-service:staging
```

## Staging Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Develop and test locally
npm run dev

# Push to trigger staging deployment
git push origin feature/new-feature
```

### 2. Testing on Staging

**Manual Testing**:
- Navigate to https://staging.yourdomain.com
- Test new features
- Verify existing functionality not broken
- Test edge cases
- Cross-browser testing

**Automated Testing**:
```bash
# Run E2E tests against staging
PLAYWRIGHT_BASE_URL=https://staging.yourdomain.com npm run test:e2e
```

### 3. QA Approval

- [ ] Feature works as expected
- [ ] No regressions
- [ ] Performance acceptable
- [ ] Security checked
- [ ] Documentation updated

### 4. Promote to Production

```bash
# Merge to main
git checkout main
git merge feature/new-feature
git push origin main

# Triggers production deployment
```

## Data Management

### Test Data

**Seed staging with realistic data**:

```sql
-- In supabase/seed.sql
INSERT INTO organizations (id, name, currency) VALUES
  ('org-test-1', 'Test Organization', 'USD'),
  ('org-test-2', 'Demo Organization', 'MAD');

INSERT INTO farms (id, organization_id, name, area) VALUES
  ('farm-1', 'org-test-1', 'North Farm', 100),
  ('farm-2', 'org-test-1', 'South Farm', 150);

-- Add more test data...
```

```bash
# Apply seed
npx supabase db seed
```

### Data Refresh

**Refresh staging data from production** (careful with PII):

```bash
# Backup production
npx supabase db dump --linked > prod-backup.sql

# Anonymize sensitive data
sed -i 's/real-email@example.com/test+1@example.com/g' prod-backup.sql
sed -i 's/real-phone/555-0100/g' prod-backup.sql

# Restore to staging
psql $STAGING_DATABASE_URL < prod-backup.sql
```

## Monitoring

### Logs

```bash
# Frontend logs
vercel logs staging-deployment-url

# Backend logs
docker logs satellite-staging

# Database logs
# Check in Supabase Dashboard → Logs
```

### Alerts

**Set up staging-specific alerts**:
- Error rate > 5%
- Response time > 2s
- Staging deployment failures

**Notification channels**:
- Slack #staging-alerts channel
- Email to dev team
- Don't wake people up for staging issues

## Differences from Production

### Relaxed Requirements

| Aspect | Production | Staging |
|--------|-----------|---------|
| Uptime | 99.9% | 95% |
| Performance | Optimized | Acceptable |
| Security | Strict | Relaxed (no real data) |
| Backups | Daily | Weekly |
| Resources | High | Medium |
| Monitoring | 24/7 | Business hours |

### Debug Mode

```typescript
// Enable additional debugging in staging
if (import.meta.env.VITE_ENV === 'staging') {
  // Verbose logging
  console.log('Staging mode: verbose logging enabled');

  // Expose debug helpers
  window.__DEBUG__ = {
    queryClient,
    supabase,
    // Other debug utilities
  };

  // React Query DevTools always open
  <ReactQueryDevtools initialIsOpen={true} />
}
```

### Feature Flags

**Test new features in staging first**:

```typescript
const features = {
  newDashboard: import.meta.env.VITE_ENV === 'staging',
  betaFeature: import.meta.env.VITE_ENV === 'staging',
};

// In component
{features.newDashboard ? <NewDashboard /> : <OldDashboard />}
```

## Access Control

### Staging Access

**Limit access to staging**:

```sql
-- In Supabase Authentication settings
-- Only allow specific email domains
email LIKE '%@yourdomain.com'

-- Or whitelist specific emails
email IN (
  'dev1@company.com',
  'qa@company.com',
  'manager@company.com'
)
```

**Basic Auth** (optional additional layer):

```nginx
# Nginx config
location / {
    auth_basic "Staging Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:5173;
}
```

## Maintenance

### Regular Tasks

**Weekly**:
- Refresh test data
- Update to latest main branch
- Review staging logs
- Clear old test data

**Monthly**:
- Full dependency updates
- Security scan
- Performance review
- Cost review

### Cleanup

```bash
# Remove old deployments (Vercel)
vercel remove old-deployment-url

# Clean database
DELETE FROM tasks WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '7 days';

# Clear storage buckets
# Delete old test files
```

## Cost Optimization

### Reduce Staging Costs

1. **Use lower-tier Supabase plan**
   - Smaller database
   - Fewer connections
   - Less storage

2. **Shut down during off-hours**
   ```bash
   # Cron job to stop staging at night
   0 20 * * 1-5 docker stop satellite-staging
   0 8 * * 1-5 docker start satellite-staging
   ```

3. **Shared staging environment**
   - Multiple branches can share same staging
   - Use feature flags for branch-specific features

4. **Mock expensive services**
   - Mock satellite service for some tests
   - Use test payment provider
   - Mock email sending

## Troubleshooting

### Staging Not Working

**Check deployment status**:
```bash
vercel ls
vercel logs <deployment-url>
```

**Check environment variables**:
- Verify all required variables set
- Check for typos
- Ensure staging values, not production

**Check database connection**:
```bash
# Test connection
psql $STAGING_DATABASE_URL -c "SELECT 1"

# Check RLS policies
# Ensure test users have access
```

### Data Issues

**Reset staging database**:
```bash
npx supabase db reset --linked
npx supabase db seed
```

**Sync schema from production**:
```bash
# Pull production schema
npx supabase db pull --linked

# Apply to staging
npx supabase db push
```

## Best Practices

1. **Keep staging close to production**
   - Same versions
   - Similar configuration
   - Representative data

2. **Automate staging deployments**
   - Auto-deploy from develop branch
   - Run automated tests
   - Notify team of deployments

3. **Document staging differences**
   - Feature flags
   - Mock services
   - Test accounts

4. **Use staging for training**
   - Onboard new developers
   - Train support team
   - Demo to stakeholders

5. **Test migrations in staging first**
   - Always test database changes
   - Verify rollback procedures
   - Check performance impact

Following these staging practices ensures safe, reliable deployments to production.
