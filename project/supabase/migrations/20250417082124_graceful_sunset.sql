/*
  # Update soil analyses RLS policies

  1. Changes
    - Modify RLS policies for soil_analyses table to properly handle insert operations
    - Ensure policy checks follow the correct relationship chain:
      soil_analyses -> parcels -> crops -> farms -> user_id

  2. Security
    - Enable RLS (already enabled)
    - Update policies to properly check ownership through the relationship chain
    - Maintain existing read/update/delete policies
*/

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Enable insert access for users own parcels" ON soil_analyses;

-- Create new insert policy with correct ownership check
CREATE POLICY "Enable insert access for users own parcels" ON soil_analyses
FOR INSERT
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);