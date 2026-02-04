-- Add images column to product_applications
ALTER TABLE product_applications
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN product_applications.images IS 'Array of image URLs for the product application';
