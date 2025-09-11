/*
  # Update Day Laborers Schema for Multiple Payment Types

  1. Changes
    - Add payment_type column to day_laborers table
    - Add task_rate and unit_rate columns
    - Update work_records table to handle different payment types
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to day_laborers table
ALTER TABLE day_laborers
ADD COLUMN payment_type text NOT NULL DEFAULT 'daily' CHECK (payment_type IN ('daily', 'task', 'unit')),
ADD COLUMN task_rate numeric,
ADD COLUMN unit_rate numeric,
ADD COLUMN unit_type text;

-- Update work_records table
ALTER TABLE work_records
ADD COLUMN units_completed numeric,
ADD COLUMN task_completed boolean DEFAULT false,
ADD COLUMN payment_type text NOT NULL DEFAULT 'daily' CHECK (payment_type IN ('daily', 'task', 'unit')),
ADD COLUMN payment_amount numeric;