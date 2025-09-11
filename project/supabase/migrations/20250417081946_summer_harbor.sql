/*
  # Add INSERT policy for soil analyses

  1. Changes
    - Add RLS policy to allow authenticated users to insert soil analyses for parcels they own
    
  2. Security
    - Users can only insert soil analyses for parcels that belong to their farms
    - Maintains existing read policy
*/

CREATE POLICY "Users can insert soil analyses for their parcels"
ON public.soil_analyses
FOR INSERT
TO authenticated
WITH CHECK (
  parcel_id IN (
    SELECT p.id
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);