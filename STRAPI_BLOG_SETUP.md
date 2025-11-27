# Strapi Blog Setup - Step by Step Guide

## Current Status

✅ Strapi CMS is running at https://cms.thebzlab.online
✅ Blog and Blog Category content types are created
✅ Seeding script is ready at `cms/scripts/seed-blogs.js`
❌ API token needs to be regenerated (current token returns 401)
❌ Public permissions need to be configured (returns 403)

## Step 1: Log into Strapi Admin

1. Go to https://cms.thebzlab.online/admin
2. Enter your admin credentials
3. You should see the Strapi dashboard

## Step 2: Generate New API Token

1. Click **Settings** (⚙️ icon) in the left sidebar
2. Under "GLOBAL SETTINGS", click **API Tokens**
3. Click **+ Create new API Token** button
4. Fill in the form:
   - **Name**: `AgriTech Blog API`
   - **Description**: `Full access token for blog seeding and management`
   - **Token duration**: `Unlimited` (or your preference)
   - **Token type**: `Full access`
5. Click **Save**
6. **IMPORTANT**: Copy the generated token immediately (it won't be shown again!)
7. Save it somewhere safe

## Step 3: Configure Public Permissions (for frontend blog access)

1. In **Settings** (⚙️), go to **Users & Permissions plugin**
2. Click **Roles**
3. Click **Public** role
4. Scroll down to find the **BLOG** section
5. Check these permissions:
   - ✅ `find` - allows listing all blogs
   - ✅ `findOne` - allows getting single blog by ID/slug
6. Scroll to **BLOG-CATEGORY** section
7. Check these permissions:
   - ✅ `find` - allows listing all categories
   - ✅ `findOne` - allows getting single category
8. Click **Save** button at the top right

## Step 4: Update API Token in Environment

Replace the old token with your new one:

### Option A: Update .env file
```bash
# Edit agritech-api/.env
nano agritech-api/.env

# Find STRAPI_API_TOKEN and replace with your new token
STRAPI_API_TOKEN=your-new-token-here
```

### Option B: Set environment variable
```bash
export STRAPI_API_TOKEN="your-new-token-here"
```

## Step 5: Run the Seeding Script

```bash
# Make sure you're in the project root
cd /Users/boutchaz/Documents/CodeLovers/agritech

# Run the seeding script with your new token
STRAPI_API_TOKEN="your-new-token-here" node cms/scripts/seed-blogs.js
```

The script will create:

**6 Blog Categories:**
1. Farm Management
2. Financial Management
3. Harvest & Production
4. Stock & Inventory
5. Technology & Innovation
6. Sustainability

**6 Blog Posts:**
1. Getting Started with Digital Farm Management (Featured)
2. From Harvest to Finance: Automating Your Agricultural Accounting (Featured)
3. Smart Inventory Management for Agricultural Products (Featured)
4. Maximizing Parcel Profitability with Data-Driven Insights
5. Worker Management and Payment Automation
6. Sustainable Agriculture: Tracking Environmental Impact

## Step 6: Verify the Setup

### Test 1: API Access
```bash
# Test without authentication (should work if public permissions are set)
curl https://cms.thebzlab.online/api/blogs

# Test with your new token
curl -H "Authorization: Bearer your-new-token-here" \
  https://cms.thebzlab.online/api/blogs
```

### Test 2: Check in Strapi Admin
1. Go to **Content Manager** in the left sidebar
2. Click **Blog** - you should see 6 blog posts
3. Click **Blog Category** - you should see 6 categories
4. Click on any blog post to view/edit it

### Test 3: Frontend Access
1. Go to https://agritech-dashboard.thebzlab.online/
2. Click **Blog** in the navigation
3. You should see the 3 featured blog posts
4. Click on any post to read the full content

## Step 7: Publish Blog Posts (if needed)

If posts are not visible on the frontend:

1. In Strapi Admin, go to **Content Manager > Blog**
2. For each blog post:
   - Click to open it
   - Click the **Publish** button in the top right
   - Confirm publication
3. Refresh the frontend and check again

## Troubleshooting

### Issue: "401 Unauthorized" when using API token

**Solution:**
- The token is invalid or expired
- Generate a new token following Step 2
- Make sure you copied the entire token (they're very long!)
- Update the token in your environment/script

### Issue: "403 Forbidden" when accessing API publicly

**Solution:**
- Public permissions are not configured
- Follow Step 3 to enable `find` and `findOne` for both Blog and Blog-Category
- Make sure you clicked **Save**
- Try again after a few seconds

### Issue: Seeding script fails with "Content Type not found"

**Solution:**
- The blog content types might not be deployed yet
- Check if `cms/src/api/blog/` and `cms/src/api/blog-category/` exist
- If they exist, restart Strapi:
  ```bash
  # If using Docker
  docker restart cms-container-name

  # If running locally
  cd cms && npm run develop
  ```

### Issue: Blog posts created but not visible on frontend

**Solutions:**
1. **Check if published**: Posts must be in "Published" state, not "Draft"
2. **Check permissions**: Public role must have `find` and `findOne` enabled
3. **Check frontend**: Make sure frontend is deployed with latest code
4. **Check browser console**: Look for any API errors in developer tools

## Quick Commands

### Test API (replace with your token)
```bash
export TOKEN="your-token-here"

# List all blogs
curl -H "Authorization: Bearer $TOKEN" \
  "https://cms.thebzlab.online/api/blogs?populate=*"

# List all categories
curl -H "Authorization: Bearer $TOKEN" \
  "https://cms.thebzlab.online/api/blog-categories"

# Get a specific blog by slug
curl -H "Authorization: Bearer $TOKEN" \
  "https://cms.thebzlab.online/api/blogs?filters[slug][\$eq]=getting-started-digital-farm-management&populate=*"
```

### Manual Blog Creation (via API)

If the script doesn't work, you can create blogs manually via API:

```bash
# Create a category
curl -X POST "https://cms.thebzlab.online/api/blog-categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Farm Management",
      "slug": "farm-management",
      "description": "Best practices for farm operations"
    }
  }'

# Create a blog post
curl -X POST "https://cms.thebzlab.online/api/blogs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "title": "Getting Started",
      "slug": "getting-started",
      "excerpt": "Learn the basics",
      "content": "Full content here...",
      "author": "AgriTech Team",
      "reading_time": 5,
      "is_featured": true
    }
  }'
```

## Next Steps After Setup

Once blogs are seeded and accessible:

1. ✅ Review content in Strapi admin and make any adjustments
2. ✅ Add featured images to blog posts (optional)
3. ✅ Customize SEO metadata
4. ✅ Create additional blog posts as needed
5. ✅ Set up a content calendar
6. ✅ Configure automatic deployment when new posts are published

## Support

For issues or questions:
- Check Strapi logs: `docker logs strapi-container-name`
- Check API logs: Look for "[StrapiService]" in NestJS logs
- Review this guide: `/Users/boutchaz/Documents/CodeLovers/agritech/cms/BLOG_SETUP_GUIDE.md`
- Consult Strapi docs: https://docs.strapi.io

---

**Ready to start? Begin with Step 1!** 🚀
