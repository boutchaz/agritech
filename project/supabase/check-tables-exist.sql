-- =====================================================
-- CHECK WHAT TABLES EXIST
-- =====================================================
-- Run this first to see what tables are available

-- Check if parcels table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcels' AND table_schema = 'public') 
        THEN 'parcels table EXISTS' 
        ELSE 'parcels table DOES NOT EXIST' 
    END as parcels_status;

-- Check if soil_analyses table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soil_analyses' AND table_schema = 'public') 
        THEN 'soil_analyses table EXISTS' 
        ELSE 'soil_analyses table DOES NOT EXIST' 
    END as soil_analyses_status;

-- List all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
