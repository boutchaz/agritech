-- =====================================================
-- SIMPLE DATABASE DIAGNOSIS
-- =====================================================
-- Run this to check what's in your database

-- Check if we can connect and see tables
SELECT 'Database connection working' as status;

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if parcels table exists and has data
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcels') 
        THEN (SELECT COUNT(*)::text || ' rows in parcels table' FROM parcels)
        ELSE 'parcels table does not exist'
    END as parcels_info;

-- Check if soil_analyses table exists and has data
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soil_analyses') 
        THEN (SELECT COUNT(*)::text || ' rows in soil_analyses table' FROM soil_analyses)
        ELSE 'soil_analyses table does not exist'
    END as soil_analyses_info;
