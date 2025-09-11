-- Create default farm if not exists
INSERT INTO farms (
  id,
  name,
  location,
  size
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'Ferme de démonstration',
  'Bni Yagrine, Maroc',
  2.5
) ON CONFLICT (id) DO NOTHING;

-- Disable RLS temporarily for demo purposes
ALTER TABLE farms DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE structures DISABLE ROW LEVEL SECURITY;
ALTER TABLE machinery DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history DISABLE ROW LEVEL SECURITY;