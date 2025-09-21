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
