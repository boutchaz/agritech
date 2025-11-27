# Blog Setup Guide for AgriTech Platform

This guide will help you configure blog functionality in Strapi CMS and seed initial content.

## Step 1: Configure Strapi Permissions

The blog content types are created, but they need proper API permissions to be accessible.

### Access Strapi Admin

1. Open https://cms.thebzlab.online/admin in your browser
2. Log in with your admin credentials

### Configure Public Permissions (for reading blogs)

1. Navigate to **Settings** (⚙️ icon in sidebar)
2. Click **Users & Permissions plugin** under "USERS & PERMISSIONS PLUGIN"
3. Click **Roles**
4. Click **Public** role
5. Scroll down to find **BLOG** and **BLOG-CATEGORY** sections
6. Enable the following permissions:

   **For BLOG:**
   - ✅ `find` (list all blogs)
   - ✅ `findOne` (get single blog by ID/slug)

   **For BLOG-CATEGORY:**
   - ✅ `find` (list all categories)
   - ✅ `findOne` (get single category)

7. Click **Save** at the top right

### Configure Authenticated Permissions (optional - for API token)

If you want to use the API token to create/update blogs programmatically:

1. Go back to **Roles**
2. Click **Authenticated** role
3. Enable all permissions for BLOG and BLOG-CATEGORY:
   - ✅ `find`
   - ✅ `findOne`
   - ✅ `create`
   - ✅ `update`
   - ✅ `delete`
4. Click **Save**

## Step 2: Verify API Access

Test that the API is now accessible:

```bash
# Test public access (should return empty array or blogs)
curl https://cms.thebzlab.online/api/blogs

# Test categories
curl https://cms.thebzlab.online/api/blog-categories
```

If you get `{"data": []}` or actual data, the permissions are working! ✅

If you still get `403 Forbidden`, double-check the permissions configuration.

## Step 3: Run the Seeding Script

Once permissions are configured, run the seeding script to create initial content:

```bash
# From the project root directory
cd /Users/boutchaz/Documents/CodeLovers/agritech

# Run the seeding script
node cms/scripts/seed-blogs.js
```

The script will create:

### Blog Categories (6 total):
1. **Farm Management** - Best practices for farm operations
2. **Financial Management** - Accounting and budgeting tips
3. **Harvest & Production** - Harvest and production insights
4. **Stock & Inventory** - Inventory management guidance
5. **Technology & Innovation** - AgriTech innovations
6. **Sustainability** - Sustainable farming practices

### Blog Posts (6 total):
1. **Getting Started with Digital Farm Management** (Featured)
   - Introduction to the platform
   - Key features overview
   - Getting started guide

2. **From Harvest to Finance: Automating Your Agricultural Accounting** (Featured)
   - Task-to-harvest-to-finance workflow
   - Reception batch processing
   - Automated financial integration

3. **Smart Inventory Management for Agricultural Products** (Featured)
   - Item and stock management
   - Warehouse operations
   - Batch tracking

4. **Maximizing Parcel Profitability with Data-Driven Insights**
   - Profitability metrics
   - Analytics and reporting
   - Decision support

5. **Worker Management and Payment Automation**
   - Worker types and tracking
   - Payment automation
   - Compliance and reporting

6. **Sustainable Agriculture: Tracking Environmental Impact**
   - Environmental metrics
   - Sustainability tracking
   - Certification support

## Step 4: Verify Blog Content

After running the seeding script, verify the content is accessible:

### Via API:
```bash
# Get all blogs
curl https://cms.thebzlab.online/api/blogs?populate=*

# Get all categories
curl https://cms.thebzlab.online/api/blog-categories?populate=*

# Get a specific blog by slug
curl https://cms.thebzlab.online/api/blogs?filters[slug][$eq]=getting-started-digital-farm-management&populate=*
```

### Via Frontend:
1. Visit https://agritech-dashboard.thebzlab.online/
2. Click the "Blog" link in the navigation
3. You should see the 3 featured blog posts
4. Click on any post to read the full content

### Via Strapi Admin:
1. Go to https://cms.thebzlab.online/admin
2. Click **Content Manager** in sidebar
3. Click **Blog** - you should see 6 blog posts
4. Click **Blog Category** - you should see 6 categories

## Step 5: Publish Blog Posts (if needed)

If the posts are not visible on the frontend:

1. In Strapi Admin, go to **Content Manager > Blog**
2. Click on each blog post
3. Click **Publish** button in the top right
4. Repeat for all posts

## Troubleshooting

### Issue: "403 Forbidden" when accessing API

**Solution:**
- Double-check permissions in Settings > Roles > Public
- Make sure both `find` and `findOne` are enabled for Blog and Blog-Category
- Save and refresh the browser

### Issue: "Content Type not found"

**Solution:**
- Verify the Blog and Blog-Category content types exist in Strapi
- Check `cms/src/api/blog/` and `cms/src/api/blog-category/` directories
- Restart Strapi if you just created the content types

### Issue: Seeding script fails with authentication error

**Solution:**
- Use Strapi Admin UI to create content manually, OR
- Create an API token:
  1. Settings > API Tokens
  2. Create new token with "Full access"
  3. Copy the token
  4. Update the token in the script or set as environment variable:
     ```bash
     export STRAPI_API_TOKEN="your-new-token-here"
     node cms/scripts/seed-blogs.js
     ```

### Issue: Blog posts created but not visible on frontend

**Solution:**
- Make sure posts are **Published** (not Draft)
- Check that Public permissions are enabled
- Verify the frontend blog components are deployed
- Check browser console for any API errors

## Manual Content Creation (Alternative)

If you prefer to create content manually via Strapi Admin:

1. Go to **Content Manager > Blog Category**
2. Click **Create new entry**
3. Fill in: Name, Slug, Description
4. Click **Save**
5. Repeat for all categories

Then create blog posts:

1. Go to **Content Manager > Blog**
2. Click **Create new entry**
3. Fill in all fields:
   - Title (required)
   - Slug (auto-generated from title)
   - Excerpt (required)
   - Content (required, use rich text editor)
   - Author (required)
   - Reading Time (minutes)
   - Is Featured (check for featured posts)
   - Tags (JSON array: `["tag1", "tag2"]`)
   - Blog Category (select from dropdown)
   - SEO fields (optional)
4. Click **Save**
5. Click **Publish** to make it public
6. Repeat for all posts

## Next Steps

Once blogs are created and published:

1. ✅ Verify they appear on the frontend blog page
2. ✅ Check that featured posts show on the landing page
3. ✅ Test filtering by category
4. ✅ Test search functionality
5. ✅ Verify SEO metadata is correct

## Support

If you encounter issues:
- Check Strapi logs: `docker logs cms-container-name`
- Check frontend console for errors
- Verify API endpoints are accessible
- Review permissions configuration

Happy blogging! 🌾📝
