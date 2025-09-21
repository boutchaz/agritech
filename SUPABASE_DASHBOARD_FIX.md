# Fix Soil Analysis Error - Supabase Dashboard

## Problem
The soil analysis page shows "Error fetching soil analyses" because the required tables are missing from the database.

## Solution
Go to your Supabase Dashboard → SQL Editor and run this SQL:

```sql
-- Step 1: Create parcels table
CREATE TABLE IF NOT EXISTS public.parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    area DECIMAL(10,2),
    area_unit TEXT DEFAULT 'hectares',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create soil_analyses table
CREATE TABLE IF NOT EXISTS public.soil_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID,
    test_type_id UUID,
    analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    physical JSONB,
    chemical JSONB,
    biological JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add foreign key constraint
ALTER TABLE public.soil_analyses 
ADD CONSTRAINT soil_analyses_parcel_id_fkey 
FOREIGN KEY (parcel_id) REFERENCES public.parcels(id) ON DELETE CASCADE;

-- Step 4: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcels TO authenticated, service_role;
GRANT SELECT ON public.parcels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_analyses TO authenticated, service_role;
GRANT SELECT ON public.soil_analyses TO anon;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_parcels_farm_id ON public.parcels(farm_id);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_parcel_id ON public.soil_analyses(parcel_id);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_analysis_date ON public.soil_analyses(analysis_date);

-- Step 6: Insert sample data (optional)
INSERT INTO public.parcels (id, farm_id, name, description, area, area_unit) 
VALUES 
    ('123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174000', 'Parcel 1', 'Main field', 5.5, 'hectares'),
    ('223e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174000', 'Parcel 2', 'Secondary field', 3.2, 'hectares')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.soil_analyses (parcel_id, physical, chemical, biological, notes) 
VALUES 
    ('123e4567-e89b-12d3-a456-426614174000', 
     '{"ph": 6.5, "texture": "loam", "moisture": 45}', 
     '{"nitrogen": 25, "phosphorus": 15, "potassium": 200}', 
     '{"microbial_activity": "high", "earthworm_count": 12}', 
     'Initial soil analysis'),
    ('223e4567-e89b-12d3-a456-426614174000', 
     '{"ph": 7.0, "texture": "clay", "moisture": 50}', 
     '{"nitrogen": 30, "phosphorus": 20, "potassium": 180}', 
     '{"microbial_activity": "medium", "earthworm_count": 8}', 
     'Secondary field analysis')
ON CONFLICT DO NOTHING;
```

## How to Access Supabase Dashboard

1. **Go to**: `http://agritech-supabase-652186-5-75-154-125.traefik.me`
2. **Login** with your credentials
3. **Navigate to**: SQL Editor (in the left sidebar)
4. **Paste the SQL above** and click "Run"

## After Running the SQL

1. **Refresh your application** at `http://agritech-dashboard-g6sumg-2b12b9-5-75-154-125.traefik.me:3002/soil-analysis`
2. **The error should be resolved** and you should see the soil analysis page working

## Verification

After running the SQL, you can verify the tables were created by running:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parcels', 'soil_analyses')
ORDER BY table_name;

-- Check data
SELECT COUNT(*) as parcel_count FROM public.parcels;
SELECT COUNT(*) as soil_analysis_count FROM public.soil_analyses;
```

This will completely fix the "Error fetching soil analyses" issue!
