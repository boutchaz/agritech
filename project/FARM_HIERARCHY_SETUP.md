# Farm Hierarchy Management Setup Guide

## 🚀 Quick Start

To access and use the Farm Hierarchy Management system, follow these steps:

### 1. Apply Database Schema

First, you need to apply the enhanced database schema that supports farm hierarchy and management roles:

```bash
# Option 1: Using Supabase Dashboard (Recommended)
# 1. Go to your Supabase Dashboard
# 2. Navigate to SQL Editor
# 3. Copy and paste the entire contents of `supabase/schema_with_hierarchy.sql`
# 4. Click "Run"

# Option 2: Using Supabase CLI
cd project
supabase db push
```

### 2. Access Farm Hierarchy Management

Once the schema is applied, you can access the Farm Hierarchy Management in three ways:

#### Method 1: Sidebar Navigation
1. Look for **"Gestion des Fermes"** in the left sidebar (with a Network icon)
2. Click on it to open the Farm Hierarchy Management page

#### Method 2: Direct URL
Navigate directly to: `http://localhost:5173/farm-hierarchy`

#### Method 3: Dashboard Integration
The system will be integrated into your main dashboard for easy access.

### 3. Features Available

#### 🏗️ Farm Hierarchy Management
- **View Farm Structure**: See your organization's farm hierarchy as a tree
- **Create Main Farms**: Set up primary farm locations
- **Create Sub-Farms**: Add sub-farms under main farms
- **Visual Tree Navigation**: Expand/collapse farm branches
- **Farm Details**: View farm information, managers, and sub-farm counts

#### 👥 Role Management
- **Assign Roles**: Assign users to different management roles
- **Role Types**:
  - **Main Manager**: Full access to main farm + all sub-farms
  - **Sub Manager**: Limited to assigned sub-farms
  - **Supervisor**: Oversight and reporting access
  - **Coordinator**: Activity coordination access
- **Permission Management**: Granular control over user permissions

#### 📊 Visual Hierarchy
- **Tree View**: Interactive farm hierarchy visualization
- **Level Indicators**: Visual dots showing hierarchy depth
- **Role Badges**: Color-coded role indicators
- **Connection Lines**: Visual parent-child relationships

### 4. Usage Workflow

#### Creating Your First Farm Hierarchy:

1. **Access the System**: Click "Gestion des Fermes" in sidebar
2. **Create Main Farm**: Click "Add Farm" → Select "Main Farm"
3. **Fill Farm Details**: Enter name, location, size, description
4. **Create Sub-Farms**: Click "Add Farm" → Select "Sub Farm" → Choose parent
5. **Assign Managers**: Click "Manage Roles" on any farm
6. **Set Permissions**: Assign users to appropriate roles

#### Managing Existing Farms:

1. **View Hierarchy**: Use the tree view to navigate your farm structure
2. **Expand/Collapse**: Click arrows to show/hide sub-farms
3. **Edit Farms**: Click edit button on any farm
4. **Manage Roles**: Click "Manage Roles" to assign users
5. **Remove Access**: Remove users from roles as needed

### 5. Integration with Existing Features

The Farm Hierarchy system integrates with your existing features:

- **Onboarding**: Updated to support main/sub farm creation
- **Authentication**: Uses existing user authentication
- **Organization Management**: Respects organization boundaries
- **Role-Based Access**: Integrates with existing permission system

### 6. Troubleshooting

#### If you can't see the "Gestion des Fermes" link:
1. Check that the database schema was applied successfully
2. Refresh your browser
3. Make sure you're logged in and have an organization selected

#### If the page shows errors:
1. Check browser console for error messages
2. Verify database functions exist (run the test script)
3. Ensure you have proper permissions in your organization

#### If farms don't load:
1. Run the debug script: `debug_functions.sql`
2. Check that your organization has farms created
3. Verify RLS policies are working correctly

### 7. Advanced Configuration

#### Custom Roles:
You can create custom roles by modifying the `farm_permissions` table:

```sql
INSERT INTO public.farm_permissions (role, permissions, description) VALUES
('custom_role', '{"manage_crops": true, "view_reports": true}', 'Custom role description');
```

#### Hierarchy Depth:
The system supports unlimited hierarchy depth. You can create:
- Main Farm → Sub Farm → Section → Sub-Section → etc.

#### Bulk Operations:
For large organizations, you can use the SQL functions directly:

```sql
-- Create multiple sub-farms
SELECT create_sub_farm('parent-farm-id', 'Sub Farm Name', 'Location', 10.5, 'hectares');

-- Assign multiple roles
SELECT assign_farm_role('farm-id', 'user-id', 'sub_manager');
```

## 🎯 Next Steps

1. **Apply the Schema**: Run the database migration
2. **Test the System**: Create a test farm hierarchy
3. **Assign Roles**: Set up your team with appropriate permissions
4. **Integrate**: Connect with your existing farm management workflows

The Farm Hierarchy Management system is now ready to help you organize and manage your agricultural operations with proper role-based access control! 🌾
