# ✅ Auth Setup Solution - Organization Auto-Creation

## Problem
When users sign up, they weren't getting entries in `organization_users` table, causing the error:
```
organization_users query result: {orgUsers: Array(0), orgUsersError: null}
⚠️ No organization_users found for user
```

## Solution Approach
**Programmatic Setup** (Application Layer) ✅

We handle user setup in the React application during signup/login instead of database triggers.

### Why Application Layer?
- ✅ More flexible and debuggable
- ✅ Better error handling and user feedback
- ✅ Easier to test
- ✅ Can handle complex business logic
- ✅ No database trigger maintenance

## Implementation

### 1. Created `src/utils/authSetup.ts`

#### `setupNewUser()` Function
Automatically creates when user signs up:
1. **User Profile** in `user_profiles` table
2. **Default Organization** in `organizations` table
3. **Organization Membership** in `organization_users` with `organization_admin` role

```typescript
await setupNewUser({
  userId: user.id,
  email: user.email,
  firstName: 'John',  // optional
  lastName: 'Doe',    // optional
  organizationName: 'My Farm', // optional
});
```

**Default Values:**
- Organization name: `{firstName}'s Organization` or `{email-prefix}'s Organization`
- Organization slug: Auto-generated from name + user ID prefix
- Currency: MAD
- Timezone: Africa/Casablanca
- Language: fr
- Role: organization_admin

#### `checkUserNeedsOnboarding()` Function
Checks if user has:
- User profile
- Organization membership

Returns `true` if either is missing.

### 2. Updated `src/components/Auth.tsx`

#### On Signup:
- Creates user account with Supabase Auth
- **Immediately calls `setupNewUser()`** to create profile + organization
- Shows success or error message

#### On Login:
- Checks if user needs onboarding with `checkUserNeedsOnboarding()`
- **Automatically runs setup** if missing data
- Allows seamless login for users with incomplete setup

### 3. Handles Edge Cases

✅ **Duplicate user profile**: Ignores `23505` error code (already exists)
✅ **Missing roles table**: Throws helpful error message
✅ **Already has organization**: Skips creation to avoid duplicates
✅ **Email confirmation failures**: Falls back to direct signin with setup

## Testing the Solution

### Test New Signup:
1. Sign up with new email
2. Check database:
```sql
SELECT * FROM user_profiles WHERE id = '{user_id}';
SELECT * FROM organizations WHERE created_by = '{user_id}';
SELECT * FROM organization_users WHERE user_id = '{user_id}';
```
3. Should see all 3 records created

### Test Existing User Login (Missing Data):
1. Login with account that has no organization
2. Setup runs automatically
3. User gets organization created

### Test Normal Login:
1. Login with complete account
2. No duplicate setup runs
3. Normal login flow

## Database Requirements

### Required Tables:
- ✅ `user_profiles`
- ✅ `organizations`
- ✅ `organization_users`
- ✅ `roles` (with at least `organization_admin` role)

### Required Permissions (RLS):
Users must be able to:
- INSERT into `user_profiles` (own profile)
- INSERT into `organizations`
- INSERT into `organization_users` (own membership)
- SELECT from `roles` (to get role IDs)

## Benefits

### ✅ Advantages:
- **User-friendly**: Automatic setup, no manual steps
- **Recoverable**: Can retry setup on next login
- **Debuggable**: Console logs for troubleshooting
- **Flexible**: Easy to add custom logic (welcome emails, default farms, etc.)
- **Testable**: Can unit test the setup function

### ⚠️ Considerations:
- Requires proper RLS policies for insert operations
- Need to ensure `roles` table is seeded with `organization_admin`
- Edge case: User might partially signup (profile created but no org) - handled by login check

## Next Steps (Optional Enhancements)

1. **Welcome Email**: Send after successful setup
2. **Default Farm**: Create a starter farm for new organizations
3. **Onboarding Wizard**: Guide users through initial setup
4. **Admin Dashboard**: View/fix incomplete user setups
5. **Audit Logging**: Track when users are auto-setup

## Rollout Plan

1. ✅ **Development**: Test locally with new signups
2. ✅ **Staging**: Deploy and test with test accounts
3. **Production**:
   - Deploy code
   - Monitor logs for setup failures
   - Run migration for existing users without organizations:
   ```sql
   -- Find users needing setup
   SELECT u.id, u.email
   FROM auth.users u
   LEFT JOIN organization_users ou ON ou.user_id = u.id
   WHERE ou.id IS NULL;
   ```

## Troubleshooting

### Issue: "organization_admin role not found"
**Fix**: Seed roles table:
```sql
INSERT INTO roles (name, description) VALUES
('organization_admin', 'Organization Administrator');
```

### Issue: Setup fails silently
**Check**: Browser console for error logs
**Check**: RLS policies allow inserts

### Issue: Duplicate organizations created
**Check**: `checkUserNeedsOnboarding()` logic
**Fix**: Query should check existing org_users before creating

---

**Status**: ✅ Implemented and Ready for Testing
