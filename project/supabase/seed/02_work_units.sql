-- Seed multilingual work units per organization
-- Inserts are idempotent via ON CONFLICT (organization_id, code)

INSERT INTO public.work_units (
  organization_id,
  code,
  name,
  name_fr,
  name_ar,
  unit_category,
  base_unit,
  conversion_factor,
  allow_decimal,
  is_active
)
SELECT
  o.id,
  v.code,
  v.name,
  v.name_fr,
  v.name_ar,
  v.unit_category,
  v.base_unit,
  v.conversion_factor,
  v.allow_decimal,
  true
FROM public.organizations o
CROSS JOIN (
  VALUES
    -- Count
    ('PCS', 'Piece', 'Pièce', 'قطعة', 'count', NULL, NULL, false),
    -- Weight
    ('G',   'Gram', 'Gramme', 'غرام', 'weight', NULL, NULL, true),
    ('KG',  'Kilogram', 'Kilogramme', 'كيلوغرام', 'weight', 'g', 1000, true),
    ('TON', 'Ton', 'Tonne', 'طن', 'weight', 'kg', 1000, true),
    -- Volume
    ('ML',  'Milliliter', 'Millilitre', 'ميليلتر', 'volume', NULL, NULL, true),
    ('L',   'Liter', 'Litre', 'لتر', 'volume', 'ml', 1000, true),
    -- Length
    ('CM',  'Centimeter', 'Centimètre', 'سنتيمتر', 'length', NULL, NULL, true),
    ('M',   'Meter', 'Mètre', 'متر', 'length', 'cm', 100, true),
    ('KM',  'Kilometer', 'Kilomètre', 'كيلومتر', 'length', 'm', 1000, true),
    -- Area
    ('M2',  'Square Meter', 'Mètre carré', 'متر مربع', 'area', NULL, NULL, true),
    ('HA',  'Hectare', 'Hectare', 'هكتار', 'area', 'm2', 10000, true)
) AS v(
  code,
  name,
  name_fr,
  name_ar,
  unit_category,
  base_unit,
  conversion_factor,
  allow_decimal
)
ON CONFLICT (organization_id, code) DO NOTHING;


