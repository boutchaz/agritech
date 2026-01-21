-- Add tif_image_url column to parcels table
-- Migration: 2025-01-21 - Add TIF/Drone image support

-- Add tif_image_url column if it doesn't exist
ALTER TABLE parcels
ADD COLUMN IF NOT EXISTS tif_image_url TEXT;

-- Add tif_image_uploaded_at column to track when image was uploaded
ALTER TABLE parcels
ADD COLUMN IF NOT EXISTS tif_image_uploaded_at TIMESTAMPTZ;

-- Add tif_image_metadata column to store additional image info (bounds, resolution, etc.)
ALTER TABLE parcels
ADD COLUMN IF NOT EXISTS tif_image_metadata JSONB;

-- Add comments for documentation
COMMENT ON COLUMN parcels.tif_image_url IS 'URL to the TIF/GeoTIFF drone image for this parcel';
COMMENT ON COLUMN parcels.tif_image_uploaded_at IS 'Timestamp when the TIF image was uploaded';
COMMENT ON COLUMN parcels.tif_image_metadata IS 'Metadata about the TIF image (bounds, resolution, drone info, etc.)';
