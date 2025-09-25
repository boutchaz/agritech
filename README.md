# AgriTech Platform

## 🌱 Complete AgriTech Platform with Supabase & MCP Integration

A comprehensive agricultural technology platform with multi-tenant architecture, satellite data analysis, and AI-powered insights.

## 🏗️ Architecture

```
AgriTech Platform
├── Frontend (React + TypeScript)
├── Backend (FastAPI + Python)
├── Database (Supabase PostgreSQL)
├── Satellite Service (Google Earth Engine)
└── AI Integration (Cursor MCP)
```

## 🚀 Quick Start

### 1. Database Setup

For any fresh Supabase instance, run the setup script:

1. **Go to SQL Editor** in Supabase Dashboard
2. **Copy and paste** `complete-supabase-setup.sql`
3. **Run the script**
4. **Verify success** - you'll see table counts

### 2. MCP Integration (Cursor)

Update your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase-self-hosted": {
      "command": "node",
      "args": ["/path/to/mcp-supabase-self-hosted/dist/server.js"],
      "env": {
        "SUPABASE_URL": "YOUR_SUPABASE_URL",
        "SUPABASE_ANON_KEY": "YOUR_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_KEY",
        "SUPABASE_JWT_SECRET": "YOUR_JWT_SECRET"
      }
    }
  }
}
```

### 3. Run Services

```bash
# Frontend
cd project && npm install && npm run dev

# Satellite Service
cd satellite-indices-service && pip install -r requirements.txt && python -m uvicorn app.main:app --reload

# With Docker
docker-compose up -d
```

## 📊 Database Schema

### Core Tables
- **`user_profiles`** - User information and preferences
- **`organizations`** - Multi-tenant organizations
- **`organization_users`** - User-organization relationships with roles
- **`farms`** - Farm management and metadata
- **`parcels`** - Parcel/crop management and tracking

### Helper Functions
- `get_user_organizations()` - Get user's organizations
- `get_organization_farms()` - Get organization's farms
- `get_current_user_profile()` - Get current user profile
- `create_organization_with_owner()` - Create org with owner

### Architecture
```
Organizations (Multi-tenant)
├── Organization Users (Roles: owner, admin, member, viewer)
└── Farms
    └── Parcels (Crops)
```

## 🛠️ Features

### 🌾 Agricultural Management
- **Farm Management** - Track multiple farms per organization
- **Parcel Management** - Monitor individual crop parcels
- **Crop Tracking** - Planting dates, harvest schedules, status tracking
- **Multi-tenant** - Support for multiple organizations

### 🛰️ Satellite Analysis
- **Google Earth Engine Integration** - Advanced satellite data processing
- **Vegetation Indices** - NDVI, NDWI, and other agricultural indices
- **Time Series Analysis** - Historical crop monitoring
- **Export Capabilities** - Download maps and data

### 🤖 AI Integration
- **Cursor MCP Integration** - AI-powered database queries
- **Natural Language Queries** - Ask questions about your data
- **Automated Insights** - AI-generated recommendations
- **Data Analysis** - Intelligent crop monitoring

### 👥 User Management
- **Authentication** - Secure user registration and login
- **Role-based Access** - Owner, admin, member, viewer roles
- **Multi-tenant** - Isolated data per organization
- **Profile Management** - User preferences and settings

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
GEE_SERVICE_ACCOUNT=your_gee_service_account
GEE_PRIVATE_KEY=your_gee_private_key
GEE_PROJECT_ID=your_gee_project_id
```

## 📁 Project Structure

```
agritech/
├── project/                    # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── routes/           # Application routes
│   │   └── lib/              # Utilities
│   └── supabase/             # Database setup
├── satellite-indices-service/ # FastAPI backend
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── services/         # Business logic
│   │   └── models/           # Data models
│   └── research/             # Jupyter notebooks
├── mcp-supabase-self-hosted/ # MCP server
└── complete-supabase-setup.sql # Database setup
```

## 🧪 Testing

