# Complete AgriTech Database Setup

This is a single, comprehensive SQL script that consolidates all your previous SQL files into one organized setup.

## 🚀 Quick Setup

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste the entire contents of `schemas/00_complete_setup.sql`**
4. **Click "Run"**

### Option 2: Command Line

```bash
# Run the setup script
node setup-database.js
```

## 📋 What This Setup Includes

### ✅ **Core Tables**
- `user_profiles` - User account information
- `organizations` - Farm organizations/companies
- `organization_users` - Many-to-many relationship
- `farms` - Individual farms
- `parcels` - Land parcels within farms
- `crops` - Master data for crop types
- `test_types` - Types of soil analysis
- `soil_analyses` - Soil analysis results
- `structures` - Farm infrastructure
- `inventory` - Stock management
- `activities` - Farm activity tracking

### ✅ **Functions**
- `get_user_organizations()` - Get user's organizations
- `get_organization_farms()` - Get organization's farms
- `get_farm_parcels()` - Get farm's parcels
- `get_current_user_profile()` - Get current user profile
- `create_organization_with_owner()` - Create org with owner
- `get_organization_stats()` - Get organization statistics

### ✅ **Triggers**
- Auto-create user profiles on signup
- Auto-update `updated_at` timestamps
- Handle new user registration

### ✅ **Indexes**
- Performance indexes on all key columns
- Foreign key indexes
- Search indexes

### ✅ **Permissions**
- Proper RLS policies
- Role-based access control
- API permissions for anon/authenticated users

### ✅ **Sample Data**
- Default test types
- Sample crops
- Demo organization and farm
- Sample parcels and soil analyses
- Sample infrastructure structures

## 🔧 Features

- **Idempotent**: Can be run multiple times safely
- **Comprehensive**: Includes everything from your previous SQL files
- **Organized**: Clean, well-commented code
- **Production Ready**: Includes proper permissions and RLS
- **Sample Data**: Ready to test immediately

## 📊 After Setup

You'll have:
- ✅ Complete database schema
- ✅ All necessary functions
- ✅ Proper permissions
- ✅ Sample data for testing
- ✅ Ready-to-use AgriTech platform

## 🎯 Next Steps

1. **Run the setup script**
2. **Test the soil analysis functionality**
3. **Test the infrastructure management**
4. **Start building your features!**

---

**Note**: This consolidates all your previous SQL files (`complete-setup.sql`, `fix-soil-analyses.sql`, `ensure-farms-table.sql`, etc.) into one organized setup.
