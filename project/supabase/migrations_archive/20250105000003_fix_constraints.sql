-- Fix constraint conflicts by using conditional creation
-- This migration handles the case where constraints already exist in the database

-- Function to safely add primary key constraints
CREATE OR REPLACE FUNCTION add_primary_key_if_not_exists(
    p_table_name text,
    p_constraint_name text,
    p_column_name text
) RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.constraint_name = p_constraint_name
        AND tc.table_name = p_table_name
    ) THEN
        EXECUTE format('ALTER TABLE ONLY "public"."%s" ADD CONSTRAINT "%s" PRIMARY KEY ("%s")',
                      p_table_name, p_constraint_name, p_column_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely add foreign key constraints
CREATE OR REPLACE FUNCTION add_foreign_key_if_not_exists(
    p_table_name text,
    p_constraint_name text,
    p_column_name text,
    p_referenced_table text,
    p_referenced_column text
) RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.constraint_name = p_constraint_name
        AND tc.table_name = p_table_name
    ) THEN
        EXECUTE format('ALTER TABLE ONLY "public"."%s" ADD CONSTRAINT "%s" FOREIGN KEY ("%s") REFERENCES "public"."%s"("%s")',
                      p_table_name, p_constraint_name, p_column_name, p_referenced_table, p_referenced_column);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add primary key constraints safely
SELECT add_primary_key_if_not_exists('analysis_recommendations', 'analysis_recommendations_pkey', 'id');
SELECT add_primary_key_if_not_exists('audit_logs', 'audit_logs_pkey', 'id');
SELECT add_primary_key_if_not_exists('cloud_coverage_checks', 'cloud_coverage_checks_pkey', 'id');
SELECT add_primary_key_if_not_exists('cost_categories', 'cost_categories_pkey', 'id');
SELECT add_primary_key_if_not_exists('costs', 'costs_pkey', 'id');
SELECT add_primary_key_if_not_exists('crop_categories', 'crop_categories_pkey', 'id');
SELECT add_primary_key_if_not_exists('crop_types', 'crop_types_pkey', 'id');
SELECT add_primary_key_if_not_exists('crop_varieties', 'crop_varieties_pkey', 'id');

-- Clean up the helper functions
DROP FUNCTION IF EXISTS add_primary_key_if_not_exists(text, text, text);
DROP FUNCTION IF EXISTS add_foreign_key_if_not_exists(text, text, text, text, text);
