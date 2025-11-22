# Fix: Subscription Required Error

## Problem
When running the app locally, you're seeing:
```
Subscription Required
Your subscription has expired.
Organization: codelovers
Access Restricted
```

## Root Cause
Your organization doesn't have an active subscription in the database. The app checks subscription status via the NestJS API endpoint `/api/v1/subscriptions/check`, which calls the database function `has_valid_subscription()`.

## Solution: Create a Trial Subscription

You need to create a trial subscription for your "codelovers" organization. This will give you 14 days of access.

### Option 1: Using the Frontend (Recommended)

1. **Login to the app** at `http://localhost:5173` with your credentials
2. **You'll see the subscription required screen**
3. **Click "View Subscription Plans"** button
4. **Select a plan** and click "Start Trial" (no payment required for trial)
5. **Refresh the page** - you should now have access!

### Option 2: Using curl (Quick Fix)

If the frontend doesn't work, you can create the subscription directly via API:

```bash
# Step 1: Login to get your access token
curl -X POST "https://agritech-api.thebzlab.online/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD"
  }'

# Copy the access_token from the response

# Step 2: Create trial subscription
curl -X POST "https://agritech-api.thebzlab.online/api/v1/subscriptions/trial" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "organization_id": "YOUR_ORG_ID",
    "plan_type": "PROFESSIONAL"
  }'
```

### Option 3: Using the Script

I created a helper script for you:

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech
./create-trial-subscription.sh
```

Follow the prompts to:
1. Enter your email and password
2. Enter your organization ID
3. Select plan type (PROFESSIONAL recommended)

The script will create the trial subscription and you'll have immediate access.

## Finding Your Organization ID

If you don't know your organization ID, you can find it by:

1. **In the browser console** (when logged in):
   ```javascript
   // Go to http://localhost:5173 and open browser console
   // Look for logs showing organization ID
   ```

2. **Or check the URL** when you navigate to organization settings

3. **Or run this query** (if you have database access):
   ```sql
   SELECT id, name FROM organizations WHERE name = 'codelovers';
   ```

## What the Trial Subscription Includes

The trial subscription gives you:
- **14 days** of full access
- All features enabled
- Resource limits based on plan:
  - **STARTER**: 5 farms, 50 parcels, 5 users
  - **PROFESSIONAL**: 20 farms, 200 parcels, 20 users
  - **ENTERPRISE**: Unlimited

After trial expires:
- You'll be prompted to upgrade to a paid plan
- Or you can create another trial (for development)

## Verifying the Fix

After creating the trial subscription:

1. **Refresh your browser** at `http://localhost:5173`
2. **You should see the dashboard** instead of the subscription screen
3. **Check browser console** for logs showing subscription status
4. **Navigate to Farm Hierarchy** to test the new features

The subscription check runs automatically every 5 minutes, so you might need to wait or refresh the page.

## API Endpoint Details

### POST /api/v1/subscriptions/trial
Creates a trial subscription for an organization.

**Request**:
```json
{
  "organization_id": "uuid-here",
  "plan_type": "PROFESSIONAL"
}
```

**Response**:
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "organization_id": "uuid",
    "plan_id": "professional-trial",
    "status": "trialing",
    "current_period_start": "2025-11-22T...",
    "current_period_end": "2025-12-06T...",
    "cancel_at_period_end": false
  }
}
```

### POST /api/v1/subscriptions/check
Checks subscription validity.

**Request**:
```json
{
  "organizationId": "uuid-here",
  "feature": "optional-feature-name"
}
```

**Response**:
```json
{
  "isValid": true,
  "subscription": { ... },
  "usage": {
    "farms": { "current": 2, "max": 20, "canCreate": true },
    "parcels": { "current": 9, "max": 200, "canCreate": true },
    "users": { "current": 1, "max": 20, "canAdd": true }
  }
}
```

## Troubleshooting

### "Organization not found" error
- Make sure the organization ID is correct
- Check that you have access to the organization

### "User does not belong to this organization"
- Verify you're logged in with the correct account
- Check that you're a member of the organization

### Trial already exists
- The API will update the existing trial
- You'll get a new 14-day period

### Still seeing subscription screen
- Clear browser cache and cookies
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for errors

## Need Help?

If you're still having issues:
1. Check the browser console for error messages
2. Check the API logs for subscription check failures
3. Verify the organization exists in the database
4. Ensure the `has_valid_subscription()` database function exists

---

**Quick Fix Command** (replace values):
```bash
curl -X POST "https://agritech-api.thebzlab.online/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpass"}' \
  | jq -r '.access_token' \
  | xargs -I {} curl -X POST "https://agritech-api.thebzlab.online/api/v1/subscriptions/trial" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {}" \
  -d '{"organization_id":"YOUR_ORG_ID","plan_type":"PROFESSIONAL"}'
```

Replace `your@email.com`, `yourpass`, and `YOUR_ORG_ID` with your actual values.
