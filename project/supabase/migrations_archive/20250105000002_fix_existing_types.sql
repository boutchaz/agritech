-- Fix migration conflicts by using IF NOT EXISTS for existing types
-- This migration handles the case where types already exist in the database

-- Create analysis_type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_type') THEN
        CREATE TYPE "public"."analysis_type" AS ENUM (
            'soil',
            'plant',
            'water'
        );
    END IF;
END $$;

-- Create calculation_basis if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calculation_basis') THEN
        CREATE TYPE "public"."calculation_basis" AS ENUM (
            'gross_revenue',
            'net_revenue'
        );
    END IF;
END $$;

-- Create metayage_type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metayage_type') THEN
        CREATE TYPE "public"."metayage_type" AS ENUM (
            'khammass',
            'rebaa',
            'tholth',
            'custom'
        );
    END IF;
END $$;

-- Create payment_frequency if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_frequency') THEN
        CREATE TYPE "public"."payment_frequency" AS ENUM (
            'monthly',
            'daily',
            'per_task',
            'harvest_share'
        );
    END IF;
END $$;

-- Create worker_type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_type') THEN
        CREATE TYPE "public"."worker_type" AS ENUM (
            'fixed_salary',
            'daily_worker',
            'metayage'
        );
    END IF;
END $$;

-- Add comment for clarity
COMMENT ON TYPE "public"."analysis_type" IS 'Type of analysis: soil, plant, or water';
COMMENT ON TYPE "public"."calculation_basis" IS 'Basis for metayage calculations: gross or net revenue';
COMMENT ON TYPE "public"."metayage_type" IS 'Type of metayage arrangement';
COMMENT ON TYPE "public"."payment_frequency" IS 'How often workers are paid';
COMMENT ON TYPE "public"."worker_type" IS 'Type of worker employment';
