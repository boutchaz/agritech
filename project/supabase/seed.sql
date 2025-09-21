-- Seed data for development
-- This file contains sample data for testing and development

-- Insert sample parcel data if it doesn't exist
INSERT INTO public.parcels (id, farm_id, name, description, area, area_unit) VALUES
    ('123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174000', 'Parcel 1', 'Main field', 5.5, 'hectares'),
    ('123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174000', 'Parcel 2', 'Secondary field', 3.2, 'hectares')
ON CONFLICT (id) DO NOTHING;

-- Insert sample soil analysis data
INSERT INTO public.soil_analyses (parcel_id, test_type_id, physical, chemical, biological, notes) VALUES
    ('123e4567-e89b-12d3-a456-426614174000',
     '123e4567-e89b-12d3-a456-426614174002',
     '{"ph": 6.5, "texture": "loam", "moisture": 45}',
     '{"nitrogen": 25, "phosphorus": 15, "potassium": 200}',
     '{"earthworm_count": 12, "microbial_activity": "high"}',
     'Initial soil analysis'),
    ('123e4567-e89b-12d3-a456-426614174001',
     '123e4567-e89b-12d3-a456-426614174002',
     '{"ph": 7.2, "texture": "clay", "moisture": 38}',
     '{"nitrogen": 18, "phosphorus": 22, "potassium": 180}',
     '{"earthworm_count": 8, "microbial_activity": "medium"}',
     'Secondary field analysis')
ON CONFLICT DO NOTHING;