### Database
```bash
# Test user creation
curl -X POST "YOUR_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Test user profiles
curl -H "apikey: YOUR_ANON_KEY" \
  "YOUR_SUPABASE_URL/rest/v1/user_profiles?select=*"
```

### MCP Integration
In Cursor, try:
- "List all user profiles in my Supabase database"
- "Show me database statistics"
- "Create a new organization"

## 🚀 Deployment

### Docker
```bash
docker-compose up -d
```

### Manual
```bash
# Frontend
cd project && npm run build && npm run preview

# Backend
cd satellite-indices-service && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 📚 Documentation

- **Database Setup**: Run `complete-supabase-setup.sql`
- **MCP Integration**: Configure `~/.cursor/mcp.json`
- **API Documentation**: Available at `/docs` when running the backend
- **Frontend**: React + TypeScript with TanStack Router

## 🔒 Security

- **Row Level Security** - Can be enabled per table
- **JWT Authentication** - Secure user sessions
- **Role-based Access** - Granular permissions
- **Foreign Key Constraints** - Data integrity
- **SECURITY DEFINER Functions** - Controlled database access

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for modern agriculture**

organisme A 
    parcel A1
         AOI( Area of Interest) A1
    parcel A2
         AOI( Area of Interest) A2
    parcel A3
         AOI( Area of Interest) A3
      divergentSubParcel A3_a
         AOI( Area of Interest) A3_a
      divergentSubParcel A3_b
         AOI( Area of Interest) A3_b
organisme B
    parcel B1
    parcel B2
    parcel B3
organisme C
    parcel C1
    parcel C2
    parcel C3


Calculate vegetation indices for a given AOI and date range (google earth engine our source of data)
{
  "aoi": {
    "geometry": {
      "type": "Point",
      "coordinates": [
        "string"
      ]
    },
    "name": "string"
  },
  "date_range": {
    "start_date": "6084-16-91",
    "end_date": "5166-29-63"
  },
  "indices": [
    "NDVI"
  ],
  "cloud_coverage": 10, // maximum cloud coverage percentage 
  "scale": 10
}

data should be relevant (think of a solution to make data fresh (polling ? cron job ?))


calculate statistics for each parcel and sub parcel of the organism for each index and save the data in a database as .tif files
/**
 * Impact of Cloud Coverage on Vegetation Index Calculations and Data Storage
 *
 * Cloud coverage is a critical parameter when calculating vegetation indices using satellite imagery (e.g., from Google Earth Engine).
 * 
 * 1. **Reading/Calculation Impact:**
 *    - High cloud coverage can obscure the land surface, leading to inaccurate or missing index values (e.g., NDVI, NDRE).
 *    - When cloud coverage is high, the satellite image pixels may represent clouds instead of vegetation, resulting in artificially low or invalid index readings.
 *    - Setting a lower `cloud_coverage` threshold (e.g., 10%) in your API request ensures that only images with minimal cloud interference are used, improving the reliability and accuracy of the calculated indices.
 *    - However, a very strict threshold may reduce the number of available images, especially in regions or seasons with frequent cloud cover, potentially leading to data gaps.
 *
 * 2. **Calculation Savings and Storage:**
 *    - By filtering out images with high cloud coverage, you avoid unnecessary computation on poor-quality data, saving processing time and resources.
 *    - Only high-quality, cloud-free (or low-cloud) images are processed and saved as .tif files in your database, reducing storage of irrelevant or misleading data.
 *    - This also means that your statistics (mean, min, max, etc.) for each parcel and sub-parcel are more representative of actual ground conditions, rather than being skewed by cloud artifacts.
 *
 * 3. **Best Practices:**
 *    - Choose a `cloud_coverage` value that balances data quality and data availability for your region of interest.
 *    - Consider implementing a fallback or notification system if no cloud-free images are available for a given time period.
 *    - Store metadata about cloud coverage with each .tif file for traceability and quality control.
 */
//
// Example: 
// "cloud_coverage": 10 // Only use images with less than or equal to 10% cloud cover
/**
 * Yes, you can estimate or check the expected cloud coverage for a given area and date range before running your cronjob.
 * 
 * Here are two practical approaches:
 * 
 * 1. **Pre-check with Google Earth Engine (GEE):**
 *    - Use GEE to query the available satellite images for your AOI (area of interest) and date range.
 *    - Filter the image collection by your desired `cloud_coverage` threshold (e.g., 10%).
 *    - Count the number of images that meet the threshold.
 *    - If no images are available with acceptable cloud coverage, you can skip the calculation for that parcel/date or notify the user/admin.
 *    - This can be done in a lightweight "preflight" step before running the full calculation and export.
 * 
 * 2. **Metadata Query:**
 *    - Many satellite image providers (e.g., Sentinel-2, Landsat) include a `CLOUDY_PIXEL_PERCENTAGE` or similar property in their image metadata.
 *    - You can query this property for all images in your date range and AOI, and select only those that meet your criteria.
 *    - This can be done via a simple API call or GEE script.
 * 
 * **Example (Python pseudocode for GEE):**
 * 
 * ```python
 * import ee
 * 
 * def has_cloud_free_image(aoi, start_date, end_date, max_cloud_coverage):
 *     collection = (ee.ImageCollection('COPERNICUS/S2')
 *                   .filterBounds(aoi)
 *                   .filterDate(start_date, end_date)
 *                   .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', max_cloud_coverage)))
 *     count = collection.size().getInfo()
 *     return count > 0
 * 
 * # Usage in your cronjob:
 * if has_cloud_free_image(aoi, start_date, end_date, 10):
 *     # Proceed with calculation and export
 * else:
 *     # Skip or notify: no suitable images available
 * ```
 * 
 * **Integration in Cronjob:**
 * - Before running the main calculation for each parcel/sub-parcel, call a function like `has_cloud_free_image`.
 * - Only proceed if the function returns `True`.
 * - This ensures you only process and store data when valid, low-cloud images are available, improving automation reliability and data quality.
 */


/**
 * Enhanced Logic for Automatic Cloud-Free Image Check in Cronjob
 * 
 * This pseudocode demonstrates how to automatically check for cloud-free images
 * before running index calculations and exporting .tif files for each parcel and sub-parcel.
 * 
 * The logic can be adapted to your backend (e.g., FastAPI + Google Earth Engine) and
 * scheduled with a cronjob or task scheduler.
 */

// Example (Python-like pseudocode for cronjob task):

import ee
from datetime import datetime, timedelta

def has_cloud_free_image(aoi, start_date, end_date, max_cloud_coverage):
    collection = (ee.ImageCollection('COPERNICUS/S2')
                  .filterBounds(aoi)
                  .filterDate(start_date, end_date)
                  .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', max_cloud_coverage)))
    count = collection.size().getInfo()
    return count > 0

def process_parcel(parcel, subparcel=None):
    aoi = parcel['geometry'] if not subparcel else subparcel['geometry']
    name = parcel['name'] if not subparcel else f"{parcel['name']}_{subparcel['name']}"
    start_date = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
    end_date = datetime.utcnow().strftime('%Y-%m-%d')
    max_cloud_coverage = 10  # or configurable

    if has_cloud_free_image(aoi, start_date, end_date, max_cloud_coverage):
        # Proceed with index calculation and export
        # Call your backend API or service here, e.g.:
        # calculate_and_export_indices(aoi, start_date, end_date, indices, ...)
        print(f"Processing {name}: cloud-free image found, running calculation.")
    else:
        # Log, notify, or skip
        print(f"Skipping {name}: no cloud-free images available for {start_date} to {end_date}.")

def run_daily_cronjob(parcels):
    for parcel in parcels:
        process_parcel(parcel)
        for subparcel in parcel.get('subparcels', []):
            process_parcel(parcel, subparcel)

# Example usage:
# parcels = fetch_all_parcels_from_db()
# run_daily_cronjob(parcels)

//
// - Integrate this logic into your scheduled task or backend service.
// - Ensure error handling and logging for production use.
// - Optionally, store the result (success/failure, cloud coverage, etc.) in your database for auditing.















